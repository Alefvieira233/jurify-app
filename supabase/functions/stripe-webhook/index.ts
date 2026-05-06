import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  buildSubscriptionUpsertPayload,
  formatBrlCurrency,
  isHandledStripeEvent,
  planDisplayName,
  type PriceMappingConfig,
  type StripeSubscriptionLike,
} from "../_shared/stripe-logic.ts";
import {
  applyRateLimit,
  checkRateLimit,
  createRateLimitResponse,
} from "../_shared/rate-limiter.ts";

/**
 * Sends a transactional email via the send-email edge function.
 *
 * Failures are NOT silent: every failure is logged at ERROR level AND persisted
 * to the email_failures table for manual review. The Stripe webhook itself does
 * not fail (returns 200) so that Stripe doesn't retry the entire event just
 * because Postmark hiccuped — but the failure is now visible to operators
 * instead of buried in a console.warn nobody reads.
 */
async function sendEmail(
  to: string,
  template: string,
  data: Record<string, string | undefined>,
  context?: { eventId?: string; eventType?: string }
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  let httpStatus = 0;
  let responseBody = "";
  let errorMessage: string | null = null;

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ to, template, data }),
    });
    httpStatus = resp.status;
    if (!resp.ok) {
      responseBody = await resp.text().catch(() => "");
      errorMessage = `send-email returned HTTP ${httpStatus}: ${responseBody.substring(0, 500)}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  if (errorMessage) {
    console.error(
      `[stripe-webhook] EMAIL FAILED template=${template} to=${to.replace(/(.{2}).+(@.+)/, "$1***$2")} status=${httpStatus} event=${context?.eventType ?? "n/a"} reason=${errorMessage}`
    );
    // Persist to email_failures for manual inspection / replay. Best-effort —
    // if the queue table itself is unreachable, we already logged ERROR above.
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from("email_failures").insert({
        recipient: to,
        template,
        payload: data as unknown as Record<string, unknown>,
        error_message: errorMessage,
        http_status: httpStatus || null,
        source: "stripe-webhook",
        stripe_event_id: context?.eventId ?? null,
        stripe_event_type: context?.eventType ?? null,
      });
    } catch (insertErr) {
      console.error(
        `[stripe-webhook] email_failures insert ALSO failed:`,
        insertErr instanceof Error ? insertErr.message : insertErr
      );
    }
  }
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** Reads STRIPE_PRICE_* env vars at call time so rotation takes effect without a redeploy. */
function currentPriceMappingConfig(): PriceMappingConfig {
  return {
    proPriceId: Deno.env.get("STRIPE_PRICE_PRO") ?? undefined,
    enterprisePriceId: Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? undefined,
  };
}

Deno.serve(async (req) => {
    try {
        if (!stripe) {
            console.error("[stripe-webhook] STRIPE_SECRET_KEY not configured");
            return new Response("Payment service not configured", { status: 503 });
        }

        // Phase 1: GLOBAL rate limit (pre-signature, IP/host bucket).
        // Generous ceiling — Stripe legitimately bursts during dunning/retry
        // storms. The bucket exists to protect CPU from a flood of invalid
        // signature attempts (CPU DoS) and to bound the absolute throughput
        // of the function. A 429 here makes Stripe back off and retry with
        // exponential delay, which is exactly the desired behavior.
        const supabaseGlobal = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const globalLimit = await applyRateLimit(
            req,
            { maxRequests: 300, windowSeconds: 60, namespace: "stripe-webhook:global" },
            { supabase: supabaseGlobal }
        );
        if (!globalLimit.allowed) {
            console.warn("[stripe-webhook] Rate limit exceeded (global)");
            return globalLimit.response;
        }

        const signature = req.headers.get("Stripe-Signature");
        const body = await req.text();
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        // Distinguish CONFIG missing (our fault) from SIGNATURE missing (caller's fault).
        // Both used to return 400 silently — making it impossible to tell from logs why
        // every Stripe webhook event was being rejected and zero rows were persisted.
        if (!webhookSecret) {
            console.error(
                "[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting all webhook deliveries. " +
                "Set this secret via `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...` and re-deploy."
            );
            return new Response(
                JSON.stringify({ error: "Webhook signing secret not configured", code: "MISSING_WEBHOOK_SECRET" }),
                { status: 503, headers: { "Content-Type": "application/json" } }
            );
        }
        if (!signature) {
            return new Response("Missing Stripe-Signature header", { status: 400 });
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

        // Phase 2: PER-CUSTOMER rate limit (post-signature).
        // Stripe customers normally generate single-digit events per minute.
        // A burst > 60/min usually means a runaway loop on the customer side
        // (e.g. failed-payment retry storm) or a replay attack with valid
        // signatures from a leaked endpoint. 429-ing one customer protects
        // backend processing and downstream email volume without affecting
        // other tenants. Stripe will retry these with exponential backoff.
        // Skipped when no customer is attached (rare admin events).
        const eventObject = event.data.object as { customer?: string | null };
        const stripeCustomerId =
            typeof eventObject.customer === "string" && eventObject.customer.length > 0
                ? eventObject.customer
                : null;
        if (stripeCustomerId) {
            const customerLimit = await checkRateLimit(
                {
                    identifier: `stripe_cust:${stripeCustomerId}`,
                    namespace: "stripe-webhook:customer",
                    maxRequests: 60,
                    windowSeconds: 60,
                },
                supabase
            );
            if (!customerLimit.allowed) {
                console.warn(
                    `[stripe-webhook] Rate limit exceeded (per-customer) customer=${stripeCustomerId} event=${event.type}`
                );
                return createRateLimitResponse(customerLimit);
            }
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
                        await sendEmail(paidProfile.email, 'billing-confirmation', {
                            name: paidProfile.nome_completo ?? paidProfile.email,
                            plan_name: planDisplayName(paidProfile.subscription_tier),
                            amount: formatBrlCurrency(invoice.amount_paid ?? 0),
                            period: 'Mensal',
                            invoice_url: invoice.hosted_invoice_url ?? undefined,
                        }, { eventId: event.id, eventType: event.type });
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
                        }, { eventId: event.id, eventType: event.type });
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
                    const amountFormatted = formatBrlCurrency(charge.amount_refunded ?? 0);

                    await sendEmail(refundedProfile.email, 'charge-refunded', {
                        name: refundedProfile.nome_completo ?? refundedProfile.email,
                        amount: amountFormatted,
                        charge_id: charge.id,
                    }, { eventId: event.id, eventType: event.type });

                    console.log(`[stripe-webhook] Refund email sent to ${refundedProfile.email} for ${amountFormatted}`);
                } else {
                    console.warn(`[stripe-webhook] No profile found for stripe customer ${customerId} on charge.refunded`);
                }
                break;
            }
            default: {
                // Event not in our handled set — log for observability.
                if (!isHandledStripeEvent(event.type)) {
                    console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
                }
            }
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
    const payload = buildSubscriptionUpsertPayload({
        subscription: subscription as unknown as StripeSubscriptionLike,
        customerId,
        tenantId,
        priceConfig: currentPriceMappingConfig(),
    });

    if (!payload.plan_id) {
        console.warn("Plan mapping not found for price:", priceId);
    }

    const mappedStatus = payload.status;

    const { error } = await supabase
        .from('subscriptions')
        .upsert(payload, {
            onConflict: 'stripe_subscription_id'
        });

    if (error) {
        console.error('Error upserting subscription:', error.message);
    } else {
        // Bug fix: previous code referenced `planId` (undefined ReferenceError),
        // which silently broke profile updates after every subscription change.
        // Use payload.plan_id, which comes from buildSubscriptionUpsertPayload.
        await supabase
            .from('profiles')
            .update({
                subscription_status: mappedStatus,
                subscription_tier: payload.plan_id || 'free'
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
