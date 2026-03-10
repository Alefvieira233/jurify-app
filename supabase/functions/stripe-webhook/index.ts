import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

async function sendEmail(
  to: string,
  template: string,
  data: Record<string, string | undefined>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ to, template, data }),
    });
  } catch (err) {
    console.warn(`[stripe-webhook] sendEmail failed silently for ${to}:`, err);
  }
}

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

Deno.serve(async (req) => {
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
            return new Response("Invalid webhook signature", { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );


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
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        // Record event BEFORE processing to prevent duplicate emails on retry
        const { error: insertError } = await supabase
            .from("webhook_events")
            .insert({ event_id: event.id, source: "stripe" });

        if (insertError) {
            // Duplicate key means concurrent request already processing this event
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
                    event.type === 'customer.subscription.created',
                    event.type === 'customer.subscription.deleted'
                );
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    const customerId = invoice.customer as string;
                    const { data: paidProfile } = await supabase
                        .from('profiles')
                        .select('email, nome_completo, subscription_tier')
                        .eq('stripe_customer_id', customerId)
                        .maybeSingle();
                    if (paidProfile?.email) {
                        const PLAN_NAMES: Record<string, string> = { pro: 'Profissional', enterprise: 'Enterprise', free: 'Gratuito' };
                        const amountCents = invoice.amount_paid ?? 0;
                        const amountFormatted = (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendEmail(paidProfile.email, 'billing-confirmation', {
                            name: paidProfile.nome_completo ?? paidProfile.email,
                            plan_name: PLAN_NAMES[paidProfile.subscription_tier ?? 'free'] ?? 'Profissional',
                            amount: amountFormatted,
                            period: 'Mensal',
                            invoice_url: invoice.hosted_invoice_url ?? undefined,
                        });
                    }
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer as string;

                const { data: failedProfile } = await supabase
                    .from('profiles')
                    .select('id, email, tenant_id')
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (failedProfile?.tenant_id) {
                    await supabase
                        .from('subscriptions')
                        .update({ status: 'past_due', updated_at: new Date().toISOString() })
                        .eq('tenant_id', failedProfile.tenant_id);

                    await supabase
                        .from('profiles')
                        .update({ subscription_status: 'past_due' })
                        .eq('id', failedProfile.id);


                    if (failedProfile.email) {
                        await sendEmail(failedProfile.email, 'payment-failed', {
                            name: failedProfile.email,
                        });
                    }
                }
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                const customerId = charge.customer as string;

                console.log(`[stripe-webhook] Processing charge.refunded for customer: ${customerId}, charge: ${charge.id}`);

                const { data: refundedProfile } = await supabase
                    .from('profiles')
                    .select('id, email, nome_completo, subscription_tier')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle();

                if (refundedProfile?.email) {
                    const amountRefundedCents = charge.amount_refunded ?? 0;
                    const amountFormatted = (amountRefundedCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    await sendEmail(refundedProfile.email, 'charge-refunded', {
                        name: refundedProfile.nome_completo ?? refundedProfile.email,
                        amount: amountFormatted,
                        charge_id: charge.id,
                    });

                    console.log(`[stripe-webhook] Refund email sent to ${refundedProfile.email} for ${amountFormatted}`);
                } else {
                    console.warn(`[stripe-webhook] No profile found for stripe customer ${customerId} on charge.refunded`);
                }
                break;
            }
            default:
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        const eventId = typeof error === 'object' && error !== null ? 'unknown' : String(error);
        console.error(`❌ Error processing webhook (event: ${eventId})`);
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
    createAction = false,
    deleteAction = false
) {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (profileError || !profileData) {
        console.error('Customer lookup failed for stripe customer:', customerId, profileError?.message);
        return;
    }

    const { id: uuid, tenant_id: tenantId } = profileData;

    if (!tenantId) {
        console.error('Profile has no tenant_id for user:', uuid);
        return;
    }

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
            tenant_id: tenantId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: mappedStatus,
            plan_id: planId,
            plan_tier: planId || 'free',
            amount: subscription.items.data[0]?.price?.unit_amount ?? 0,
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

        await supabase
            .from('profiles')
            .update({
                subscription_status: mappedStatus,
                subscription_tier: planId || 'free'
            })
            .eq('id', uuid);

        // Send cancellation email when subscription is deleted/canceled
        if (deleteAction || mappedStatus === 'canceled') {
            const { data: cancelledProfile } = await supabase
                .from('profiles')
                .select('email, nome_completo, subscription_tier')
                .eq('id', uuid)
                .maybeSingle();
            if (cancelledProfile?.email) {
                const PLAN_NAMES: Record<string, string> = { pro: 'Profissional', enterprise: 'Enterprise', free: 'Gratuito' };
                await sendEmail(cancelledProfile.email, 'subscription-cancelled', {
                    name: cancelledProfile.nome_completo ?? cancelledProfile.email,
                    plan_name: PLAN_NAMES[cancelledProfile.subscription_tier ?? 'free'] ?? 'Profissional',
                });
            }
        }
    }
}
