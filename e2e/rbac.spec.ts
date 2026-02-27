import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — RBAC Enforcement', () => {
  test('unauthenticated user is redirected to /auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });
  });

  test('authenticated user can access dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/.*auth/);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('billing page is accessible to authenticated user', async ({ page }) => {
    await login(page);
    await page.goto('/billing');
    await expect(page).not.toHaveURL(/.*auth/);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('protected routes redirect unauthenticated access to /auth', async ({ page }) => {
    // /billing is inside ProtectedRoute (Layout wrapper)
    await page.goto('/billing');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });

    // /configuracoes requires admin role, but first requires auth
    await page.goto('/configuracoes');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });

    // /admin/mission-control requires admin role
    await page.goto('/admin/mission-control');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });

    // /agendamentos is a standard protected route
    await page.goto('/agendamentos');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });
  });
});
