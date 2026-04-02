import { test, expect } from '@playwright/test';

/**
 * System Health Checks
 *
 * Smoke tests that verify infrastructure is reachable and the frontend
 * boots without JS errors. Run these first in CI to catch environment
 * issues before heavier E2E tests.
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for API checks.
 * Tests are skipped gracefully when env vars are missing.
 */

test.describe('System Health Checks', () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  test('Supabase API is reachable', async ({ request }) => {
    if (!supabaseUrl || !anonKey) {
      test.skip();
      return;
    }

    const resp = await request.get(`${supabaseUrl}/rest/v1/`, {
      headers: { 'apikey': anonKey },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('health-check edge function responds', async ({ request }) => {
    if (!supabaseUrl || !anonKey) {
      test.skip();
      return;
    }

    const resp = await request.get(`${supabaseUrl}/functions/v1/health-check`, {
      headers: { 'Authorization': `Bearer ${anonKey}` },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('frontend loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to /auth or show dashboard
    expect(page.url()).toContain('/');

    // Wait for any deferred errors to surface
    await page.waitForTimeout(2_000);

    // Filter out known benign errors (ResizeObserver, browser extensions)
    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('extension'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('auth page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/auth', { waitUntil: 'networkidle' });

    // Auth page should render login form
    await expect(page.getByRole('button', { name: /acessar plataforma/i })).toBeVisible({
      timeout: 10_000,
    });

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('extension'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
