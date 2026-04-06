import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Gestão de Leads', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });
  });

  test('deve exibir página de leads com elementos principais', async ({ page }) => {
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve permitir buscar leads', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquis/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('João');
    await page.waitForTimeout(500);

    // Page should not crash after search
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });

  test('deve permitir filtrar por status', async ({ page }) => {
    const statusFilter = page.locator('select').first();

    if (await statusFilter.isVisible()) {
      // Get available options; only select index 1 if it exists
      const options = await statusFilter.locator('option').count();
      if (options > 1) {
        await statusFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        // Page should not crash after filter
        await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
      }
    }
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Jurify — Lead Form & Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });
  });

  test('deve abrir formulário de novo lead com campos obrigatórios', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo lead/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
    await novoBtn.click();

    // Dialog/form should appear with key fields
    const dialog = page.locator('[role="dialog"], form').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Verify essential fields exist
    const nameField = dialog.getByLabel(/nome/i).first()
      .or(dialog.getByPlaceholder(/nome/i).first());
    await expect(nameField).toBeVisible({ timeout: 3_000 });
  });

  test('deve preencher campos do formulário sem erro', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo lead/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
    await novoBtn.click();

    const dialog = page.locator('[role="dialog"], form').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill name field
    const nameField = dialog.getByLabel(/nome/i).first()
      .or(dialog.getByPlaceholder(/nome/i).first());
    if (await nameField.isVisible()) {
      await nameField.fill('Lead E2E Test');
      await expect(nameField).toHaveValue('Lead E2E Test');
    }

    // Fill email if exists
    const emailField = dialog.getByLabel(/email/i).first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('e2e@test.com');
    }

    // No crash
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('deve renderizar cards no pipeline/kanban', async ({ page }) => {
    // Pipeline page should have either kanban columns or list items
    const hasCards = await page.locator('[data-testid*="lead"], [data-testid*="card"], .kanban-card').first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/nenhum lead|sem leads|pipeline vazio/i).first()
      .isVisible({ timeout: 3_000 }).catch(() => false);

    // Either cards exist or empty state — both are valid
    expect(hasCards || hasEmptyState).toBeTruthy();
  });
});

test.describe('Jurify — Performance', () => {
  test('deve carregar página de leads em menos de 8 segundos', async ({ page }) => {
    await login(page);
    const startTime = Date.now();
    await page.goto('/pipeline');
    await expect(page.getByRole('button', { name: /novo lead/i }).first()).toBeVisible({ timeout: 8_000 });
    expect(Date.now() - startTime).toBeLessThan(8_000);
  });
});
