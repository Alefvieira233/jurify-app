/**
 * AUTO-FOLLOWUP — Edge Function
 *
 * Sends automated WhatsApp follow-up messages to inactive leads.
 * Called by external cron (Vercel/GitHub Actions) daily.
 *
 * Flow:
 * 1. Find leads inactive for N days (not ganho/perdido)
 * 2. Generate personalized follow-up message per lead
 * 3. Send via WhatsApp (Kapso)
 * 4. Update lead + create notification
 *
 * Endpoint: POST /functions/v1/auto-followup
 * Auth: service_role key required
 * Body: { inactivity_days?: number } (default: 3)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { sendTextMessage as kapsoSendText, getTenantKapsoConfig } from "../_shared/kapso-client.ts";

interface InactiveLead {
  id: string;
  nome: string | null;
  telefone: string | null;
  status: string;
  area_juridica: string | null;
  tenant_id: string;
  updated_at: string;
  responsavel_id: string | null;
}

// Follow-up message builder — uses DB templates with placeholder replacement
async function buildFollowUpMessage(
  supabase: ReturnType<typeof createClient>,
  lead: InactiveLead,
  officeName: string,
  daysInactive: number,
): Promise<string> {
  const nome = lead.nome || 'prezado(a)';
  const area = lead.area_juridica && lead.area_juridica !== 'Nao informado'
    ? ` sobre ${lead.area_juridica}`
    : '';

  // Try to load tenant-customized template from DB
  const { data: template } = await supabase
    .from("message_templates")
    .select("conteudo")
    .eq("tenant_id", lead.tenant_id)
    .eq("stage", lead.status)
    .eq("channel", "whatsapp")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (template?.conteudo) {
    // Replace placeholders
    return template.conteudo
      .replace(/\{nome\}/g, nome)
      .replace(/\{area\}/g, area)
      .replace(/\{escritorio\}/g, officeName)
      .replace(/\{dias\}/g, String(daysInactive));
  }

  // Fallback: hardcoded templates (for tenants without DB templates)
  if (lead.status === 'novo' || lead.status === 'em_contato') {
    return `Olá, ${nome}! Aqui é do escritório ${officeName}. Notamos que conversamos há ${daysInactive} dias${area} e gostaríamos de saber se podemos ajudar com mais alguma orientação. Estamos à disposição para agendar uma consulta sem compromisso. 😊`;
  }
  if (lead.status === 'qualificado') {
    return `Olá, ${nome}! Sou do escritório ${officeName}. Já analisamos sua situação${area} e temos uma proposta que pode ajudá-lo(a). Posso agendar uma conversa rápida com o advogado responsável para apresentar? Sem compromisso.`;
  }
  if (lead.status === 'proposta') {
    return `Olá, ${nome}! Aqui é do escritório ${officeName}. Enviamos uma proposta${area} e gostaríamos de saber se ficou alguma dúvida. Estamos à disposição para esclarecer qualquer ponto ou ajustar as condições. Quando podemos conversar?`;
  }
  if (lead.status === 'negociacao') {
    return `Olá, ${nome}! Sou do escritório ${officeName}. Estamos em negociação${area} e gostaríamos de avançar. Tem alguma pendência ou dúvida que possamos resolver? Estamos prontos para fechar.`;
  }
  return `Olá, ${nome}! Aqui é do escritório ${officeName}. Entramos em contato pois notamos que faz alguns dias que não conversamos. Estamos à disposição para ajudá-lo(a). Como posso auxiliar?`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only service_role can call this (cron job)
  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized — service_role required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const inactivityDays = body.inactivity_days ?? 3;
    const maxPerTenant = body.max_per_tenant ?? 10; // Don't spam

    const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000).toISOString();

    // Find inactive leads with phone numbers across all tenants
    const { data: inactiveLeads, error: queryError } = await supabase
      .from("leads")
      .select("id, nome, telefone, status, area_juridica, tenant_id, updated_at, responsavel_id")
      .not("status", "in", '("ganho","perdido")')
      .is("arquivado_em", null)
      .not("telefone", "is", null)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(100);

    if (queryError) {
      console.error("[auto-followup] Query error:", queryError.message);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!inactiveLeads || inactiveLeads.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No inactive leads found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-followup] Found ${inactiveLeads.length} inactive leads`);

    // Group by tenant to respect per-tenant limits
    const byTenant = new Map<string, InactiveLead[]>();
    for (const lead of inactiveLeads as InactiveLead[]) {
      if (!lead.tenant_id || !lead.telefone) continue;
      const list = byTenant.get(lead.tenant_id) ?? [];
      list.push(lead);
      byTenant.set(lead.tenant_id, list);
    }

    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{ tenant_id: string; sent: number; failed: number }> = [];

    for (const [tenantId, leads] of byTenant.entries()) {
      // Get Kapso config for this tenant
      const kapsoConfig = await getTenantKapsoConfig(supabase, tenantId);
      if (!kapsoConfig) {
        console.warn(`[auto-followup] No Kapso config for tenant ${tenantId} — skipping ${leads.length} leads`);
        continue;
      }

      // Get office name
      const { data: tenantProfile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();

      const { data: tenantConfig } = await supabase
        .from("configuracoes_integracoes")
        .select("observacoes")
        .eq("tenant_id", tenantId)
        .eq("nome_integracao", "configuracoes_gerais")
        .maybeSingle();

      let officeName = "nosso escritório";
      try {
        const obs = tenantConfig?.observacoes;
        if (obs && typeof obs === "object" && (obs as Record<string, unknown>).office_name) {
          officeName = (obs as Record<string, unknown>).office_name as string;
        }
      } catch { /* use default */ }

      let tenantSent = 0;
      let tenantFailed = 0;

      // Send follow-up to each lead (cap per tenant)
      for (const lead of leads.slice(0, maxPerTenant)) {
        const phone = lead.telefone!.replace(/\D/g, "");
        if (phone.length < 10) continue;

        const daysInactive = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (24 * 60 * 60 * 1000));
        const message = await buildFollowUpMessage(supabase, lead, officeName, daysInactive);

        try {
          await kapsoSendText(kapsoConfig, phone, message);

          // Update lead updated_at to prevent re-sending tomorrow
          // Use RPC-style JSONB merge to preserve existing metadata
          const { data: currentLead } = await supabase
            .from("leads")
            .select("metadata")
            .eq("id", lead.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          const existingMeta = (currentLead?.metadata ?? {}) as Record<string, unknown>;
          await supabase.from("leads").update({
            updated_at: new Date().toISOString(),
            metadata: { ...existingMeta, last_followup: new Date().toISOString(), followup_type: "auto", followup_count: ((existingMeta.followup_count as number) || 0) + 1 },
          }).eq("id", lead.id).eq("tenant_id", tenantId);

          // Save message in conversation (if exists)
          const { data: conv } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (conv) {
            void supabase.from("whatsapp_messages").insert({
              conversation_id: conv.id,
              sender: "agent",
              content: message,
              timestamp: new Date().toISOString(),
              status: "sent",
            });

            void supabase.from("whatsapp_conversations").update({
              last_message: message,
              last_message_at: new Date().toISOString(),
            }).eq("id", conv.id);
          }

          tenantSent++;
          console.log(`[auto-followup] Sent to ${phone} (lead ${lead.id}, ${daysInactive}d inactive)`);
        } catch (err) {
          tenantFailed++;
          console.error(`[auto-followup] Failed to send to ${phone}:`, err);
        }
      }

      // Notify tenant admin about follow-ups sent
      if (tenantSent > 0) {
        void supabase.from("notificacoes").insert({
          tenant_id: tenantId,
          tipo: "info",
          titulo: `📨 ${tenantSent} follow-up(s) automático(s) enviado(s)`,
          mensagem: `O sistema enviou ${tenantSent} mensagem(ns) de acompanhamento para leads inativos há ${inactivityDays}+ dias. Verifique as conversas no WhatsApp.`,
          ativo: true,
        });
      }

      totalSent += tenantSent;
      totalFailed += tenantFailed;
      results.push({ tenant_id: tenantId, sent: tenantSent, failed: tenantFailed });
    }

    console.log(`[auto-followup] Complete: ${totalSent} sent, ${totalFailed} failed across ${byTenant.size} tenants`);

    return new Response(JSON.stringify({
      sent: totalSent,
      failed: totalFailed,
      tenants: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[auto-followup] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
