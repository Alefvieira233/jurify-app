import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";

console.log("🚀 Create Checkout Session Function Started");

serve(async (req) => {
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

        // 3. Parse Body
        const { priceId, planId, successUrl, cancelUrl } = await req.json();
        if (!priceId) {
            throw new Error('Missing priceId');
        }

        // 4. Init Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // 5. Get or Create Customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email')
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
        console.error("❌ Error creating checkout session:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
