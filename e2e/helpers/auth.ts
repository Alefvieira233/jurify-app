import { Page, expect, test } from '@playwright/test';

/**
 * Reusable login helper for E2E tests.
 * Uses env vars E2E_TEST_EMAIL / E2E_TEST_PASSWORD.
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    test.skip(true, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars are required');
    return;
  }

  await page.goto('/auth', { waitUntil: 'networkidle' });

  const emailInput = page.getByTestId('input-login-email');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  await page.getByTestId('input-login-password').fill(password);
  await page.getByRole('button', { name: /acessar plataforma/i }).click();

  // Wait for redirect away from /auth (real login completed)
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
}
