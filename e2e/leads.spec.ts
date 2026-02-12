import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Gestão de Leads', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/leads');
  });

  test('deve exibir página de leads com elementos principais', async ({ page }) => {
    await expect(page.getByText(/leads/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible();
  });

  test('deve permitir buscar leads', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('João');
    await page.waitForTimeout(500);

    // Page should not crash after search
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });

  test('deve permitir filtrar por status', async ({ page }) => {
    const statusFilter = page.locator('select').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      // Page should not crash after filter
      await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
    }
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible();
  });
});

test.describe('Jurify — Performance', () => {
  test('deve carregar página de leads em menos de 5 segundos', async ({ page }) => {
    await login(page);
    const startTime = Date.now();
    await page.goto('/leads');
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible();
    expect(Date.now() - startTime).toBeLessThan(5_000);
  });
});
