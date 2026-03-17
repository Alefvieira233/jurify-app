import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/logger.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

const log = createEdgeLogger("create-checkout-session");
log.info("Function started");

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

    // 1. Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 2. Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // 2b. Rate Limit (use service-role client for durable rate limiting across cold starts)
        const supabaseService = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const rateLimitCheck = await applyRateLimit(req, {
            maxRequests: 5,
            windowSeconds: 60,
            namespace: "create-checkout-session",
        }, { supabase: supabaseService, user, corsHeaders });

        if (!rateLimitCheck.allowed) {
            return rateLimitCheck.response;
        }

        // 3. Parse Body
        const { priceId, planId, successUrl, cancelUrl, mode: requestMode } = await req.json();
        if (!priceId) {
            throw new Error('Missing priceId');
        }

        // Validate redirect URLs against allowed origins
        if (successUrl || cancelUrl) {
            const origin = req.headers.get('origin') || '';
            const allowedOrigins = [
                origin,
                'https://jurify.vercel.app',
                'https://jurify-app.vercel.app',
                'https://jurify.com.br',
            ].filter(Boolean);

            const isValidRedirectUrl = (url: string): boolean => {
                try {
                    const parsed = new URL(url);
                    return allowedOrigins.some(o => parsed.origin === o);
                } catch {
                    return false;
                }
            };

            if (successUrl && !isValidRedirectUrl(successUrl)) {
                return new Response(
                    JSON.stringify({ error: 'Invalid successUrl' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            if (cancelUrl && !isValidRedirectUrl(cancelUrl)) {
                return new Response(
                    JSON.stringify({ error: 'Invalid cancelUrl' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const mode = requestMode === 'payment' ? 'payment' : 'subscription';

        // 4. Init Stripe — fail early if not configured
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            log.error("STRIPE_SECRET_KEY not configured");
            return new Response(
                JSON.stringify({ error: "Payment service not configured" }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // 5. Get or Create Customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email, tenant_id')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id,
                },
            });
            customerId = customer.id;

            // Save customer ID to profile
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
        }

        // 6. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode,
            success_url: successUrl || `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing`,
            metadata: {
                plan_id: planId || null,
                payment_type: mode === 'payment' ? 'one_time' : 'subscription'
            },
            subscription_data: mode === 'subscription' ? {
                metadata: {
                    supabase_user_id: user.id,
                    tenant_id: profile?.tenant_id || null,
                    plan_id: planId || null,
                },
            } : undefined,
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        log.error("Error creating checkout session", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
