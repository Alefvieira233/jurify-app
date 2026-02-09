import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

console.log("🚀 Stripe Webhook Function Started");

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function mapPriceToPlanId(priceId: string, metadataPlanId?: string | null) {
    if (metadataPlanId) {
        return metadataPlanId;
    }

    const proPriceId = Deno.env.get('STRIPE_PRICE_PRO');
    const enterprisePriceId = Deno.env.get('STRIPE_PRICE_ENTERPRISE');

    if (proPriceId && priceId === proPriceId) return 'pro';
    if (enterprisePriceId && priceId === enterprisePriceId) return 'enterprise';

    return null;
}

serve(async (req) => {
    try {
        const signature = req.headers.get("Stripe-Signature");
        const body = await req.text();
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!signature || !webhookSecret) {
            return new Response("Missing signature or secret", { status: 400 });
        }

        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                webhookSecret,
                undefined,
                cryptoProvider
            );
        } catch (err) {
            console.error(`⚠️ Webhook signature verification failed.`, err.message);
            return new Response(err.message, { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log(`🔔 Event received: ${event.type}`);

        if (!event.type || !event.data?.object) {
            return new Response("Invalid event structure", { status: 400 });
        }

        // Idempotency check: skip if event already processed
        const { data: existingEvent } = await supabase
            .from("webhook_events")
            .select("id")
            .eq("event_id", event.id)
            .eq("source", "stripe")
            .maybeSingle();

        if (existingEvent) {
            console.log(`🔁 Duplicate Stripe event ignored: ${event.id}`);
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await manageSubscriptionStatusChange(
                    supabase,
                    subscription.id,
                    subscription.customer as string,
                    event.type === 'customer.subscription.created'
                );
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    console.log(`✅ Payment succeeded for subscription: ${invoice.subscription}`);
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer as string;
                console.log(`⚠️ Payment failed for customer: ${customerId}`);

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (profileData) {
                    await supabase
                        .from('subscriptions')
                        .update({ status: 'past_due', updated_at: new Date().toISOString() })
                        .eq('stripe_customer_id', customerId);

                    await supabase
                        .from('profiles')
                        .update({ subscription_status: 'past_due' })
                        .eq('id', profileData.id);

                    console.log(`📧 User ${profileData.email} marked as past_due`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Record event as processed for idempotency
        await supabase
            .from("webhook_events")
            .insert({ event_id: event.id, source: "stripe" });

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});

async function manageSubscriptionStatusChange(
    supabase: ReturnType<typeof createClient>,
    subscriptionId: string,
    customerId: string,
    createAction = false
) {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (profileError || !profileData) {
        console.error('Customer lookup failed for stripe customer:', customerId, profileError?.message);
        return;
    }

    const { id: uuid } = profileData;

    let subscription;
    try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['default_payment_method']
        });
    } catch (stripeError) {
        console.error('Failed to retrieve subscription from Stripe:', subscriptionId, stripeError.message);
        return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const planId = priceId ? mapPriceToPlanId(priceId, subscription.metadata?.plan_id ?? null) : null;
    if (!planId) {
        console.warn("Plan mapping not found for price:", priceId);
    }

    // Map Stripe status to internal status, handling edge cases
    const stripeStatus = subscription.status;
    const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        incomplete: 'incomplete',
        incomplete_expired: 'canceled',
        trialing: 'trialing',
        paused: 'paused',
    };
    const mappedStatus = statusMap[stripeStatus] || stripeStatus;

    const { error } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: uuid,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: mappedStatus,
            plan_id: planId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'stripe_subscription_id'
        });

    if (error) {
        console.error('Error upserting subscription:', error.message);
    } else {
        console.log(`Subscription ${subscription.id} updated for user ${uuid}`);

        await supabase
            .from('profiles')
            .update({
                subscription_status: mappedStatus,
                subscription_tier: planId || 'free'
            })
            .eq('id', uuid);
    }
}
