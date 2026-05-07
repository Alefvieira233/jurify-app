/**
 * process-meeting-reminders — cron-driven WhatsApp reminders.
 *
 * Triggered by pg_cron every 15 minutes. Picks agendamentos starting in the
 * next 25-35 minutes window (so each meeting fires exactly once ~30min before),
 * sends a WhatsApp reminder to the lead, and marks `reminder_30min=true`.
 *
 * Auth: requires service-role key in Authorization header (cron-only).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isServiceRole } from "../_shared/supabase-client.ts";

interface AgendamentoRow {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  data_hora: string;
  responsavel: string | null;
  responsavel_id: string | null;
  link_videochamada: string | null;
  google_event_id: string | null;
  area_juridica: string | null;
}

interface LeadRow {
  id: string;
  telefone: string | null;
  nome: string | null;
}

function formatBRTtime(dateISO: string): string {
  const date = new Date(dateISO);
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const hh = String(brt.getHours()).padStart(2, "0");
  const mm = String(brt.getMinutes()).padStart(2, "0");
  return `${hh}h${mm}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  // Cron only — must use service-role key
  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startedAt = Date.now();

  // Window: meetings starting in 25-35 minutes (cron runs every 15min, so each
  // agendamento falls in this window exactly once). reminder_30min flag prevents
  // double-sends if cron jitter overlaps.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ agendamentoId: string; error: string }> = [];

  try {
    const { data: agendamentos, error: queryErr } = await supabase
      .from("agendamentos")
      .select("id, tenant_id, lead_id, data_hora, responsavel, responsavel_id, link_videochamada, google_event_id, area_juridica")
      .gte("data_hora", windowStart)
      .lte("data_hora", windowEnd)
      .in("status", ["agendado", "confirmado"])
      .or("reminder_30min.is.null,reminder_30min.eq.false")
      .limit(50);

    if (queryErr) throw queryErr;

    const list = (agendamentos ?? []) as AgendamentoRow[];

    for (const ag of list) {
      processed++;
      try {
        if (!ag.lead_id) {
          await supabase
            .from("agendamentos")
            .update({ reminder_30min: true, reminder_sent: true })
            .eq("id", ag.id);
          continue;
        }

        const { data: leadRow } = await supabase
          .from("leads")
          .select("id, telefone, nome")
          .eq("id", ag.lead_id)
          .eq("tenant_id", ag.tenant_id)
          .maybeSingle();

        const lead = leadRow as LeadRow | null;
        if (!lead?.telefone) {
          await supabase
            .from("agendamentos")
            .update({ reminder_30min: true })
            .eq("id", ag.id);
          continue;
        }

        const horario = formatBRTtime(ag.data_hora);
        const responsavel = ag.responsavel ?? "nosso advogado";
        const meetSuffix = ag.link_videochamada
          ? `\n\n📹 Link da videochamada:\n${ag.link_videochamada}`
          : "";
        const message =
          `⏰ Lembrete: sua reunião com ${responsavel} está marcada pra hoje às ${horario} (em 30 min).${meetSuffix}\n\nTe espero! Se precisar reagendar, me avise por aqui.`;

        const { error: sendErr } = await supabase.functions.invoke("send-whatsapp-message", {
          body: {
            to: lead.telefone,
            message,
            tenantId: ag.tenant_id,
            leadId: lead.id,
            source: "meeting-reminder",
          },
        });

        if (sendErr) {
          failed++;
          errors.push({ agendamentoId: ag.id, error: sendErr.message });
          continue;
        }

        await supabase
          .from("agendamentos")
          .update({ reminder_30min: true, reminder_sent: true })
          .eq("id", ag.id);

        sent++;
      } catch (err) {
        failed++;
        errors.push({ agendamentoId: ag.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[meeting-reminders] processed=${processed} sent=${sent} failed=${failed} duration=${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      sent,
      failed,
      durationMs,
      errors,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[meeting-reminders] FATAL:", message);
    return new Response(JSON.stringify({ success: false, error: message, processed, sent, failed }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
