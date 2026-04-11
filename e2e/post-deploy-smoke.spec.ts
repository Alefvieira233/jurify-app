import { test, expect } from '@playwright/test';

/**
 * Post-Deploy Smoke Test — runs against production after deploy.
 * Verifies the app boots, auth works, and core pages render.
 *
 * Usage in CI: npx playwright test e2e/post-deploy-smoke.spec.ts
 * Requires: E2E_BASE_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */

test.describe('Post-Deploy Smoke', () => {
  test('app boots and shows login page', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('login succeeds and dashboard renders', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E_TEST_EMAIL/PASSWORD not set — skipping auth smoke');
      return;
    }

    await page.goto('/auth', { waitUntil: 'networkidle' });

    await page.getByLabel(/email/i).first().fill(email);
    await page.getByTestId('input-login-password').fill(password);
    await page.getByRole('button', { name: /acessar/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15_000 });

    // Dashboard should render without error boundary
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible({ timeout: 5_000 });

    // Sidebar should be present
    await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 5_000 });
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Allow up to 2 non-critical console errors (e.g., Sentry init race)
    expect(errors.length).toBeLessThanOrEqual(2);
  });

  test('health endpoint responds', async ({ request }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      test.skip(true, 'VITE_SUPABASE_URL not set');
      return;
    }

    const response = await request.get(`${supabaseUrl}/functions/v1/health`);
    expect(response.status()).toBeLessThan(400);
  });
});
