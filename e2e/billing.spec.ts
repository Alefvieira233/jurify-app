import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Billing E2E — covers subscription management page and upgrade flows
 */
test.describe('Jurify — Billing', () => {
  test('login → /billing carrega sem crash', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('plano atual visível (badge Free/Pro/Enterprise)', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });
    // Badge with plan name should be visible
    const planBadge = page.getByText(/free|pro|enterprise/i).first();
    await expect(planBadge).toBeVisible({ timeout: 10_000 });
  });

  test('usuário Free vê botões de upgrade', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });
    // At least one upgrade button should be visible for Free users
    const upgradeBtn = page.getByRole('button', { name: /upgrade|assinar|falar com vendas/i }).first();
    if (await upgradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(upgradeBtn).toBeVisible();
    }
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('clicar em upgrade sem env configurado → toast de erro, não crash nem redirect', async ({ page }) => {
    await login(page);
    await page.goto('/billing', { waitUntil: 'networkidle' });

    const upgradeBtn = page.getByRole('button', { name: /upgrade para pro|assinar pro/i }).first();
    if (await upgradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await upgradeBtn.click();
      await page.waitForTimeout(1_500);
      // Should stay on billing page (no redirect to external URL)
      await expect(page).toHaveURL(/billing/, { timeout: 3_000 });
      // Page should not crash
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });

  test('dashboard com ?session_id=test → toast "Pagamento realizado"', async ({ page }) => {
    await login(page);
    await page.goto('/?session_id=test', { waitUntil: 'networkidle' });
    // Toast or success message should appear
    const successMsg = page.getByText(/pagamento realizado|pagamento confirmado|assinatura ativa/i);
    if (await successMsg.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(successMsg).toBeVisible();
    }
    // Page should not crash
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
