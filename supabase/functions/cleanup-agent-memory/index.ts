/**
 * cleanup-agent-memory — Edge Function (Scheduled)
 *
 * Removes expired agent_memory rows based on expires_at.
 * Intended to run daily via pg_cron or Supabase scheduled invocations.
 *
 * Deployment:
 *   supabase functions deploy cleanup-agent-memory --project-ref <ref>
 *
 * Schedule via SQL (run once after deploying):
 *   SELECT cron.schedule(
 *     'cleanup-agent-memory',
 *     '0 2 * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project-ref>.supabase.co/functions/v1/cleanup-agent-memory',
 *       headers := '{"Authorization": "Bearer <service-role-key>", "Content-Type": "application/json"}',
 *       body := '{}'
 *     )$$
 *   );
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Only allow POST (cron invocations are POST)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date().toISOString();

  console.log(`[cleanup-agent-memory] Running at ${now}`);

  const { data, error, count } = await supabase
    .from("agent_memory")
    .delete()
    .lt("expires_at", now)
    .not("expires_at", "is", null)
    .select("id");

  if (error) {
    console.error("[cleanup-agent-memory] Delete error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const deleted = data?.length ?? count ?? 0;
  console.log(`[cleanup-agent-memory] Deleted ${deleted} expired memory rows`);

  return new Response(
    JSON.stringify({
      success: true,
      deleted,
      ranAt: now,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
