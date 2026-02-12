import { Page, expect } from '@playwright/test';

/**
 * Reusable login helper for E2E tests.
 * Uses env vars E2E_TEST_EMAIL / E2E_TEST_PASSWORD with sensible defaults.
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
  const password = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

  await page.goto('/auth');
  await page.getByLabel(/email profissional/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /acessar plataforma/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/.*\//, { timeout: 15_000 });
}
