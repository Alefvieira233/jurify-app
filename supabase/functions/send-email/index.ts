/**
 * send-email — Edge Function (Postmark)
 *
 * Centralized email sending via Postmark.
 * Supports: welcome, reset-password, billing-confirmation, agent-alert
 *
 * Required Supabase Secrets:
 *   POSTMARK_SERVER_TOKEN=your-postmark-server-token
 *   POSTMARK_FROM_EMAIL=noreply@jurify.com.br
 *   POSTMARK_FROM_NAME=Jurify
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const POSTMARK_API = "https://api.postmarkapp.com/email";

const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
const FROM_EMAIL = Deno.env.get("POSTMARK_FROM_EMAIL") ?? "noreply@jurify.com.br";
const FROM_NAME = Deno.env.get("POSTMARK_FROM_NAME") ?? "Jurify";

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

type EmailTemplate =
  | "welcome"
  | "reset-password"
  | "billing-confirmation"
  | "subscription-cancelled"
  | "agent-alert";

interface TemplateData {
  name?: string;
  reset_url?: string;
  plan_name?: string;
  amount?: string;
  period?: string;
  invoice_url?: string;
  alert_message?: string;
  tenant_id?: string;
}

function buildEmailContent(
  template: EmailTemplate,
  data: TemplateData
): { subject: string; htmlBody: string; textBody: string } {
  switch (template) {
    case "welcome":
      return {
        subject: "Bem-vindo ao Jurify! 🎉",
        htmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#1e3a8a;font-size:28px;margin:0">Jurify</h1>
    <p style="color:#6b7280;font-size:14px;margin:4px 0 0">Premium Legal Suite</p>
  </div>
  <h2 style="font-size:22px;margin-bottom:8px">Olá, ${data.name ?? "Advogado(a)"}! 👋</h2>
  <p style="color:#374151;line-height:1.6">Sua conta Jurify foi criada com sucesso. Você agora tem acesso à plataforma jurídica mais avançada do Brasil.</p>
  <div style="background:#f0f4ff;border-left:4px solid #1e3a8a;padding:16px;margin:24px 0;border-radius:4px">
    <p style="margin:0;font-weight:600;color:#1e3a8a">O que você pode fazer agora:</p>
    <ul style="margin:8px 0 0;color:#374151;padding-left:20px">
      <li>Gerenciar leads e pipeline jurídico</li>
      <li>Usar agentes de IA para qualificação automática</li>
      <li>Conectar WhatsApp sem custo por mensagem</li>
      <li>Gerar e assinar contratos digitalmente</li>
    </ul>
  </div>
  <div style="text-align:center;margin:32px 0">
    <a href="https://jurify-app.vercel.app" style="background:#1e3a8a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
      Acessar Jurify
    </a>
  </div>
  <p style="color:#6b7280;font-size:13px;text-align:center">Dúvidas? Responda este email ou acesse nosso suporte.</p>
</div>`,
        textBody: `Bem-vindo ao Jurify, ${data.name ?? "Advogado(a)"}!\n\nSua conta foi criada com sucesso. Acesse: https://jurify-app.vercel.app`,
      };

    case "reset-password":
      return {
        subject: "Redefinição de senha — Jurify",
        htmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#1e3a8a;font-size:28px;margin:0">Jurify</h1>
  </div>
  <h2 style="font-size:22px">Redefinição de senha</h2>
  <p style="color:#374151;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${data.reset_url}" style="background:#1e3a8a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
      Redefinir Senha
    </a>
  </div>
  <p style="color:#6b7280;font-size:13px">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.</p>
</div>`,
        textBody: `Redefinição de senha Jurify.\n\nClique no link para redefinir: ${data.reset_url}\n\nO link expira em 1 hora.`,
      };

    case "billing-confirmation":
      return {
        subject: `Pagamento confirmado — Plano ${data.plan_name} ✅`,
        htmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#1e3a8a;font-size:28px;margin:0">Jurify</h1>
  </div>
  <h2 style="font-size:22px">Pagamento confirmado ✅</h2>
  <p style="color:#374151">Olá, ${data.name ?? ""}! Seu pagamento foi processado com sucesso.</p>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0">
    <p style="margin:0 0 8px;font-weight:600">Resumo do pagamento</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
      <tr><td style="padding:6px 0">Plano</td><td style="text-align:right;font-weight:600">${data.plan_name}</td></tr>
      <tr><td style="padding:6px 0">Valor</td><td style="text-align:right;font-weight:600">${data.amount}</td></tr>
      <tr><td style="padding:6px 0">Período</td><td style="text-align:right">${data.period}</td></tr>
    </table>
  </div>
  ${data.invoice_url ? `<div style="text-align:center;margin:24px 0"><a href="${data.invoice_url}" style="color:#1e3a8a;text-decoration:underline;font-size:14px">Ver fatura completa</a></div>` : ""}
  <div style="text-align:center;margin:32px 0">
    <a href="https://jurify-app.vercel.app" style="background:#1e3a8a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">
      Acessar Jurify
    </a>
  </div>
</div>`,
        textBody: `Pagamento confirmado!\nPlano: ${data.plan_name}\nValor: ${data.amount}\nPeríodo: ${data.period}`,
      };

    case "subscription-cancelled":
      return {
        subject: "Sua assinatura foi cancelada — Jurify",
        htmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#1e3a8a;font-size:28px;margin:0">Jurify</h1>
  </div>
  <h2 style="font-size:22px">Assinatura cancelada</h2>
  <p style="color:#374151;line-height:1.6">Olá, ${data.name ?? ""}. Sua assinatura do plano <strong>${data.plan_name}</strong> foi cancelada. Você continuará tendo acesso até o final do período pago.</p>
  <p style="color:#374151">Se mudou de ideia, você pode reativar sua assinatura a qualquer momento.</p>
  <div style="text-align:center;margin:32px 0">
    <a href="https://jurify-app.vercel.app/planos" style="background:#1e3a8a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">
      Reativar Assinatura
    </a>
  </div>
</div>`,
        textBody: `Sua assinatura do plano ${data.plan_name} foi cancelada. Reative em: https://jurify-app.vercel.app/planos`,
      };

    case "agent-alert":
      return {
        subject: "⚠️ Alerta de Agente IA — Jurify",
        htmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#1e3a8a;font-size:28px;margin:0">Jurify</h1>
  </div>
  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin-bottom:24px">
    <p style="margin:0;font-weight:600;color:#dc2626">⚠️ Alerta do sistema de agentes</p>
    <p style="margin:8px 0 0;color:#374151">${data.alert_message}</p>
  </div>
  <p style="color:#6b7280;font-size:13px">Tenant ID: ${data.tenant_id ?? "N/A"}</p>
</div>`,
        textBody: `Alerta de Agente IA:\n${data.alert_message}\nTenant: ${data.tenant_id ?? "N/A"}`,
      };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

interface EmailRequest {
  to: string;
  template: EmailTemplate;
  data?: TemplateData;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!POSTMARK_TOKEN) {
    console.error("[send-email] POSTMARK_SERVER_TOKEN not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { to, template, data = {} } = body;

  if (!to || !template) {
    return new Response(JSON.stringify({ error: "Missing required fields: to, template" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { subject, htmlBody, textBody } = buildEmailContent(template, data);

  const postmarkPayload = {
    From: `${FROM_NAME} <${FROM_EMAIL}>`,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: "outbound",
  };

  const response = await fetch(POSTMARK_API, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
    },
    body: JSON.stringify(postmarkPayload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[send-email] Postmark error ${response.status}:`, JSON.stringify(result));
    return new Response(
      JSON.stringify({ success: false, error: result.Message ?? `HTTP ${response.status}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[send-email] Sent "${template}" to ${to} — MessageID: ${result.MessageID}`);

  return new Response(
    JSON.stringify({ success: true, messageId: result.MessageID }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
