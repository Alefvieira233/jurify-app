/**
 * 🔘 SEND WHATSAPP INTERACTIVE - Edge Function
 *
 * Envia mensagem interactive com 1-3 reply buttons (quick replies).
 * Webhook já recebe button_reply nas inbound — esta função fecha o ciclo.
 *
 * Body:
 *  - to: telefone E.164 (sem +)
 *  - body: texto principal (max 1024)
 *  - buttons: array 1-3 botões { id, title }  (title max 20)
 *  - header?: { type: 'text', text: string }  (max 60)
 *  - footer?: string (max 60)
 *  - conversationId?: id da conversation para persistência
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";
import { checkWindowByConversation, checkWindowByPhone, windowClosedResponse } from "../_shared/whatsapp-window.ts";

interface InteractiveRequest {
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
  header?: { type: 'text'; text: string };
  footer?: string;
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

    const rl = await applyRateLimit(req, { maxRequests: 30, windowSeconds: 60, namespace: "send-whatsapp-interactive" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as InteractiveRequest;
    if (!body.to || !body.body || !body.buttons?.length) throw new Error("Campos 'to', 'body' e 'buttons' são obrigatórios");
    if (body.buttons.length > 3) throw new Error("Máximo 3 botões");
    if (body.body.length > 1024) throw new Error("Body limite 1024 caracteres");
    for (const btn of body.buttons) {
      if (!btn.id || !btn.title) throw new Error("Cada botão precisa de id e title");
      if (btn.title.length > 20) throw new Error("Título do botão max 20 caracteres");
    }

    const cleanPhone = body.to.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) throw new Error("Número de telefone inválido");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const gate = await checkTrialAccess(supabase, tenantId, "send_whatsapp");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    // Interactive segue regra 24h window igual a texto
    const window = body.conversationId
      ? await checkWindowByConversation(supabase, body.conversationId)
      : await checkWindowByPhone(supabase, tenantId, body.to);
    if (!window.is_open) return windowClosedResponse(window, corsHeaders);

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso) throw new Error("WhatsApp não configurado");
    if (!kapso.phoneNumberId) throw new Error("Número WhatsApp não conectado");

    const interactivePayload: Record<string, unknown> = {
      type: 'button',
      body: { text: body.body },
      action: {
        buttons: body.buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    };
    if (body.header) interactivePayload.header = body.header;
    if (body.footer) interactivePayload.footer = { text: body.footer };

    const response = await kapsoFetchWithKey(
      kapso.apiKey,
      `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "interactive",
          interactive: interactivePayload,
        }),
      },
      kapso.apiUrl,
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[send-interactive] HTTP ${response.status}:`, errBody.slice(0, 500));
      return new Response(JSON.stringify({
        success: false,
        error: "Falha ao enviar mensagem interativa.",
        upstream_status: response.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    const data = await response.json();
    const messageId = data?.messages?.[0]?.id ?? null;

    if (body.conversationId) {
      void supabase.from("whatsapp_messages").insert({
        conversation_id: body.conversationId,
        sender: "agent",
        direction: "outbound",
        content: `${body.body}\n\n[Botões: ${body.buttons.map(b => b.title).join(" | ")}]`,
        message_type: "interactive",
        timestamp: new Date().toISOString(),
        read: true,
        send_status: "sent",
        provider_message_id: messageId,
        tenant_id: tenantId,
        metadata: { interactive: interactivePayload },
      });
      void supabase.from("whatsapp_conversations").update({
        last_message: body.body.slice(0, 500),
        last_message_at: new Date().toISOString(),
      }).eq("id", body.conversationId);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[send-whatsapp-interactive] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatórios") || msg.includes("inválido") || msg.includes("Máximo") || msg.includes("limite") ? 400
                 : msg.includes("não configurado") || msg.includes("não conectado") ? 422
                 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
