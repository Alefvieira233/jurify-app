import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTextMessage, getTenantKapsoConfig, type KapsoTenantConfig } from "../_shared/kapso-client.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? undefined;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Auth gate: require service-role key (timing-safe comparison)
  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    supabaseServiceKey,
  );

  const { data: prazos, error } = await supabase
    .from("prazos_processuais")
    .select(`
      id, tenant_id, tipo, descricao, data_prazo, alertas_dias, responsavel_id,
      last_alert_sent_at, last_alert_dias,
      processos:processo_id(numero_processo),
      responsavel:responsavel_id(telefone, nome_completo)
    `)
    .eq("status", "pendente")
    .gte("data_prazo", new Date().toISOString())
    .lte("data_prazo", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Batch query: fetch active Kapso config for all tenants at once (avoid N+1)
  const tenantIds = [...new Set((prazos ?? []).map((p) => p.tenant_id as string))];
  const activeTenants = new Set<string>();
  if (tenantIds.length > 0) {
    const { data: cfgs } = await supabase
      .from("configuracoes_integracoes")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("nome_integracao", "whatsapp_kapso")
      .eq("status", "ativa");
    for (const cfg of cfgs ?? []) {
      activeTenants.add(cfg.tenant_id as string);
    }
  }

  // Cache de config Kapso por tenant — evita re-decrypt por prazo do mesmo tenant
  const tenantConfigCache = new Map<string, KapsoTenantConfig | null>();
  async function getConfigCached(tenantId: string): Promise<KapsoTenantConfig | null> {
    if (!tenantConfigCache.has(tenantId)) {
      tenantConfigCache.set(tenantId, await getTenantKapsoConfig(supabase, tenantId));
    }
    return tenantConfigCache.get(tenantId) ?? null;
  }

  let sent = 0;
  for (const prazo of prazos ?? []) {
    const diasRestantes = Math.ceil(
      (new Date(prazo.data_prazo as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const alertas = (prazo.alertas_dias as number[]) ?? [7, 3, 1];
    if (!alertas.includes(diasRestantes)) continue;

    // Anti-spam: skip if same alert (same dias threshold) was sent within 24h
    const lastSentAt = prazo.last_alert_sent_at as string | null;
    const lastDias = prazo.last_alert_dias as number | null;
    if (lastSentAt && lastDias === diasRestantes) {
      const hoursSinceLast = (Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 24) continue;
    }

    const responsavel = prazo.responsavel as { telefone: string | null; nome_completo: string | null } | null;
    if (!responsavel?.telefone) continue;

    if (!activeTenants.has(prazo.tenant_id as string)) continue;

    const phone = responsavel.telefone.replace(/\D/g, "");
    const numeroProcesso =
      (prazo.processos as { numero_processo: string | null } | null)?.numero_processo ?? "sem nº";
    const message =
      `⚠️ *Prazo Processual — ${diasRestantes} dia(s)*\n\n` +
      `📋 Processo: ${numeroProcesso}\n` +
      `📌 Tipo: ${prazo.tipo}\n` +
      `📝 ${prazo.descricao}\n` +
      `📅 Vencimento: ${new Date(prazo.data_prazo as string).toLocaleDateString("pt-BR")}`;

    // Record in-app notification (non-blocking)
    void supabase.from("notificacoes").insert({
      tenant_id: prazo.tenant_id,
      tipo: diasRestantes <= 1 ? "erro" : "alerta",
      titulo: `Prazo urgente — ${diasRestantes} dia(s)`,
      mensagem: `${prazo.descricao} · Processo ${numeroProcesso} · Vence em ${new Date(prazo.data_prazo as string).toLocaleDateString("pt-BR")}`,
    });

    try {
      // Fix P0 (2026-07-19): sendTextMessage exige o config do tenant como 1º
      // argumento — a chamada antiga (phone, message) passava a string do
      // telefone no lugar do config e SEMPRE lançava "WhatsApp não conectado":
      // nenhum alerta de prazo chegava via WhatsApp.
      const kapsoConfig = await getConfigCached(prazo.tenant_id as string);
      if (!kapsoConfig?.phoneNumberId) {
        console.warn(`[prazos-alerts] Tenant ${prazo.tenant_id} sem conexão WhatsApp ativa — alerta só in-app`);
        continue;
      }
      await sendTextMessage(kapsoConfig, phone, message);

      // Mark alert as sent to prevent re-sending within 24h
      void supabase
        .from("prazos_processuais")
        .update({
          last_alert_sent_at: new Date().toISOString(),
          last_alert_dias: diasRestantes,
        })
        .eq("id", prazo.id);

      sent++;
    } catch (e) {
      console.error("[prazos-alerts] Failed to send WhatsApp alert:", e);
    }
  }

  return new Response(JSON.stringify({ processed: prazos?.length ?? 0, sent }), {
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
});
