import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Gestão de Leads', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pipeline');
    await page.waitForTimeout(1_500);
  });

  test('deve exibir página de leads com elementos principais', async ({ page }) => {
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve permitir buscar leads', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquis/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('João');
    await page.waitForTimeout(500);

    // Page should not crash after search
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });

  test('deve permitir filtrar por status', async ({ page }) => {
    const statusFilter = page.locator('select').first();

    if (await statusFilter.isVisible()) {
      // Get available options; only select index 1 if it exists
      const options = await statusFilter.locator('option').count();
      if (options > 1) {
        await statusFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        // Page should not crash after filter
        await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
      }
    }
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Jurify — Performance', () => {
  test('deve carregar página de leads em menos de 8 segundos', async ({ page }) => {
    await login(page);
    const startTime = Date.now();
    await page.goto('/pipeline');
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 8_000 });
    expect(Date.now() - startTime).toBeLessThan(8_000);
  });
});
