import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? undefined;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Auth gate: require service-role key (this is a cron/internal function)
  const authHeader = req.headers.get("Authorization");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader?.replace("Bearer ", "") ?? "";

  if (!supabaseServiceKey || token !== supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    supabaseServiceKey,
  );

  const { data: prazos, error } = await supabase
    .from("prazos_processuais")
    .select(`
      id, tenant_id, tipo, descricao, data_prazo, alertas_dias, responsavel_id,
      processos:processo_id(numero_processo),
      responsavel:responsavel_id(telefone, nome_completo)
    `)
    .eq("status", "pendente")
    .gte("data_prazo", new Date().toISOString())
    .lte("data_prazo", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Batch query: fetch WhatsApp instance config for all tenants at once (avoid N+1)
  const tenantIds = [...new Set((prazos ?? []).map((p) => p.tenant_id as string))];
  const instanceByTenant = new Map<string, string>();
  if (tenantIds.length > 0) {
    const { data: cfgs } = await supabase
      .from("configuracoes_integracoes")
      .select("tenant_id, observacoes")
      .in("tenant_id", tenantIds)
      .eq("nome_integracao", "evolution_whatsapp");
    for (const cfg of cfgs ?? []) {
      const match = (cfg.observacoes as string | null)?.match(/instance:\s*([^\s;]+)/);
      if (match?.[1]) instanceByTenant.set(cfg.tenant_id as string, match[1]);
    }
  }

  let sent = 0;
  for (const prazo of prazos ?? []) {
    const diasRestantes = Math.ceil(
      (new Date(prazo.data_prazo as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const alertas = (prazo.alertas_dias as number[]) ?? [7, 3, 1];
    if (!alertas.includes(diasRestantes)) continue;

    const responsavel = prazo.responsavel as { telefone: string | null; nome_completo: string | null } | null;
    if (!responsavel?.telefone) continue;

    const instanceName = instanceByTenant.get(prazo.tenant_id as string);
    if (!instanceName) continue;

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
      await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text: message }),
      });
      sent++;
    } catch (e) {
      console.error("[prazos-alerts] Failed to send WhatsApp alert:", e);
    }
  }

  return new Response(JSON.stringify({ processed: prazos?.length ?? 0, sent }), {
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
});
