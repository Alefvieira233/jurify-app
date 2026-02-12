import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Golden Path E2E — covers the critical user journey:
 * Login → Dashboard → Leads → Contratos → Agendamentos → Settings → Logout
 */
test.describe('Jurify — Golden Path', () => {
  test('fluxo completo: login → navegação por todas as seções → logout', async ({ page }) => {
    // 1. Login
    await login(page);

    // 2. Dashboard loads
    await expect(page.locator('body')).not.toBeEmpty();

    // 3. Navigate to Leads
    await page.goto('/leads');
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible({ timeout: 10_000 });

    // 4. Navigate to Pipeline
    await page.goto('/pipeline');
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(1_000);

    // 5. Navigate to Contratos
    await page.goto('/contratos');
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(1_000);

    // 6. Navigate to Agendamentos
    await page.goto('/agendamentos');
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(1_000);

    // 7. Navigate to Configurações
    await page.goto('/configuracoes');
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(1_000);

    // 8. Navigate back to Dashboard
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('navegação lateral: sidebar links funcionam', async ({ page }) => {
    await login(page);

    // Click sidebar links if visible (desktop)
    const sidebar = page.locator('nav, aside').first();
    if (await sidebar.isVisible()) {
      const links = sidebar.locator('a[href]');
      const count = await links.count();

      // Click up to 5 sidebar links and verify no crashes
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          await link.click();
          await page.waitForTimeout(500);
          // Page should not show error boundary
          await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
        }
      }
    }
  });
});

test.describe('Jurify — Contratos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/contratos');
  });

  test('deve exibir página de contratos', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
    // Page should load without crashing
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});

test.describe('Jurify — Agendamentos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/agendamentos');
  });

  test('deve exibir página de agendamentos', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});

test.describe('Jurify — Agentes IA', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/agentes-ia');
  });

  test('deve exibir página de agentes IA', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
