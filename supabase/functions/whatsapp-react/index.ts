/**
 * 🎉 WHATSAPP REACT - Edge Function
 *
 * Envia reaction (emoji) a uma mensagem específica. Meta API supports
 * 1 emoji por mensagem por sender. Enviar emoji vazio remove a reação.
 *
 * Body:
 *  - to: telefone E.164 sem +
 *  - messageId: provider_message_id da mensagem alvo
 *  - emoji: emoji unicode (ex: "👍") ou string vazia pra remover
 *  - conversationId?: pra persistir
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface ReactRequest {
  to: string;
  messageId: string;
  emoji: string;
  conversationId?: string;
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
    const rl = await applyRateLimit(req, { maxRequests: 60, windowSeconds: 60, namespace: "wa-react" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as ReactRequest;
    if (!body.to || !body.messageId || body.emoji === undefined) throw new Error("Campos to, messageId, emoji obrigatórios");
    const cleanPhone = body.to.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) throw new Error("Número de telefone inválido");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const gate = await checkTrialAccess(supabase, tenantId, "send_whatsapp");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) throw new Error("WhatsApp não conectado");

    const res = await kapsoFetchWithKey(
      kapso.apiKey,
      `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "reaction",
          reaction: { message_id: body.messageId, emoji: body.emoji },
        }),
      },
      kapso.apiUrl,
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[wa-react] HTTP ${res.status}:`, errBody.slice(0, 300));
      return new Response(JSON.stringify({ success: false, error: "Falha ao reagir", upstream_status: res.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    if (body.conversationId) {
      void supabase.from("whatsapp_messages").insert({
        conversation_id: body.conversationId,
        sender: "agent", direction: "outbound",
        content: body.emoji ? `[reação] ${body.emoji}` : `[reação removida]`,
        message_type: "reaction",
        timestamp: new Date().toISOString(),
        read: true, send_status: "sent",
        tenant_id: tenantId,
        metadata: { reaction: { target_message_id: body.messageId, emoji: body.emoji } },
      });
    }

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[whatsapp-react] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatórios") || msg.includes("inválido") ? 400
                 : msg.includes("não conectado") ? 422 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
