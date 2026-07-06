import { Page, expect } from '@playwright/test';

/**
 * Reusable login helper for E2E tests.
 * Uses env vars E2E_TEST_EMAIL / E2E_TEST_PASSWORD with sensible defaults.
 */
export async function login(page: Page): Promise<void> {
  // Use env vars with fallback for CI/forks/smoke tests
  const email = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
  const password = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

  if (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD) {
    console.warn('⚠️ E2E_TEST_EMAIL or E2E_TEST_PASSWORD not set, using defaults for E2E');
  }

  await page.goto('/auth', { waitUntil: 'networkidle' });

  const emailInput = page.getByTestId('email-input');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  await page.getByTestId('password-input').fill(password);
  await page.getByRole('button', { name: /acessar plataforma/i }).click();

  // Wait for redirect away from /auth (real login completed)
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
}
