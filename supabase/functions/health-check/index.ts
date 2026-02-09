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
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: 0,
    services: {
      supabase: "unknown",
      database: "unknown",
      openai: "unknown",
      whatsapp_evolution: "unknown",
      stripe: "unknown",
      zapsign: "unknown",
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

    if (!healthToken) {
      return new Response(JSON.stringify({ error: "Health check token not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bearer = authHeader?.replace("Bearer ", "");
    if (tokenHeader !== healthToken && bearer !== healthToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
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

    // --- WhatsApp Evolution API Check ---
    try {
      const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
      const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
      if (!evolutionUrl || !evolutionKey) {
        healthStatus.services.whatsapp_evolution = "not_configured";
      } else {
        const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: evolutionKey },
          signal: AbortSignal.timeout(5000),
        });
        healthStatus.services.whatsapp_evolution = response.ok ? "connected" : "error";
        if (!response.ok) healthStatus.status = "degraded";
      }
    } catch (error) {
      console.error("[health-check] Evolution API error:", error);
      healthStatus.services.whatsapp_evolution = "error";
      healthStatus.status = "degraded";
    }

    // --- Stripe Check ---
    try {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        healthStatus.services.stripe = "not_configured";
      } else {
        const response = await fetch("https://api.stripe.com/v1/balance", {
          method: "GET",
          headers: { Authorization: `Bearer ${stripeKey}` },
          signal: AbortSignal.timeout(5000),
        });
        healthStatus.services.stripe = response.ok ? "connected" : "error";
        if (!response.ok) healthStatus.status = "degraded";
      }
    } catch (error) {
      console.error("[health-check] Stripe error:", error);
      healthStatus.services.stripe = "error";
      healthStatus.status = "degraded";
    }

    // --- ZapSign Check ---
    try {
      const zapSignKey = Deno.env.get("ZAPSIGN_API_KEY");
      if (!zapSignKey) {
        healthStatus.services.zapsign = "not_configured";
      } else {
        const response = await fetch("https://sandbox.zapsign.com.br/api/v1/docs/", {
          method: "GET",
          headers: { Authorization: `Api-Key ${zapSignKey}` },
          signal: AbortSignal.timeout(5000),
        });
        healthStatus.services.zapsign = (response.ok || response.status === 401) ? "connected" : "error";
        if (!response.ok && response.status !== 401) healthStatus.status = "degraded";
      }
    } catch (error) {
      console.error("[health-check] ZapSign error:", error);
      healthStatus.services.zapsign = "error";
      healthStatus.status = "degraded";
    }

    const endTime = Date.now();
    healthStatus.uptime = endTime;
    healthStatus.performance.responseTime = endTime - startTime;

    try {
      healthStatus.performance.memoryUsage = ((performance as unknown as Record<string, Record<string, number>>).memory)?.usedJSHeapSize || 0;
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
