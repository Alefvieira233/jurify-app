/**
 * 🔁 WHATSAPP FORWARD - Edge Function
 *
 * Encaminha uma mensagem (texto/mídia) para uma ou mais conversas.
 * Aplica trial gate, 24h window check por destino e attribution opcional.
 *
 * Body:
 *  - messageId: uuid da mensagem origem em whatsapp_messages
 *  - toConversationIds: array de uuid de conversas destino (max 5)
 *  - includeAttribution: bool — prepend "[Encaminhada] " no texto
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";
import { checkWindowByConversation } from "../_shared/whatsapp-window.ts";

interface Request {
  messageId: string;
  toConversationIds: string[];
  includeAttribution?: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const rl = await applyRateLimit(req, { maxRequests: 20, windowSeconds: 60, namespace: "wa-forward" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as Request;
    if (!body.messageId) throw new Error("messageId obrigatório");
    if (!Array.isArray(body.toConversationIds) || body.toConversationIds.length === 0) throw new Error("toConversationIds obrigatório");
    if (body.toConversationIds.length > 5) throw new Error("Máximo 5 destinos por vez");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const gate = await checkTrialAccess(supabase, tenantId, "send_whatsapp");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    // Carrega mensagem origem
    const { data: srcMsg } = await supabase
      .from("whatsapp_messages")
      .select("id, content, message_type, media_url, tenant_id")
      .eq("id", body.messageId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!srcMsg) throw new Error("Mensagem não encontrada");

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) throw new Error("WhatsApp não conectado");

    const results: Array<{ conversationId: string; success: boolean; error?: string; messageId?: string }> = [];
    const sourceContent = (srcMsg as { content: string | null }).content || "";
    const sourceType = (srcMsg as { message_type: string | null }).message_type || "text";
    const sourceMediaUrl = (srcMsg as { media_url: string | null }).media_url;
    const prefix = body.includeAttribution !== false ? "📤 *Encaminhada*\n\n" : "";
    const text = prefix + sourceContent;

    for (const convId of body.toConversationIds) {
      try {
        // Window check por destino
        const win = await checkWindowByConversation(supabase, convId);
        if (!win.is_open) {
          results.push({ conversationId: convId, success: false, error: "window_closed" });
          continue;
        }

        // Pega phone number da conv destino
        const { data: destConv } = await supabase
          .from("whatsapp_conversations")
          .select("phone_number, tenant_id")
          .eq("id", convId)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (!destConv) {
          results.push({ conversationId: convId, success: false, error: "conversation_not_found" });
          continue;
        }
        const phone = ((destConv as { phone_number: string }).phone_number || "").replace(/\D/g, "");
        if (!phone) {
          results.push({ conversationId: convId, success: false, error: "invalid_phone" });
          continue;
        }

        // Envia
        const isMedia = sourceType !== "text" && sourceMediaUrl;
        const payload: Record<string, unknown> = isMedia
          ? {
              messaging_product: "whatsapp",
              to: phone,
              type: sourceType,
              [sourceType]: { link: sourceMediaUrl, caption: sourceContent || undefined },
            }
          : {
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: text },
            };

        const res = await kapsoFetchWithKey(
          kapso.apiKey,
          `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
          { method: "POST", body: JSON.stringify(payload) },
          kapso.apiUrl,
        );

        if (!res.ok) {
          const errTxt = await res.text();
          console.error(`[forward] HTTP ${res.status} for conv ${convId}:`, errTxt.slice(0, 200));
          results.push({ conversationId: convId, success: false, error: `http_${res.status}` });
          continue;
        }

        const data = await res.json().catch(() => ({}));
        const msgId = data?.messages?.[0]?.id ?? null;

        // Persiste no DB
        await supabase.from("whatsapp_messages").insert({
          conversation_id: convId,
          tenant_id: tenantId,
          sender: "agent",
          direction: "outbound",
          content: text,
          message_type: sourceType,
          media_url: sourceMediaUrl,
          timestamp: new Date().toISOString(),
          read: true,
          send_status: "sent",
          provider_message_id: msgId,
          metadata: { forwarded_from: body.messageId },
        });

        await supabase.from("whatsapp_conversations").update({
          last_message: text.slice(0, 500),
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);

        results.push({ conversationId: convId, success: true, messageId: msgId });
      } catch (err) {
        console.error(`[forward] error for conv ${convId}:`, err);
        results.push({ conversationId: convId, success: false, error: err instanceof Error ? err.message : "unknown" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return new Response(JSON.stringify({
      success: successCount > 0,
      total: results.length,
      sent: successCount,
      failed: results.length - successCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[whatsapp-forward] error:", err);
    const msg = err instanceof Error ? err.message : "Erro";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("obrigatório") || msg.includes("Máximo") ? 400 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
