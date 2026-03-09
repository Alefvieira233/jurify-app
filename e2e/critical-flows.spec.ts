import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/** Unique suffix to avoid data collisions between runs */
const uid = () => Date.now().toString().slice(-6);

// ─── 1. Criar Lead ────────────────────────────────────────────────────────────

test.describe('Fluxo — Criar Lead', () => {
  test('preenche formulário e confirma criação com toast', async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });

    // Open modal
    const novoBtn = page.getByRole('button', { name: /novo (cliente|lead)|adicionar (cliente|lead)/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
    await novoBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill Nome Completo (required)
    const nome = `E2E Lead ${uid()}`;
    await dialog.getByPlaceholder(/joão silva santos/i).fill(nome);

    // Select Área Jurídica (first available option)
    const areaCombo = dialog.getByRole('combobox').first();
    if (await areaCombo.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await areaCombo.click();
      const firstOption = page.getByRole('option').first();
      await firstOption.waitFor({ state: 'visible', timeout: 3_000 });
      await firstOption.click();
    }

    // Fill Responsável (required)
    await dialog.getByPlaceholder(/nome do advogado responsável/i).fill('Advogado E2E');

    // Submit
    await dialog.getByRole('button', { name: /criar lead/i }).click();

    // Toast success
    await expect(page.getByText(/sucesso|lead criado/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});

// ─── 2. Pipeline Kanban ───────────────────────────────────────────────────────

test.describe('Fluxo — Pipeline Kanban', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pipeline', { waitUntil: 'networkidle' });
  });

  test('exibe colunas do kanban com cabeçalhos de status', async ({ page }) => {
    // Kanban should have at least 2 status columns
    const colunas = page.locator('[class*="column"], [class*="kanban"], [class*="col"]').filter({
      hasText: /novo lead|qualificaç|proposta|contrato|atendimento/i,
    });

    // At least one column header visible
    await expect(colunas.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('abre detalhes de lead ao clicar em card (se existir)', async ({ page }) => {
    // If demo data was loaded, at least one card should exist
    const card = page.locator('[class*="card"][class*="cursor"], [draggable="true"]').first();
    const hasCard = await card.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasCard) {
      await card.click();
      // Either a detail modal or navigation should occur — no crash
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    } else {
      // Empty pipeline: verify empty state renders
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('filtro de busca não quebra a página', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar|pesquisar/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('Maria');
      await page.waitForTimeout(600);
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
      await search.clear();
    }
  });
});

// ─── 3. Criar Contrato ────────────────────────────────────────────────────────

test.describe('Fluxo — Criar Contrato', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/contratos', { waitUntil: 'networkidle' });
  });

  test('abre modal e preenche campos obrigatórios', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo contrato|criar contrato/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
    await novoBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const id = uid();

    // Nome do cliente
    const nomeLabel = dialog.getByLabel(/nome do cliente/i).first();
    if (await nomeLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nomeLabel.fill(`Cliente Teste ${id}`);
    }

    // Área jurídica (text input)
    const areaLabel = dialog.getByLabel(/área jurídica/i).first();
    if (await areaLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await areaLabel.fill('Direito Civil');
    }

    // Responsável
    const respLabel = dialog.getByLabel(/responsável/i).first();
    if (await respLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await respLabel.fill('Advogado E2E');
    }

    // Texto do contrato (textarea)
    const textoLabel = dialog.getByLabel(/texto do contrato/i).first();
    if (await textoLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await textoLabel.fill(`Contrato de prestação de serviços jurídicos – ${id}.`);
    }

    // Submit
    const submitBtn = dialog.getByRole('button', { name: /salvar|criar|gerar contrato/i }).first();
    if (await submitBtn.isEnabled({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click();
      await expect(page.getByText(/sucesso|contrato criado/i).first()).toBeVisible({ timeout: 10_000 });
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('valida que contrato sem nome não é submetido', async ({ page }) => {
    const novoBtn = page.getByRole('button', { name: /novo contrato|criar contrato/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 10_000 });
    await novoBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Try to submit without filling anything
    const submitBtn = dialog.getByRole('button', { name: /salvar|criar|gerar contrato/i }).first();
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      // Dialog should still be open (form validation blocked submission)
      await expect(dialog).toBeVisible();
    }
  });
});

// ─── 4. Notificações ─────────────────────────────────────────────────────────

test.describe('Fluxo — Notificações', () => {
  test('sino de notificações existe no layout autenticado', async ({ page }) => {
    await login(page);
    // Bell / notification icon should be in the header
    const bell = page.locator('button[aria-label*="otificaç"], button[aria-label*="ell"], [href*="notificacoes"]').first();
    const hasBell = await bell.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasBell) {
      await bell.click();
      await page.waitForTimeout(400);
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    } else {
      // At minimum, notification link in sidebar
      await page.goto('/notificacoes', { waitUntil: 'networkidle' });
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    }
  });
});

// ─── 5. Módulos Jurídicos ─────────────────────────────────────────────────────

test.describe('Fluxo — Módulos Jurídicos', () => {
  const routes = [
    { path: '/processos', label: 'Processos' },
    { path: '/prazos', label: 'Prazos' },
    { path: '/honorarios', label: 'Honorários' },
    { path: '/documentos', label: 'Documentos' },
    { path: '/painel-prazos', label: 'Painel de Prazos' },
  ] as const;

  for (const { path, label } of routes) {
    test(`${label} carrega sem ErrorBoundary`, async ({ page }) => {
      await login(page);
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible({ timeout: 10_000 });
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }
});
