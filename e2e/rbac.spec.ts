import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * RBAC E2E — verifies that protected routes redirect unauthenticated users
 * and that authenticated users can access core application routes.
 */

test.describe('RBAC — Proteção de rotas (unauthenticated)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/leads',
    '/contratos',
    '/billing',
    '/settings',
    '/agenda',
    '/pipeline',
  ];

  for (const route of protectedRoutes) {
    test(`rota "${route}" redireciona para /auth sem login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/auth/, { timeout: 10_000 });
    });
  }
});

test.describe('RBAC — Acesso autenticado', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('usuário autenticado acessa /billing sem crash', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForTimeout(2_000);

    // Should not redirect to auth
    await expect(page).not.toHaveURL(/auth/);
    // Should not show error boundary
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    // Should show some billing content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('usuário autenticado acessa /settings sem crash', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2_000);

    await expect(page).not.toHaveURL(/auth/);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('usuário autenticado acessa /leads sem crash', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForTimeout(2_000);

    await expect(page).not.toHaveURL(/auth/);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('usuário autenticado acessa /contratos sem crash', async ({ page }) => {
    await page.goto('/contratos');
    await page.waitForTimeout(2_000);

    await expect(page).not.toHaveURL(/auth/);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('rota inexistente não retorna tela em branco', async ({ page }) => {
    await page.goto('/rota-que-nao-existe-404xyz');
    await page.waitForTimeout(1_000);

    // Should either redirect to dashboard or show a 404 page — not blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});
