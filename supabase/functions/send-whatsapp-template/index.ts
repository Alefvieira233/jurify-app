/**
 * 📨 SEND WHATSAPP TEMPLATE - Edge Function
 *
 * Envia um template aprovado pela Meta (necessário fora da janela 24h).
 * Permite reabrir conversas e iniciar contato após inatividade.
 *
 * Body:
 *  - to: telefone E.164 (sem +)
 *  - templateName: nome do template aprovado
 *  - language: pt_BR | en_US (default pt_BR)
 *  - parameters: array de strings que substituem {{1}}, {{2}}, …
 *  - headerParameters?: array — parâmetros do header (text/image/document)
 *  - buttonParameters?: array — parâmetros de botões dinâmicos
 *  - conversationId?: id da conversation pra registrar a mensagem
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface SendTemplateRequest {
  to: string;
  templateName: string;
  language?: string;
  parameters?: string[];
  headerParameters?: Array<{ type: 'text' | 'image' | 'document' | 'video'; value: string }>;
  buttonParameters?: Array<{ index: number; type: 'url' | 'quick_reply'; value: string }>;
  conversationId?: string;
}

function buildComponents(req: SendTemplateRequest): unknown[] {
  const components: Array<Record<string, unknown>> = [];

  if (req.headerParameters && req.headerParameters.length > 0) {
    components.push({
      type: 'header',
      parameters: req.headerParameters.map(p => {
        if (p.type === 'text') return { type: 'text', text: p.value };
        if (p.type === 'image') return { type: 'image', image: { link: p.value } };
        if (p.type === 'document') return { type: 'document', document: { link: p.value } };
        if (p.type === 'video') return { type: 'video', video: { link: p.value } };
        return { type: p.type, [p.type]: { link: p.value } };
      }),
    });
  }

  if (req.parameters && req.parameters.length > 0) {
    components.push({
      type: 'body',
      parameters: req.parameters.map(text => ({ type: 'text', text })),
    });
  }

  if (req.buttonParameters && req.buttonParameters.length > 0) {
    for (const bp of req.buttonParameters) {
      components.push({
        type: 'button',
        sub_type: bp.type === 'url' ? 'url' : 'quick_reply',
        index: String(bp.index),
        parameters: [{ type: bp.type === 'url' ? 'text' : 'payload', text: bp.value, payload: bp.value }],
      });
    }
  }

  return components;
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

    const rl = await applyRateLimit(req, { maxRequests: 30, windowSeconds: 60, namespace: "send-whatsapp-template" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as SendTemplateRequest;
    if (!body.to || !body.templateName) throw new Error("Campos 'to' e 'templateName' são obrigatórios");
    const cleanPhone = body.to.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) throw new Error("Número de telefone inválido");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    // Trial gate (templates seguem mesma regra de send_whatsapp)
    const gate = await checkTrialAccess(supabase, tenantId, "send_whatsapp");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    // Validar que o template existe e está APPROVED
    const { data: tpl } = await supabase
      .from("whatsapp_meta_templates")
      .select("name, language, status")
      .eq("tenant_id", tenantId)
      .eq("name", body.templateName)
      .eq("language", body.language || "pt_BR")
      .maybeSingle();

    if (!tpl) {
      return new Response(JSON.stringify({
        success: false,
        error: `Template "${body.templateName}" (${body.language || "pt_BR"}) não encontrado. Sincronize templates ou crie no Meta Business Manager.`,
        code: "template_not_found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });
    }

    if ((tpl as { status: string }).status !== "APPROVED") {
      return new Response(JSON.stringify({
        success: false,
        error: `Template "${body.templateName}" está com status ${(tpl as { status: string }).status}. Use apenas templates APPROVED.`,
        code: "template_not_approved",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 });
    }

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso) throw new Error("WhatsApp não configurado. Conecte primeiro em /conexoes.");
    if (!kapso.phoneNumberId) throw new Error("Número WhatsApp não conectado");

    // Send template via Meta-compatible Kapso endpoint
    const components = buildComponents(body);
    const payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: body.templateName,
        language: { code: body.language || "pt_BR" },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const response = await kapsoFetchWithKey(
      kapso.apiKey,
      `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
      { method: "POST", body: JSON.stringify(payload) },
      kapso.apiUrl,
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[send-template] HTTP ${response.status}:`, errBody.slice(0, 500));
      return new Response(JSON.stringify({
        success: false,
        error: "Falha ao enviar template. Verifique parâmetros e status do template.",
        code: "send_failed",
        upstream_status: response.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    const respData = await response.json();
    const messageId = respData?.messages?.[0]?.id ?? null;

    // Persist message in DB if conversationId provided
    if (body.conversationId) {
      void supabase.from("whatsapp_messages").insert({
        conversation_id: body.conversationId,
        sender: "agent",
        direction: "outbound",
        content: `[template:${body.templateName}] ${(body.parameters || []).join(" | ")}`,
        message_type: "template",
        timestamp: new Date().toISOString(),
        read: true,
        send_status: "sent",
        provider_message_id: messageId,
        tenant_id: tenantId,
        metadata: { template: body.templateName, language: body.language || "pt_BR", components },
      });
      void supabase.from("whatsapp_conversations").update({
        last_message: `[Template] ${body.templateName}`,
        last_message_at: new Date().toISOString(),
      }).eq("id", body.conversationId);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId,
      template: body.templateName,
      language: body.language || "pt_BR",
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[send-whatsapp-template] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatórios") || msg.includes("inválido") ? 400
                 : msg.includes("não configurado") || msg.includes("não conectado") || msg.includes("não encontrado") ? 422
                 : 500;
    return new Response(JSON.stringify({ success: false, error: msg, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
