import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 30 req/min per caller
  const rateLimitCheck = await applyRateLimit(req, {
    maxRequests: 30,
    windowSeconds: 60,
    namespace: "health",
  }, { corsHeaders });

  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response;
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
