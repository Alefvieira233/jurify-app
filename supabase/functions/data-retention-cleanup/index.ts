import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/logger.ts";

const log = createEdgeLogger("data-retention-cleanup");

/**
 * LGPD Data Retention Cleanup
 * 
 * Deletes data older than the tenant's configured retention period.
 * Designed to be called via cron (e.g., monthly).
 * 
 * Tables cleaned: leads, contratos, agendamentos, whatsapp_messages,
 * whatsapp_conversations, consent_logs, crm_followup_queue.
 */

interface TenantRetention {
  id: string;
  data_retention_days: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth: require service role or health-check token
    const healthToken = Deno.env.get("HEALTH_CHECK_TOKEN");
    const authHeader = req.headers.get("Authorization");
    const tokenHeader = req.headers.get("x-health-check-token");
    const bearer = authHeader?.replace("Bearer ", "");

    if (!healthToken || (tokenHeader !== healthToken && bearer !== healthToken)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get all tenants with retention config
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, data_retention_days")
      .not("data_retention_days", "is", null);

    if (tenantError) throw tenantError;
    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No tenants with retention config", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ tenant_id: string; retention_days: number; deleted: Record<string, number> }> = [];

    for (const tenant of tenants as TenantRetention[]) {
      const cutoffDate = new Date(
        Date.now() - tenant.data_retention_days * 24 * 60 * 60 * 1000
      ).toISOString();

      log.info(`Processing tenant ${tenant.id}: cutoff ${cutoffDate}`);

      const deleted: Record<string, number> = {};

      // Clean old whatsapp_messages
      const { count: msgCount } = await supabaseAdmin
        .from("whatsapp_messages")
        .delete({ count: "exact" })
        .eq("tenant_id", tenant.id)
        .lt("created_at", cutoffDate);
      deleted.whatsapp_messages = msgCount ?? 0;

      // Clean old whatsapp_conversations
      const { count: convCount } = await supabaseAdmin
        .from("whatsapp_conversations")
        .delete({ count: "exact" })
        .eq("tenant_id", tenant.id)
        .lt("updated_at", cutoffDate);
      deleted.whatsapp_conversations = convCount ?? 0;

      // Clean old consent_logs (keep recent ones for audit)
      const { count: consentCount } = await supabaseAdmin
        .from("consent_logs")
        .delete({ count: "exact" })
        .eq("tenant_id", tenant.id)
        .lt("created_at", cutoffDate);
      deleted.consent_logs = consentCount ?? 0;

      // Clean old completed follow-up queue items
      const { count: queueCount } = await supabaseAdmin
        .from("crm_followup_queue")
        .delete({ count: "exact" })
        .eq("tenant_id", tenant.id)
        .in("status", ["completed", "failed", "cancelled"])
        .lt("created_at", cutoffDate);
      deleted.crm_followup_queue = queueCount ?? 0;

      // Clean old agent execution logs
      const { count: execCount } = await supabaseAdmin
        .from("agent_executions")
        .delete({ count: "exact" })
        .eq("tenant_id", tenant.id)
        .lt("created_at", cutoffDate);
      deleted.agent_executions = execCount ?? 0;

      results.push({ tenant_id: tenant.id, retention_days: tenant.data_retention_days, deleted });
      log.info(`Tenant ${tenant.id} cleanup done`, deleted);
    }

    const elapsed = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: "ok",
        tenants_processed: results.length,
        elapsed_ms: elapsed,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Critical error in data retention cleanup", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
