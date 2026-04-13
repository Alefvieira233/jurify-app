import { Page, expect } from '@playwright/test';

/**
 * Reusable login helper for E2E tests.
 * Uses env vars E2E_TEST_EMAIL / E2E_TEST_PASSWORD with sensible defaults.
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL || 'test@example.com';
  const password = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

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
