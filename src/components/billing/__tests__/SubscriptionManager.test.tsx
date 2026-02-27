/**
 * 💳 TESTES DO SUBSCRIPTION MANAGER (Sprint 2)
 *
 * Cobre o bug crítico de checkout:
 * 1. ✅ PRICE_MAP faltando → toast de erro, sem crash, sem invoke
 * 2. ✅ PRICE_MAP presente → invoke com planId + priceId
 * 3. ✅ data.url retornado → window.location.href atualizado
 * 4. ✅ Edge Function retorna erro → toast de erro
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SubscriptionManager } from '../SubscriptionManager';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockToast   = vi.hoisted(() => vi.fn());
const mockInvoke  = vi.hoisted(() => vi.fn());

// Stable reference — same object on every render so useCallback deps don't change.
const MOCK_PROFILE = vi.hoisted(() => ({
  id: 'user-1',
  nome_completo: 'Test User',
  email: 'test@jurify.com',
  role: 'user',
  tenant_id: 'tenant-1',
  subscription_tier: 'free',
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  // Return the hoisted stable reference so useCallback deps stay constant
  useAuth: () => ({ profile: MOCK_PROFILE }),
}));

vi.mock('@/integrations/supabase/client', () => {
  // Build the chainable mock inline so it's safe from TDZ
  const resolved = { data: null, error: null, count: 0 };
  const chain: Record<string, unknown> = {
    // Thenable — so `await chain` resolves
    then: (res: (v: unknown) => unknown) => Promise.resolve(resolved).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(resolved).catch(rej),
    finally: (fn: () => void) => Promise.resolve(resolved).finally(fn),
  };
  const noop = () => chain;
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit']) {
    chain[m] = noop;
  }
  chain.single       = () => Promise.resolve(resolved);
  chain.maybeSingle  = () => Promise.resolve(resolved);

  return {
    supabaseUntyped: {
      from: () => chain,
      functions: { invoke: mockInvoke },
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderComponent = () => render(<SubscriptionManager />);

/** Wait until the spinner is gone and the plan badge is visible */
const waitForLoad = () =>
  screen.findByText(/FREE/i, {}, { timeout: 5000 });

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('💳 SubscriptionManager — Checkout Fix (Sprint 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_PRO;
    delete (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_ENTERPRISE;
    mockInvoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test' }, error: null });
  });

  afterEach(() => {
    delete (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_PRO;
    delete (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_ENTERPRISE;
  });

  it('❌ Sem VITE_STRIPE_PRICE_PRO → toast com instrução .env, sem invoke', async () => {
    renderComponent();
    await waitForLoad();

    const btn = await screen.findByRole('button', { name: /upgrade para pro/i }, { timeout: 3000 });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringContaining('VITE_STRIPE_PRICE_PRO'),
        }),
      );
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('❌ Sem VITE_STRIPE_PRICE_ENTERPRISE → toast com instrução .env, sem invoke', async () => {
    renderComponent();
    await waitForLoad();

    const btn = await screen.findByRole('button', { name: /falar com vendas/i }, { timeout: 3000 });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringContaining('VITE_STRIPE_PRICE_ENTERPRISE'),
        }),
      );
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('✅ Com priceId configurado → invoke recebe planId E priceId', async () => {
    (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_PRO = 'price_pro_123';

    renderComponent();
    await waitForLoad();

    fireEvent.click(await screen.findByRole('button', { name: /upgrade para pro/i }, { timeout: 3000 }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'create-checkout-session',
        expect.objectContaining({
          body: expect.objectContaining({ planId: 'pro', priceId: 'price_pro_123' }),
        }),
      );
    });
  });

  it('✅ data.url presente → window.location.href é atualizado', async () => {
    (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_PRO = 'price_pro_123';
    mockInvoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/session_abc' }, error: null });

    const hrefSetter = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, set href(v: string) { hrefSetter(v); } },
      writable: true, configurable: true,
    });

    renderComponent();
    await waitForLoad();
    fireEvent.click(await screen.findByRole('button', { name: /upgrade para pro/i }, { timeout: 3000 }));

    await waitFor(() => {
      expect(hrefSetter).toHaveBeenCalledWith('https://checkout.stripe.com/session_abc');
    });

    Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
  });

  it('❌ Edge Function retorna erro → toast de erro, componente não crasha', async () => {
    (import.meta.env as Record<string, unknown>).VITE_STRIPE_PRICE_PRO = 'price_pro_123';
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Stripe error') });

    renderComponent();
    await waitForLoad();
    fireEvent.click(await screen.findByRole('button', { name: /upgrade para pro/i }, { timeout: 3000 }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' }),
      );
    });
    expect(screen.getByText(/FREE/i)).toBeInTheDocument();
  });
});
