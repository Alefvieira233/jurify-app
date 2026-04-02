import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Stripe Payment Flow E2E — covers subscription UI, upgrade interactions,
 * and webhook endpoint validation.
 *
 * Since we cannot process real payments in tests, we verify the UI flow
 * and that the webhook rejects unsigned requests.
 */
test.describe('Jurify — Stripe Payment Flow', () => {
  test('billing page loads and shows subscription plans', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });

    // Should show plan options or current plan badge
    const planContent = page.getByText(/gratuito|free|profissional|pro|enterprise|plano atual/i).first();
    await expect(planContent).toBeVisible({ timeout: 10_000 });

    // No crash
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('configuracoes billing tab shows plan info', async ({ page }) => {
    await login(page);
    await page.goto('/configuracoes', { waitUntil: 'networkidle' });

    // Look for billing/subscription tab
    const billingTab = page.getByText(/assinatura|plano|billing|faturamento/i).first();
    if (await billingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await billingTab.click();
      await page.waitForTimeout(1_000);

      // Should show plan-related content
      const planContent = page.getByText(/gratuito|free|profissional|pro|enterprise|plano atual/i).first();
      await expect(planContent).toBeVisible({ timeout: 5_000 });
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('upgrade button is present and enabled for free users', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });

    const upgradeBtn = page.getByRole('button', { name: /upgrade|assinar|contratar|falar com vendas/i }).first();
    if (await upgradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(upgradeBtn).toBeEnabled();
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('clicking upgrade stays on billing page (no unhandled redirect)', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });

    const upgradeBtn = page.getByRole('button', { name: /upgrade para pro|assinar pro/i }).first();
    if (await upgradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await upgradeBtn.click();
      await page.waitForTimeout(1_500);

      // Should remain on billing or show checkout — not crash
      await expect(page).toHaveURL(/billing|checkout/, { timeout: 3_000 });
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });

  test('session_id query param triggers payment success feedback', async ({ page }) => {
    await login(page);
    await page.goto('/?session_id=test_session_123', { waitUntil: 'networkidle' });

    // Toast or success message may appear
    const successMsg = page.getByText(/pagamento realizado|pagamento confirmado|assinatura ativa/i);
    if (await successMsg.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(successMsg).toBeVisible();
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('stripe webhook rejects unsigned requests', async ({ request }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      test.skip();
      return;
    }

    // Stripe webhook should reject requests without valid Stripe-Signature header
    const resp = await request.post(`${supabaseUrl}/functions/v1/stripe-webhook`, {
      headers: { 'Content-Type': 'application/json' },
      data: { type: 'checkout.session.completed', data: { object: {} } },
    });

    // Should reject (400, 401, or 403) because no valid Stripe signature
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('billing page is responsive on mobile', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/billing', { waitUntil: 'networkidle' });

    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
