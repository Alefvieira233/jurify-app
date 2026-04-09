/**
 * WEEKLY-REPORT — Edge Function
 *
 * Generates and sends weekly report to tenant admins via email (Postmark).
 * Covers: leads, conversions, revenue, agent performance, inactive leads.
 *
 * Called by external cron every Sunday.
 * Endpoint: POST /functions/v1/weekly-report
 * Auth: service_role key required
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all tenants with active profiles
    const { data: tenants } = await supabase
      .from("profiles")
      .select("tenant_id")
      .not("tenant_id", "is", null)
      .eq("ativo", true);

    const uniqueTenantIds = [...new Set((tenants ?? []).map(t => t.tenant_id).filter(Boolean))];

    const results: Array<{ tenant_id: string; sent: boolean; error?: string }> = [];

    for (const tenantId of uniqueTenantIds) {
      try {
        // Fetch metrics for this week
        const [
          { data: newLeads },
          { data: prevLeads },
          { data: wonLeads },
          { data: lostLeads },
          { data: newContracts },
          { data: agentExecs },
          { data: inactiveLeads },
        ] = await Promise.all([
          supabase.from("leads").select("id, nome, area_juridica, status, origem").eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()).limit(200),
          supabase.from("leads").select("id").eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()).limit(200),
          supabase.from("leads").select("id, nome, area_juridica").eq("tenant_id", tenantId).eq("status", "ganho").gte("updated_at", weekAgo.toISOString()).limit(50),
          supabase.from("leads").select("id").eq("tenant_id", tenantId).eq("status", "perdido").gte("updated_at", weekAgo.toISOString()).limit(200),
          supabase.from("contratos").select("id, valor_causa").eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()).limit(50),
          supabase.from("agent_executions").select("id, status").eq("tenant_id", tenantId).gte("started_at", weekAgo.toISOString()).limit(500),
          supabase.from("leads").select("id, nome, status, updated_at").eq("tenant_id", tenantId).not("status", "in", '("ganho","perdido")').is("arquivado_em", null).lt("updated_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()).limit(50),
        ]);

        const newCount = newLeads?.length ?? 0;
        const prevCount = prevLeads?.length ?? 0;
        const wonCount = wonLeads?.length ?? 0;
        const lostCount = lostLeads?.length ?? 0;
        const contractCount = newContracts?.length ?? 0;
        const totalRevenue = (newContracts ?? []).reduce((sum, c) => sum + (Number(c.valor_causa) || 0), 0);
        const execTotal = agentExecs?.length ?? 0;
        const execSuccess = (agentExecs ?? []).filter(e => e.status === "completed").length;
        const inactiveCount = inactiveLeads?.length ?? 0;

        const growthPct = prevCount > 0 ? Math.round(((newCount - prevCount) / prevCount) * 100) : 0;
        const conversionRate = newCount > 0 ? Math.round((wonCount / newCount) * 100) : 0;
        const aiSuccessRate = execTotal > 0 ? Math.round((execSuccess / execTotal) * 100) : 0;

        // Build areas breakdown
        const areaMap = new Map<string, number>();
        for (const lead of newLeads ?? []) {
          const area = lead.area_juridica || "Não informada";
          areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
        }
        const topAreas = [...areaMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([area, count]) => `${area}: ${count}`)
          .join(", ");

        // Build won leads list
        const wonList = (wonLeads ?? [])
          .slice(0, 5)
          .map(l => `• ${l.nome ?? "Lead"} (${l.area_juridica ?? "N/A"})`)
          .join("\n");

        // Format currency
        const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

        // Build report notification
        const reportTitle = `📊 Relatório Semanal — ${weekAgo.toLocaleDateString("pt-BR")} a ${now.toLocaleDateString("pt-BR")}`;
        const reportBody = [
          `📈 LEADS: ${newCount} novos (${growthPct >= 0 ? "+" : ""}${growthPct}% vs semana anterior)`,
          topAreas ? `📋 Áreas: ${topAreas}` : null,
          `✅ CONVERSÕES: ${wonCount} ganhos | ${lostCount} perdidos | Taxa: ${conversionRate}%`,
          wonList ? `\nLeads ganhos:\n${wonList}` : null,
          `💰 RECEITA: ${contractCount} contrato(s) | ${fmtBRL(totalRevenue)}`,
          `🤖 IA: ${execTotal} execuções | ${aiSuccessRate}% sucesso`,
          inactiveCount > 0 ? `⚠️ ATENÇÃO: ${inactiveCount} lead(s) inativo(s) há 3+ dias` : "✅ Nenhum lead inativo",
        ].filter(Boolean).join("\n");

        // Save as notification (always works, even without Postmark)
        await supabase.from("notificacoes").insert({
          tenant_id: tenantId,
          tipo: "info",
          titulo: reportTitle,
          mensagem: reportBody,
          ativo: true,
        });

        // Try to send email to admins (fire-and-forget)
        const { data: adminProfiles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("tenant_id", tenantId)
          .in("role", ["admin", "administrador"])
          .eq("ativo", true)
          .limit(5);

        if (adminProfiles && adminProfiles.length > 0) {
          for (const admin of adminProfiles) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, nome_completo")
              .eq("id", admin.user_id)
              .maybeSingle();

            if (profile?.email) {
              void fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                  to: profile.email,
                  template: "agent-alert",
                  data: {
                    alert_message: reportBody,
                    tenant_id: tenantId,
                    name: profile.nome_completo,
                  },
                }),
                signal: AbortSignal.timeout(15_000),
              }).catch(() => { /* email is best-effort */ });
            }
          }
        }

        console.log(`[weekly-report] Tenant ${tenantId}: ${newCount} leads, ${wonCount} won, ${fmtBRL(totalRevenue)}`);
        results.push({ tenant_id: tenantId, sent: true });

      } catch (tenantErr) {
        console.error(`[weekly-report] Failed for tenant ${tenantId}:`, tenantErr);
        results.push({ tenant_id: tenantId, sent: false, error: String(tenantErr) });
      }
    }

    return new Response(JSON.stringify({
      tenants_processed: results.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[weekly-report] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
