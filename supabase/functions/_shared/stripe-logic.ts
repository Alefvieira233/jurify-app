/**
 * Pure business logic for the Stripe webhook.
 *
 * This file has ZERO external imports so it is safe to import from both Deno
 * (edge function runtime) and Vitest/Node (unit tests). Every function is
 * parameterized — no env var reads inline — so tests can exercise exactly the
 * same code path that runs in production.
 *
 * Audit context: the previous Stripe webhook tests redeclared these functions
 * inside the test file and tested the copies. That was fraud masquerading as
 * coverage. Now both the edge function and the tests import from here.
 */

// ────────────────────────────────────────────────────────────────
// Price → Plan mapping
// ────────────────────────────────────────────────────────────────

export interface PriceMappingConfig {
  /** Explicit plan_id from subscription metadata (takes precedence when present). */
  metadataPlanId?: string | null;
  /** Stripe price ID configured as STRIPE_PRICE_PRO. */
  proPriceId?: string;
  /** Stripe price ID configured as STRIPE_PRICE_ENTERPRISE. */
  enterprisePriceId?: string;
}

/**
 * Map a Stripe price ID to an internal plan identifier.
 *
 * Order of precedence:
 *   1. `metadata.plan_id` on the subscription (allows ad-hoc / custom plans).
 *   2. Match against `proPriceId` → 'pro'.
 *   3. Match against `enterprisePriceId` → 'enterprise'.
 *   4. Return null if nothing matches (caller should log and skip).
 *
 * Returns null (not a default) to force the caller to handle unknown prices
 * explicitly instead of silently downgrading every user.
 */
export function mapPriceToPlanId(
  priceId: string,
  config: PriceMappingConfig,
): string | null {
  if (config.metadataPlanId) {
    return config.metadataPlanId;
  }
  if (config.proPriceId && priceId === config.proPriceId) {
    return "pro";
  }
  if (config.enterprisePriceId && priceId === config.enterprisePriceId) {
    return "enterprise";
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// Stripe status → internal status
// ────────────────────────────────────────────────────────────────

export const STRIPE_STATUS_MAP: Record<string, string> = {
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "past_due",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  trialing: "trialing",
  paused: "paused",
};

/**
 * Translate a Stripe subscription status to the Jurify-internal status.
 *
 * Unknown statuses are passed through unchanged — this is intentional so that
 * a new Stripe status doesn't silently fall through to 'active'. The caller
 * (and any DB constraint on the status column) will surface the mismatch.
 *
 * Notable mappings:
 *   - `unpaid` → `past_due` (we treat unpaid as recoverable)
 *   - `incomplete_expired` → `canceled` (never going to pay)
 */
export function mapStripeStatus(stripeStatus: string): string {
  return STRIPE_STATUS_MAP[stripeStatus] ?? stripeStatus;
}

// ────────────────────────────────────────────────────────────────
// Currency formatting (for email templates)
// ────────────────────────────────────────────────────────────────

/**
 * Format a cent amount as BRL currency (e.g. 9900 → "R$ 99,00").
 * Used for billing-confirmation and charge-refunded emails.
 */
export function formatBrlCurrency(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ────────────────────────────────────────────────────────────────
// Plan name display (for email templates)
// ────────────────────────────────────────────────────────────────

export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  pro: "Profissional",
  enterprise: "Enterprise",
  free: "Gratuito",
};

/**
 * Resolve a plan_id to a user-facing display name. Falls back to 'Profissional'
 * for unknown values because users upgrading to a custom plan should not see
 * "Unknown" in their confirmation email.
 */
export function planDisplayName(planId: string | null | undefined): string {
  if (!planId) return PLAN_DISPLAY_NAMES.free;
  return PLAN_DISPLAY_NAMES[planId] ?? PLAN_DISPLAY_NAMES.pro;
}

// ────────────────────────────────────────────────────────────────
// Subscription upsert payload builder
// ────────────────────────────────────────────────────────────────

/**
 * Minimal shape of a Stripe Subscription object that we consume.
 * Typed loosely to stay compatible with the full Stripe type without
 * requiring the Stripe SDK at test time.
 */
export interface StripeSubscriptionLike {
  id: string;
  status: string;
  items: {
    data: Array<{
      price: {
        id: string;
        unit_amount?: number | null;
      };
    }>;
  };
  metadata?: Record<string, string | null | undefined> | null;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface SubscriptionUpsertRow {
  tenant_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan_id: string | null;
  plan_tier: string;
  amount: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  updated_at: string;
}

/**
 * Build the row that goes into public.subscriptions on upsert.
 *
 * The edge function used to build this inline, which made it impossible to
 * test the shape without mocking the entire Supabase client. Extracting it
 * lets tests assert on every field in isolation.
 *
 * @param now Injectable clock for deterministic tests. Defaults to `new Date()`.
 */
export function buildSubscriptionUpsertPayload(params: {
  subscription: StripeSubscriptionLike;
  customerId: string;
  tenantId: string;
  priceConfig: PriceMappingConfig;
  now?: Date;
}): SubscriptionUpsertRow {
  const { subscription, customerId, tenantId, priceConfig, now = new Date() } = params;

  const priceItem = subscription.items.data[0];
  const priceId = priceItem?.price?.id ?? "";
  const unitAmount = priceItem?.price?.unit_amount ?? 0;

  const planId = priceId
    ? mapPriceToPlanId(priceId, {
      ...priceConfig,
      metadataPlanId: subscription.metadata?.plan_id ?? null,
    })
    : null;

  return {
    tenant_id: tenantId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: mapStripeStatus(subscription.status),
    plan_id: planId,
    plan_tier: planId ?? "free",
    amount: unitAmount,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: now.toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────
// Event type routing
// ────────────────────────────────────────────────────────────────

export const HANDLED_STRIPE_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.refunded",
] as const;

export type HandledStripeEvent = (typeof HANDLED_STRIPE_EVENTS)[number];

export function isHandledStripeEvent(eventType: string): eventType is HandledStripeEvent {
  return (HANDLED_STRIPE_EVENTS as readonly string[]).includes(eventType);
}
