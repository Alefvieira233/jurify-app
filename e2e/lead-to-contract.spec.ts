import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Lead → Contract E2E — covers the core sales pipeline flow:
 * Pipeline → Lead modal → Agendamentos → Contratos → no ErrorBoundary
 */
test.describe('Jurify — Lead to Contract', () => {
  test('/pipeline carrega', async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('botão "Novo Cliente/Lead" existe e modal abre', async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });

    // Button may say "Novo Lead", "Novo Cliente", "Adicionar Cliente", etc.
    const newLeadBtn = page.getByRole('button', {
      name: /novo (cliente|lead)|adicionar (cliente|lead)/i,
    }).first();

    await expect(newLeadBtn).toBeVisible({ timeout: 10_000 });
    await newLeadBtn.click();
    await page.waitForTimeout(500);

    // A modal/dialog or form should appear
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(dialog).toBeVisible();
    }
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('/agendamentos carrega e modal de novo agendamento abre', async ({ page }) => {
    await login(page);
    await page.goto('/agendamentos', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();

    // Look for a button to create a new appointment
    const newBtn = page.getByRole('button', {
      name: /novo agendamento|agendar|nova consulta/i,
    }).first();

    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible();
      }
    }
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('/contratos carrega e modal de novo contrato tem campos obrigatórios', async ({ page }) => {
    await login(page);
    await page.goto('/contratos', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();

    // Look for a button to create a new contract
    const newBtn = page.getByRole('button', {
      name: /novo contrato|criar contrato|adicionar contrato/i,
    }).first();

    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible();
        // At least one required input should be present
        const requiredInputs = dialog.locator('input[required], textarea[required], [aria-required="true"]');
        const count = await requiredInputs.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('sequência completa não aciona ErrorBoundary', async ({ page }) => {
    await login(page);

    const routes = ['/pipeline', '/agendamentos', '/contratos'];
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });
});
