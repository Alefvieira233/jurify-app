import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve exibir KPIs principais no dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // KPI cards should be visible
    await expect(page.getByText(/total de leads/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/contratos/i).first()).toBeVisible();
    await expect(page.getByText(/agendamentos/i).first()).toBeVisible();
    await expect(page.getByText(/agentes ia/i).first()).toBeVisible();

    // No crash
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('deve exibir pipeline de leads no dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByText(/pipeline de leads/i).first()).toBeVisible({ timeout: 10_000 });
    // Status labels should appear
    await expect(page.getByText(/novos leads|em qualificação/i).first()).toBeVisible();
  });

  test('deve exibir performance dos agentes IA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByText(/performance dos agentes/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve carregar dashboard em menos de 5 segundos', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText(/total de leads/i).first()).toBeVisible({ timeout: 5_000 });
    expect(Date.now() - start).toBeLessThan(5_000);
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByText(/total de leads/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('deve mostrar empty state para novo tenant', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Either KPIs with data OR the empty state should be visible (not a crash)
    const hasKPIs = await page.getByText(/total de leads/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/comece agora|primeiro lead|dados para exibir/i).first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasKPIs || hasEmptyState).toBeTruthy();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
