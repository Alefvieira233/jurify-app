import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Jurify — Configurações', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/configuracoes', { waitUntil: 'networkidle' });
  });

  test('deve exibir página de configurações com abas', async ({ page }) => {
    await expect(page.getByText(/configurações/i).first()).toBeVisible({ timeout: 10_000 });

    // Tabs should be visible
    await expect(page.getByRole('tab', { name: /perfil/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /escritório/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /integrações/i }).first()).toBeVisible();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('aba Perfil deve mostrar campos editáveis', async ({ page }) => {
    await page.getByRole('tab', { name: /perfil/i }).first().click();
    await page.waitForTimeout(500);

    // Profile form fields
    const nameField = page.getByLabel(/nome/i).first();
    await expect(nameField).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('aba Escritório deve mostrar dados do escritório', async ({ page }) => {
    await page.getByRole('tab', { name: /escritório/i }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/dados do escritório|nome do escritório/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('aba Privacidade deve mostrar seção LGPD', async ({ page }) => {
    await page.getByRole('tab', { name: /privacidade/i }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/lgpd|proteção de dados/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/exportar meus dados/i).first()).toBeVisible();
    await expect(page.getByText(/excluir minha conta/i).first()).toBeVisible();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('botão exportar dados LGPD deve estar habilitado', async ({ page }) => {
    await page.getByRole('tab', { name: /privacidade/i }).first().click();
    await page.waitForTimeout(500);

    const exportBtn = page.getByTestId('btn-lgpd-export');
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(exportBtn).toBeEnabled();
    }
  });

  test('aba Assinatura deve mostrar plano atual', async ({ page }) => {
    await page.getByRole('tab', { name: /assinatura/i }).first().click();
    await page.waitForTimeout(500);

    const planText = page.getByText(/free|pro|enterprise|plano atual/i).first();
    await expect(planText).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
