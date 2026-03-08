import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, boolean> = {
    edge_function: true,
    database: false,
    auth: false,
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check database
    const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
    checks.database = !dbError;

    // Check auth service
    const { error: authError } = await supabase.auth.getSession();
    checks.auth = !authError;
  } catch (e) {
    console.error("[health] Check failed:", e);
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return new Response(
    JSON.stringify({
      status: allHealthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
      version: Deno.env.get("VITE_APP_VERSION") ?? "1.0.0",
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
