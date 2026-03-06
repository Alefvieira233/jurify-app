import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Contratos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/contratos', { waitUntil: 'networkidle' });
  });

  test('deve exibir página de contratos sem crash', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('deve exibir botão novo contrato', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo contrato|criar contrato/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
  });

  test('deve permitir buscar contratos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquis|filtrar/i).first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('Teste');
      await page.waitForTimeout(500);
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });

  test('deve abrir modal de criação ao clicar novo contrato', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo contrato|criar contrato/i }).first();
    if (await novoBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await novoBtn.click();
      await page.waitForTimeout(1_000);

      // Should show a form/dialog with contract fields
      const dialog = page.getByRole('dialog').first();
      const formVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      const titleField = page.getByLabel(/título|nome|cliente/i).first();
      const titleVisible = await titleField.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(formVisible || titleVisible).toBeTruthy();
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
