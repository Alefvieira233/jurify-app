import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: 0,
    services: {
      supabase: "unknown",
      openai: "unknown",
      n8n: "unknown",
      database: "unknown",
    },
    performance: {
      responseTime: 0,
      memoryUsage: 0,
    },
  };

  try {
    const healthToken = Deno.env.get("HEALTH_CHECK_TOKEN");
    const authHeader = req.headers.get("Authorization");
    const tokenHeader = req.headers.get("x-health-check-token");

    if (healthToken) {
      const bearer = authHeader?.replace("Bearer ", "");
      if (tokenHeader !== healthToken && bearer !== healthToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!healthToken) {
      const token = authHeader?.replace("Bearer ", "") || "";
      const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const rateLimitCheck = await applyRateLimit(
      req,
      {
        maxRequests: 30,
        windowSeconds: 60,
        namespace: "health-check",
      },
      {
        supabase: supabaseAdmin,
        corsHeaders,
      }
    );

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    try {
      const { error } = await supabaseAdmin.from("leads").select("id").limit(1);

      if (error) throw error;
      healthStatus.services.supabase = "connected";
      healthStatus.services.database = "connected";
    } catch (error) {
      console.error("[health-check] Supabase error:", error);
      healthStatus.services.supabase = "error";
      healthStatus.services.database = "error";
      healthStatus.status = "degraded";
    }

    try {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
        });

        if (response.ok) {
          healthStatus.services.openai = "connected";
        } else {
          healthStatus.services.openai = "error";
          healthStatus.status = "degraded";
        }
      } else {
        healthStatus.services.openai = "not_configured";
      }
    } catch (error) {
      console.error("[health-check] OpenAI error:", error);
      healthStatus.services.openai = "error";
      healthStatus.status = "degraded";
    }

    try {
      const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
      if (!n8nUrl) {
        healthStatus.services.n8n = "not_configured";
      } else {
        const response = await fetch(n8nUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Jurify-Health-Check/1.0",
          },
        });

        if (response.ok || response.status === 404) {
          healthStatus.services.n8n = "connected";
        } else {
          healthStatus.services.n8n = "error";
          healthStatus.status = "degraded";
        }
      }
    } catch (error) {
      console.error("[health-check] N8N error:", error);
      healthStatus.services.n8n = "error";
      healthStatus.status = "degraded";
    }

    const endTime = Date.now();
    healthStatus.uptime = endTime;
    healthStatus.performance.responseTime = endTime - startTime;

    try {
      healthStatus.performance.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    } catch {
      healthStatus.performance.memoryUsage = 0;
    }

    return new Response(JSON.stringify(healthStatus), {
      status: healthStatus.status === "ok" ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[health-check] Critical error:", error);

    const errorResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Internal server error",
      uptime: Date.now() - startTime,
      services: healthStatus.services,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
