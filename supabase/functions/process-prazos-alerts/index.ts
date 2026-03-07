import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

  let sent = 0;
  for (const prazo of prazos ?? []) {
    const diasRestantes = Math.ceil(
      (new Date(prazo.data_prazo as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const alertas = (prazo.alertas_dias as number[]) ?? [7, 3, 1];
    if (!alertas.includes(diasRestantes)) continue;

    const responsavel = prazo.responsavel as { telefone: string | null; nome_completo: string | null } | null;
    if (!responsavel?.telefone) continue;

    const phone = responsavel.telefone.replace(/\D/g, "");
    const numeroProcesso =
      (prazo.processos as { numero_processo: string | null } | null)?.numero_processo ?? "sem nº";
    const message =
      `⚠️ *Prazo Processual — ${diasRestantes} dia(s)*\n\n` +
      `📋 Processo: ${numeroProcesso}\n` +
      `📌 Tipo: ${prazo.tipo}\n` +
      `📝 ${prazo.descricao}\n` +
      `📅 Vencimento: ${new Date(prazo.data_prazo as string).toLocaleDateString("pt-BR")}`;

    const { data: cfg } = await supabase
      .from("configuracoes_integracoes")
      .select("observacoes")
      .eq("tenant_id", prazo.tenant_id)
      .eq("nome_integracao", "evolution_whatsapp")
      .maybeSingle();

    const instanceMatch = (cfg?.observacoes as string | null)?.match(/instance:\s*([^\s;]+)/);
    const instanceName = instanceMatch?.[1];
    if (!instanceName) continue;

    try {
      await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text: message }),
      });
      sent++;
    } catch (e) {
      console.error(`[prazos-alerts] Failed to send to ${phone}:`, e);
    }
  }

  return new Response(JSON.stringify({ processed: prazos?.length ?? 0, sent }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
});
