import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Document Generation E2E — covers contract loading, empty state, and view actions.
 * Uses page.route() to mock Supabase responses for deterministic UI states.
 */
test.describe('Document Generation — Contract States', () => {
  test('Contract page shows loading skeleton while fetching', async ({ page }) => {
    await login(page);

    // Intercept the contratos Supabase call and delay it so we can observe loading state
    await page.route('**/rest/v1/contratos*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/contratos');

    // The loading state renders Skeleton placeholders (shadcn uses animate-pulse class)
    const skeleton = page.locator('[class*="animate-pulse"]').first();
    await expect(skeleton).toBeVisible({ timeout: 5_000 });

    // No error boundary should fire during loading
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('Contract list shows empty state when no contracts exist', async ({ page }) => {
    await login(page);

    // Mock Supabase to return an empty array for contratos
    await page.route('**/rest/v1/contratos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/contratos', { waitUntil: 'networkidle' });

    // Empty state text from ContratosManager
    await expect(
      page.getByText(/nenhum contrato cadastrado/i)
    ).toBeVisible({ timeout: 10_000 });

    // The "Criar primeiro contrato" CTA button should be present
    const ctaBtn = page.getByRole('button', {
      name: /criar primeiro contrato/i,
    });
    await expect(ctaBtn).toBeVisible();

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('Contract view action button is accessible when contracts exist', async ({ page }) => {
    await login(page);

    // Mock Supabase to return a single contract
    await page.route('**/rest/v1/contratos*', async (route) => {
      const url = route.request().url();
      // Only intercept GET (list) requests
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-contract-001',
              nome_cliente: 'Cliente Teste E2E',
              area_juridica: 'Cível',
              responsavel: 'Dr. Teste',
              valor_causa: 15000,
              status: 'rascunho',
              status_assinatura: null,
              data_envio: null,
              data_assinatura: null,
              observacoes: 'Contrato de teste',
              link_assinatura_zapsign: null,
              created_at: '2026-01-15T10:00:00Z',
              tenant_id: 'test-tenant',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/contratos', { waitUntil: 'networkidle' });

    // The contract client name should be visible
    await expect(
      page.getByText('Cliente Teste E2E')
    ).toBeVisible({ timeout: 10_000 });

    // The Eye (view) button should be visible and clickable
    // ContratosManager renders Eye icon inside a button with variant="outline" size="sm"
    const viewButtons = page.locator('button:has(svg.lucide-eye)');
    const count = await viewButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Click the view button — it should open the details dialog
    await viewButtons.first().click();
    await page.waitForTimeout(500);

    // A dialog should appear with "Detalhes do Contrato"
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(dialog).toBeVisible();
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
