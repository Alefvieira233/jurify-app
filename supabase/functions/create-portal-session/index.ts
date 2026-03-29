import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";


Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error("Unauthorized");
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const rateLimitCheck = await applyRateLimit(req, {
            maxRequests: 10,
            windowSeconds: 60,
            namespace: "create-portal-session",
        }, { supabase: supabaseAdmin, user, corsHeaders });

        if (!rateLimitCheck.allowed) {
            return rateLimitCheck.response;
        }

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            throw new Error("Nenhuma assinatura encontrada. Assine um plano primeiro.");
        }

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const { returnUrl } = await req.json().catch(() => ({ returnUrl: undefined }));

        // SEC-01: Validate returnUrl against allowed origins to prevent open redirect
        const origin = req.headers.get('origin') || '';
        const allowedOrigins = [
          origin,
          'https://jurify.vercel.app',
          'https://jurify-app.vercel.app',
          'https://jurify.com.br',
        ].filter(Boolean);

        const isValidReturnUrl = (url: string): boolean => {
          try {
            const parsed = new URL(url);
            return allowedOrigins.some(o => parsed.origin === o);
          } catch {
            return false;
          }
        };

        if (returnUrl && !isValidReturnUrl(returnUrl)) {
            return new Response(
                JSON.stringify({ error: 'Invalid returnUrl' }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                }
            );
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: returnUrl || `${origin}/billing`,
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("❌ Error creating portal session:", error);

        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: statusCode,
            }
        );
    }
});
