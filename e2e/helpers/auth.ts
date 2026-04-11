import { test, Page, expect } from '@playwright/test';

/**
 * Reusable login helper for E2E tests.
 * Uses env vars E2E_TEST_EMAIL / E2E_TEST_PASSWORD with sensible defaults.
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    console.warn('E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars are required — skipping login');
    test.skip(true, 'E2E credentials not set');
    return;
  }

  await page.goto('/auth', { waitUntil: 'networkidle' });

  const emailInput = page.getByLabel(/email profissional/i);
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  await page.getByTestId('input-login-password').fill(password);
  await page.getByRole('button', { name: /acessar plataforma/i }).click();

  // Wait for redirect away from /auth (real login completed)
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
}
