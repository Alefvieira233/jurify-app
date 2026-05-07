/**
 * notify-expiring-trials — Edge Function
 *
 * Cron-driven (daily). Detecta trials expirando em D-3 e D-1 e dispara
 * email pra todos os admins do tenant via send-email (template trial-expiring).
 * Idempotente via subscriptions.metadata.trial_emails_sent (array de marcos).
 *
 * Auth: invocada apenas com service role (cron job em GH Actions).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface ExpiringTrial {
  id: string;
  tenant_id: string;
  trial_end_date: string;
  metadata: Record<string, unknown> | null;
}

interface AdminProfile {
  id: string;
  email: string;
  nome_completo: string | null;
  tenant_id: string;
}

Deno.serve(async (req) => {
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

  // Service-role only
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized — service role required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Trials que expiram nos próximos 3 dias
  const { data: trials, error: trialsErr } = await supabase
    .from("subscriptions")
    .select("id, tenant_id, trial_end_date, metadata")
    .eq("status", "trialing")
    .gte("trial_end_date", now.toISOString())
    .lte("trial_end_date", in3Days.toISOString());

  if (trialsErr) {
    console.error("[notify-expiring-trials] Failed to query trials:", trialsErr.message);
    return new Response(JSON.stringify({ error: trialsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalSent = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const trial of (trials ?? []) as ExpiringTrial[]) {
    const trialEnd = new Date(trial.trial_end_date);
    const msLeft = trialEnd.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    // Marcos de envio: D-3 e D-1. Idempotência via metadata.trial_emails_sent.
    const sentMarks: string[] = (trial.metadata as { trial_emails_sent?: string[] } | null)?.trial_emails_sent ?? [];
    let mark: string | null = null;
    if (daysLeft <= 1 && !sentMarks.includes("D-1")) mark = "D-1";
    else if (daysLeft <= 3 && daysLeft > 1 && !sentMarks.includes("D-3")) mark = "D-3";

    if (!mark) {
      totalSkipped++;
      continue;
    }

    // Pega admins do tenant
    const { data: adminRoles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", trial.tenant_id)
      .in("role", ["admin", "administrador"])
      .eq("ativo", true);

    if (rolesErr || !adminRoles || adminRoles.length === 0) {
      console.warn(`[notify-expiring-trials] No admins for tenant ${trial.tenant_id}`);
      totalSkipped++;
      continue;
    }

    const adminIds = adminRoles.map((r) => (r as { user_id: string }).user_id);
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, email, nome_completo, tenant_id")
      .in("id", adminIds);

    if (!admins || admins.length === 0) {
      totalSkipped++;
      continue;
    }

    // Dispara email pra cada admin (fire-and-forget seria mais rápido, mas
    // queremos saber se falhou pra não marcar como enviado)
    const trialEndStr = trialEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    let emailsSent = 0;
    for (const admin of admins as AdminProfile[]) {
      if (!admin.email) continue;
      try {
        const { error: emailErr } = await supabase.functions.invoke("send-email", {
          body: {
            to: admin.email,
            template: "trial-expiring",
            data: {
              name: admin.nome_completo ?? "Advogado(a)",
              days_left: daysLeft,
              trial_end_date: trialEndStr,
            },
          },
        });
        if (emailErr) {
          errors.push(`tenant=${trial.tenant_id} admin=${admin.id}: ${emailErr.message}`);
        } else {
          emailsSent++;
        }
      } catch (err) {
        errors.push(`tenant=${trial.tenant_id} admin=${admin.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Idempotência: marca o marco enviado nos metadata só se pelo menos 1
    // email saiu com sucesso (evita re-tentar pra sempre se Postmark estiver
    // 503; na próxima rodada do cron, tentamos de novo).
    if (emailsSent > 0) {
      const newMarks = [...sentMarks, mark];
      const newMetadata = { ...(trial.metadata ?? {}), trial_emails_sent: newMarks };
      await supabase
        .from("subscriptions")
        .update({ metadata: newMetadata })
        .eq("id", trial.id);
      totalSent += emailsSent;
    }
  }

  console.log(`[notify-expiring-trials] sent=${totalSent} skipped=${totalSkipped} errors=${errors.length}`);

  return new Response(
    JSON.stringify({
      success: true,
      total_trials_checked: trials?.length ?? 0,
      emails_sent: totalSent,
      skipped: totalSkipped,
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
