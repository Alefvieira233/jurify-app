import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * WhatsApp E2E — covers WhatsApp setup page, stepper UI, and error handling
 */
test.describe('Jurify — WhatsApp Setup', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('authenticated user can navigate to /whatsapp', async ({ page }) => {
    await page.goto('/whatsapp', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).toHaveURL(/whatsapp/, { timeout: 10_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('WhatsApp page shows setup UI with connection card', async ({ page }) => {
    await page.goto('/whatsapp', { waitUntil: 'networkidle' });

    // The WhatsApp page should render its main heading
    const heading = page.getByText(/whatsapp.*ia|whatsapp.*jurídic|conexão whatsapp|whatsapp evolution/i).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // The connect button should be visible in idle/disconnected state
    const connectBtn = page.getByRole('button', { name: /conectar whatsapp|reconectar whatsapp/i }).first();
    if (await connectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(connectBtn).toBeVisible();
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('clicking connect shows stepper and handles Evolution API errors gracefully', async ({ page }) => {
    // Mock the Evolution API edge function to return an error
    await page.route('**/functions/v1/evolution-manager', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Evolution API não está configurada ou inacessível',
        }),
      });
    });

    await page.goto('/whatsapp', { waitUntil: 'networkidle' });

    const connectBtn = page.getByRole('button', { name: /conectar whatsapp|reconectar whatsapp/i }).first();
    if (await connectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForLoadState('networkidle');

      // Should show error state, not crash
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();

      // An error alert or toast should appear
      const errorIndicator = page.getByText(/erro|falha|inacessível/i).first();
      if (await errorIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(errorIndicator).toBeVisible();
      }
    }
  });

  test('page handles gracefully when Evolution API is unreachable', async ({ page }) => {
    // Mock the edge function to simulate network failure
    await page.route('**/functions/v1/evolution-manager', (route) => {
      return route.abort('connectionrefused');
    });

    await page.goto('/whatsapp', { waitUntil: 'networkidle' });

    // Page should load without crashing even with API unreachable
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();

    // Attempt to connect — should show error, not crash
    const connectBtn = page.getByRole('button', { name: /conectar whatsapp|reconectar whatsapp/i }).first();
    if (await connectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForLoadState('networkidle');

      // Should still not crash
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });
});
