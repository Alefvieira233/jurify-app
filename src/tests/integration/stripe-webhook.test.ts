/**
 * Stripe webhook — integration tests against the REAL logic module.
 *
 * Unlike the previous version, this file imports the exact same functions the
 * edge function runs in production (`supabase/functions/_shared/stripe-logic.ts`).
 * If a change in the edge function breaks mapping, pricing, or payload shape,
 * these tests will fail.
 */

import { describe, it, expect } from 'vitest';
import {
  mapPriceToPlanId,
  mapStripeStatus,
  formatBrlCurrency,
  planDisplayName,
  buildSubscriptionUpsertPayload,
  isHandledStripeEvent,
  HANDLED_STRIPE_EVENTS,
  STRIPE_STATUS_MAP,
  type StripeSubscriptionLike,
} from '../../../supabase/functions/_shared/stripe-logic';

// ─── Fixtures ───────────────────────────────────────────────

const PRO_PRICE = 'price_pro_monthly';
const ENTERPRISE_PRICE = 'price_enterprise_monthly';

const priceConfig = {
  proPriceId: PRO_PRICE,
  enterprisePriceId: ENTERPRISE_PRICE,
};

function makeSubscription(overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  const start = 1_700_000_000;
  const end = start + 30 * 24 * 60 * 60;
  return {
    id: 'sub_test_001',
    status: 'active',
    items: {
      data: [{ price: { id: PRO_PRICE, unit_amount: 9900 } }],
    },
    metadata: {},
    current_period_start: start,
    current_period_end: end,
    cancel_at_period_end: false,
    ...overrides,
  };
}

// ─── Price-to-Plan Mapping ─────────────────────────────────

describe('mapPriceToPlanId', () => {
  it('maps the pro price ID to "pro"', () => {
    expect(mapPriceToPlanId(PRO_PRICE, priceConfig)).toBe('pro');
  });

  it('maps the enterprise price ID to "enterprise"', () => {
    expect(mapPriceToPlanId(ENTERPRISE_PRICE, priceConfig)).toBe('enterprise');
  });

  it('returns null when price is unknown', () => {
    expect(mapPriceToPlanId('price_unknown', priceConfig)).toBeNull();
  });

  it('prefers metadata.plan_id over the price lookup', () => {
    expect(
      mapPriceToPlanId(PRO_PRICE, { ...priceConfig, metadataPlanId: 'custom_plan' })
    ).toBe('custom_plan');
  });

  it('falls back to price mapping when metadataPlanId is empty string', () => {
    expect(mapPriceToPlanId(PRO_PRICE, { ...priceConfig, metadataPlanId: '' })).toBe('pro');
  });

  it('falls back to price mapping when metadataPlanId is null', () => {
    expect(mapPriceToPlanId(PRO_PRICE, { ...priceConfig, metadataPlanId: null })).toBe('pro');
  });

  it('returns null when neither price ID is configured', () => {
    expect(mapPriceToPlanId(PRO_PRICE, { metadataPlanId: null })).toBeNull();
  });

  it('does not accidentally match an empty configured price against an empty input', () => {
    // If both proPriceId and priceId were '' we don't want a false match.
    expect(mapPriceToPlanId('', { proPriceId: '' })).toBeNull();
  });
});

// ─── Stripe Status → Internal Status ──────────────────────

describe('mapStripeStatus', () => {
  it.each([
    ['active', 'active'],
    ['past_due', 'past_due'],
    ['canceled', 'canceled'],
    ['unpaid', 'past_due'],
    ['incomplete', 'incomplete'],
    ['incomplete_expired', 'canceled'],
    ['trialing', 'trialing'],
    ['paused', 'paused'],
  ])('%s → %s', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected);
  });

  it('passes through unknown statuses unchanged (fail-loud)', () => {
    expect(mapStripeStatus('some_future_stripe_status')).toBe('some_future_stripe_status');
  });

  it('covers every Stripe status we have opinions on', () => {
    // Guards against accidental deletion of a mapping.
    expect(Object.keys(STRIPE_STATUS_MAP).sort()).toEqual(
      ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid']
    );
  });

  it('refuses to silently downgrade unpaid to canceled (must go to past_due)', () => {
    // Regression guard: at one point someone argued unpaid should map to canceled.
    // That would permanently drop customers who had a single failed payment.
    expect(mapStripeStatus('unpaid')).not.toBe('canceled');
    expect(mapStripeStatus('unpaid')).toBe('past_due');
  });
});

// ─── Currency / Display Helpers ───────────────────────────

describe('formatBrlCurrency', () => {
  it('formats 0 cents as R$ 0,00', () => {
    expect(formatBrlCurrency(0)).toMatch(/R\$\s?0,00/);
  });

  it('formats 9900 cents as R$ 99,00', () => {
    expect(formatBrlCurrency(9900)).toMatch(/R\$\s?99,00/);
  });

  it('formats 299000 cents as R$ 2.990,00', () => {
    expect(formatBrlCurrency(299000)).toMatch(/R\$\s?2\.990,00/);
  });

  it('handles non-integer cent counts by rounding per Intl default', () => {
    // 9999 cents = 99.99. Just assert the structure, not the exact locale glyph.
    expect(formatBrlCurrency(9999)).toMatch(/99,99/);
  });
});

describe('planDisplayName', () => {
  it('returns "Profissional" for "pro"', () => {
    expect(planDisplayName('pro')).toBe('Profissional');
  });

  it('returns "Enterprise" for "enterprise"', () => {
    expect(planDisplayName('enterprise')).toBe('Enterprise');
  });

  it('returns "Gratuito" for "free"', () => {
    expect(planDisplayName('free')).toBe('Gratuito');
  });

  it('returns "Gratuito" for null/undefined', () => {
    expect(planDisplayName(null)).toBe('Gratuito');
    expect(planDisplayName(undefined)).toBe('Gratuito');
  });

  it('falls back to "Profissional" for unknown plans', () => {
    // So that a user on a custom plan never sees "Unknown" in their email.
    expect(planDisplayName('custom_plan_q4_promo')).toBe('Profissional');
  });
});

// ─── Subscription Upsert Payload Builder ─────────────────

describe('buildSubscriptionUpsertPayload', () => {
  const now = new Date('2026-04-10T12:00:00.000Z');

  it('builds a complete row for an active pro subscription', () => {
    const subscription = makeSubscription();
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });

    expect(payload).toEqual({
      tenant_id: 'tenant_xyz',
      stripe_subscription_id: 'sub_test_001',
      stripe_customer_id: 'cus_abc',
      status: 'active',
      plan_id: 'pro',
      plan_tier: 'pro',
      amount: 9900,
      current_period_start: '2023-11-14T22:13:20.000Z',
      current_period_end: '2023-12-14T22:13:20.000Z',
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    });
  });

  it('uses "free" as plan_tier when plan_id is null (unknown price)', () => {
    const subscription = makeSubscription({
      items: { data: [{ price: { id: 'price_unknown', unit_amount: 0 } }] },
    });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });

    expect(payload.plan_id).toBeNull();
    expect(payload.plan_tier).toBe('free');
  });

  it('honors metadata.plan_id over price lookup', () => {
    const subscription = makeSubscription({
      metadata: { plan_id: 'custom_enterprise_q4' },
    });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });

    expect(payload.plan_id).toBe('custom_enterprise_q4');
    expect(payload.plan_tier).toBe('custom_enterprise_q4');
  });

  it('maps Stripe status through mapStripeStatus (unpaid → past_due)', () => {
    const subscription = makeSubscription({ status: 'unpaid' });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });
    expect(payload.status).toBe('past_due');
  });

  it('preserves cancel_at_period_end flag', () => {
    const subscription = makeSubscription({ cancel_at_period_end: true });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });
    expect(payload.cancel_at_period_end).toBe(true);
  });

  it('converts Stripe Unix timestamps to ISO strings', () => {
    const subscription = makeSubscription({
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_592_000,
    });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });

    expect(payload.current_period_start).toBe('2023-11-14T22:13:20.000Z');
    expect(payload.current_period_end).toBe('2023-12-14T22:13:20.000Z');
    expect(new Date(payload.current_period_end).getTime())
      .toBeGreaterThan(new Date(payload.current_period_start).getTime());
  });

  it('defaults amount to 0 when price.unit_amount is missing', () => {
    const subscription = makeSubscription({
      items: { data: [{ price: { id: PRO_PRICE } }] },
    });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });
    expect(payload.amount).toBe(0);
  });

  it('handles subscriptions with empty items array without throwing', () => {
    const subscription = makeSubscription({ items: { data: [] } });
    const payload = buildSubscriptionUpsertPayload({
      subscription,
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
      now,
    });

    expect(payload.plan_id).toBeNull();
    expect(payload.plan_tier).toBe('free');
    expect(payload.amount).toBe(0);
  });

  it('uses current time when `now` is not provided', () => {
    const before = Date.now();
    const payload = buildSubscriptionUpsertPayload({
      subscription: makeSubscription(),
      customerId: 'cus_abc',
      tenantId: 'tenant_xyz',
      priceConfig,
    });
    const after = Date.now();
    const actual = new Date(payload.updated_at).getTime();
    expect(actual).toBeGreaterThanOrEqual(before);
    expect(actual).toBeLessThanOrEqual(after);
  });
});

// ─── Event Routing ────────────────────────────────────────

describe('isHandledStripeEvent', () => {
  it('recognizes subscription lifecycle events', () => {
    expect(isHandledStripeEvent('customer.subscription.created')).toBe(true);
    expect(isHandledStripeEvent('customer.subscription.updated')).toBe(true);
    expect(isHandledStripeEvent('customer.subscription.deleted')).toBe(true);
  });

  it('recognizes invoice payment events', () => {
    expect(isHandledStripeEvent('invoice.payment_succeeded')).toBe(true);
    expect(isHandledStripeEvent('invoice.payment_failed')).toBe(true);
  });

  it('recognizes charge.refunded', () => {
    expect(isHandledStripeEvent('charge.refunded')).toBe(true);
  });

  it('rejects unknown event types', () => {
    expect(isHandledStripeEvent('customer.created')).toBe(false);
    expect(isHandledStripeEvent('price.updated')).toBe(false);
    expect(isHandledStripeEvent('nonsense.event')).toBe(false);
  });

  it('HANDLED_STRIPE_EVENTS list stays in sync with the webhook switch statement', () => {
    // If a developer adds a new handler to the edge function, they must also
    // add it to HANDLED_STRIPE_EVENTS. This test guards the contract.
    expect(HANDLED_STRIPE_EVENTS).toHaveLength(6);
    expect(HANDLED_STRIPE_EVENTS).toContain('customer.subscription.created');
    expect(HANDLED_STRIPE_EVENTS).toContain('customer.subscription.updated');
    expect(HANDLED_STRIPE_EVENTS).toContain('customer.subscription.deleted');
    expect(HANDLED_STRIPE_EVENTS).toContain('invoice.payment_succeeded');
    expect(HANDLED_STRIPE_EVENTS).toContain('invoice.payment_failed');
    expect(HANDLED_STRIPE_EVENTS).toContain('charge.refunded');
  });
});
