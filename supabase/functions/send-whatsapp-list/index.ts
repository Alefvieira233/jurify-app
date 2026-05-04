/**
 * 📋 SEND WHATSAPP LIST - Edge Function
 *
 * Envia mensagem interactive type=list. Permite até 10 itens em até 10
 * sections (total 30+ items). Ideal pra menus complexos:
 *   "Selecione área:
 *    [Direitos Humanos]
 *    [Trabalhista]
 *    [Cível]
 *    ..."
 *
 * Body:
 *  - to: telefone
 *  - body: texto principal
 *  - buttonText: texto do botão "Ver opções" (max 20)
 *  - sections: [{ title, rows: [{ id, title, description }] }]
 *  - header?, footer?
 *  - conversationId?
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";
import { checkWindowByConversation, checkWindowByPhone, windowClosedResponse } from "../_shared/whatsapp-window.ts";

interface ListRequest {
  to: string;
  body: string;
  buttonText: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  header?: string;
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
    const rl = await applyRateLimit(req, { maxRequests: 30, windowSeconds: 60, namespace: "send-whatsapp-list" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as ListRequest;
    if (!body.to || !body.body || !body.buttonText || !body.sections?.length) throw new Error("Campos to, body, buttonText, sections obrigatórios");
    if (body.buttonText.length > 20) throw new Error("buttonText limite 20 caracteres");
    if (body.body.length > 1024) throw new Error("body limite 1024 caracteres");
    if (body.sections.length > 10) throw new Error("Máximo 10 sections");
    let totalRows = 0;
    for (const s of body.sections) {
      if (!s.rows?.length) throw new Error("Cada section precisa de rows");
      for (const r of s.rows) {
        if (!r.id || !r.title) throw new Error("Cada row precisa de id e title");
        if (r.title.length > 24) throw new Error("Título de row max 24 caracteres");
        if (r.description && r.description.length > 72) throw new Error("Descrição de row max 72 caracteres");
        totalRows++;
      }
    }
    if (totalRows > 10) throw new Error("Máximo 10 rows no total");

    const cleanPhone = body.to.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) throw new Error("Número de telefone inválido");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const gate = await checkTrialAccess(supabase, tenantId, "send_whatsapp");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    const window = body.conversationId
      ? await checkWindowByConversation(supabase, body.conversationId)
      : await checkWindowByPhone(supabase, tenantId, body.to);
    if (!window.is_open) return windowClosedResponse(window, corsHeaders);

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) throw new Error("WhatsApp não conectado");

    const interactivePayload: Record<string, unknown> = {
      type: "list",
      body: { text: body.body },
      action: {
        button: body.buttonText,
        sections: body.sections.map(s => ({
          ...(s.title ? { title: s.title.slice(0, 24) } : {}),
          rows: s.rows.map(r => ({
            id: r.id,
            title: r.title,
            ...(r.description ? { description: r.description } : {}),
          })),
        })),
      },
    };
    if (body.header) interactivePayload.header = { type: "text", text: body.header };
    if (body.footer) interactivePayload.footer = { text: body.footer };

    const res = await kapsoFetchWithKey(
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

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[send-list] HTTP ${res.status}:`, errBody.slice(0, 500));
      return new Response(JSON.stringify({ success: false, error: "Falha ao enviar lista", upstream_status: res.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    const data = await res.json();
    const messageId = data?.messages?.[0]?.id ?? null;

    if (body.conversationId) {
      void supabase.from("whatsapp_messages").insert({
        conversation_id: body.conversationId,
        sender: "agent", direction: "outbound",
        content: `${body.body}\n\n[Lista: ${body.sections.flatMap(s => s.rows.map(r => r.title)).join(" | ")}]`,
        message_type: "interactive_list",
        timestamp: new Date().toISOString(),
        read: true, send_status: "sent",
        provider_message_id: messageId,
        tenant_id: tenantId,
        metadata: { interactive: interactivePayload },
      });
      void supabase.from("whatsapp_conversations").update({
        last_message: body.body.slice(0, 500),
        last_message_at: new Date().toISOString(),
      }).eq("id", body.conversationId);
    }

    return new Response(JSON.stringify({ success: true, messageId, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[send-whatsapp-list] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatórios") || msg.includes("Máximo") || msg.includes("limite") || msg.includes("inválido") || msg.includes("max") ? 400
                 : msg.includes("não conectado") ? 422 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
