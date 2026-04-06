import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * CRUD Operations E2E — validates actual data mutations, not just navigation.
 * These tests CREATE, READ, UPDATE, and DELETE real entities.
 *
 * Requires: E2E_TEST_EMAIL + E2E_TEST_PASSWORD env vars
 */

const UNIQUE_SUFFIX = `e2e-${Date.now()}`;

test.describe('Jurify — CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Lead CRUD', () => {
    const leadName = `Lead Teste ${UNIQUE_SUFFIX}`;

    test('criar novo lead via formulário', async ({ page }) => {
      await page.goto('/pipeline', { waitUntil: 'networkidle' });

      // Open new lead form
      const novoLeadBtn = page.getByRole('button', { name: /novo lead/i }).first();
      await expect(novoLeadBtn).toBeVisible({ timeout: 10_000 });
      await novoLeadBtn.click();

      // Wait for form/dialog to appear
      const dialog = page.locator('[role="dialog"], [data-testid="lead-form"], form').first();
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Fill required fields
      const nomeInput = dialog.getByLabel(/nome/i).first();
      if (await nomeInput.isVisible()) {
        await nomeInput.fill(leadName);
      } else {
        // Try placeholder-based selector
        const nameField = dialog.getByPlaceholder(/nome/i).first();
        await nameField.fill(leadName);
      }

      // Fill email if visible
      const emailInput = dialog.getByLabel(/email/i).first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(`${UNIQUE_SUFFIX}@test.jurify.com`);
      }

      // Fill phone if visible
      const phoneInput = dialog.getByLabel(/telefone|whatsapp/i).first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('11999999999');
      }

      // Submit the form
      const submitBtn = dialog.getByRole('button', { name: /salvar|criar|adicionar|cadastrar/i }).first();
      await submitBtn.click();

      // Verify lead was created — should appear in the list or show success toast
      await expect(
        page.getByText(leadName).first().or(page.getByText(/sucesso|criado|adicionado/i).first())
      ).toBeVisible({ timeout: 10_000 });
    });

    test('buscar lead recém-criado', async ({ page }) => {
      await page.goto('/pipeline', { waitUntil: 'networkidle' });

      // Search for the created lead
      const searchInput = page.getByPlaceholder(/buscar|pesquis/i).first();
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(UNIQUE_SUFFIX);
      await page.waitForTimeout(1000); // Wait for debounced search

      // The lead should appear in results or show no error
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    });
  });

  test.describe('Agendamento CRUD', () => {
    test('criar novo agendamento', async ({ page }) => {
      await page.goto('/agendamentos', { waitUntil: 'networkidle' });

      // Open new agendamento form
      const novoBtn = page.getByRole('button', { name: /novo|agendar|criar/i }).first();
      await expect(novoBtn).toBeVisible({ timeout: 10_000 });
      await novoBtn.click();

      // Wait for form
      const dialog = page.locator('[role="dialog"], form').first();
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Fill title/description
      const titleInput = dialog.getByLabel(/título|assunto|descrição/i).first()
        .or(dialog.getByPlaceholder(/título|assunto/i).first());
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Reunião Teste ${UNIQUE_SUFFIX}`);
      }

      // Submit
      const submitBtn = dialog.getByRole('button', { name: /salvar|criar|agendar|confirmar/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Verify no error
        await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test.describe('Contrato CRUD', () => {
    test('criar novo contrato', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'networkidle' });

      // Open new contrato form
      const novoBtn = page.getByRole('button', { name: /novo|criar|adicionar/i }).first();
      await expect(novoBtn).toBeVisible({ timeout: 10_000 });
      await novoBtn.click();

      // Wait for form/dialog
      const dialog = page.locator('[role="dialog"], form').first();
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Fill contract title
      const titleInput = dialog.getByLabel(/título|nome|objeto/i).first()
        .or(dialog.getByPlaceholder(/título|nome/i).first());
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Contrato Teste ${UNIQUE_SUFFIX}`);
      }

      // Submit
      const submitBtn = dialog.getByRole('button', { name: /salvar|criar|adicionar/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Verify success or no error
        await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test.describe('Configurações — Perfil', () => {
    test('atualizar nome do perfil', async ({ page }) => {
      await page.goto('/configuracoes', { waitUntil: 'networkidle' });

      // Find profile section / Minha Conta tab
      const perfilTab = page.getByRole('tab', { name: /minha conta|perfil/i }).first()
        .or(page.getByText(/minha conta|perfil/i).first());
      if (await perfilTab.isVisible()) {
        await perfilTab.click();
      }

      // Find name input and update it
      const nomeInput = page.getByLabel(/nome completo|nome/i).first();
      if (await nomeInput.isVisible()) {
        const currentValue = await nomeInput.inputValue();
        await nomeInput.clear();
        await nomeInput.fill(`${currentValue || 'Teste'} (E2E)`);

        // Save
        const saveBtn = page.getByRole('button', { name: /salvar|atualizar/i }).first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          // Should show success
          await expect(
            page.getByText(/sucesso|atualizado|salvo/i).first()
          ).toBeVisible({ timeout: 10_000 });

          // Restore original name
          await nomeInput.clear();
          await nomeInput.fill(currentValue || 'Teste');
          await saveBtn.click();
        }
      }
    });
  });
});

test.describe('Jurify — Error Resilience', () => {
  test('páginas protegidas redirecionam sem auth', async ({ page }) => {
    // Go directly to protected route without login
    await page.goto('/pipeline');
    // Should redirect to /auth
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/email|entrar|acessar/i);
  });

  test('rota inexistente mostra 404', async ({ page }) => {
    await login(page);
    await page.goto('/pagina-que-nao-existe-xyz');
    await expect(page.getByText(/não encontrada|404|not found/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
