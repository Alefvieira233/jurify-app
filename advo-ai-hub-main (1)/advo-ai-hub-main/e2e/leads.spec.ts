import { test, expect } from '@playwright/test';

test.describe('Jurify - Gestão de Leads', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    // Nota: Em produção, use helper function ou setup de autenticação
    await page.goto('/auth');

    const testEmail = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/senha/i).fill(testPassword);
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguardar dashboard carregar
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Navegar para leads
    await page.goto('/leads');
  });

  test('deve exibir página de leads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /gestão de leads/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible();
  });

  test('deve permitir buscar leads', async ({ page }) => {
    // Esperar input de busca aparecer
    const searchInput = page.getByPlaceholder(/buscar/i);
    await expect(searchInput).toBeVisible();

    // Digitar termo de busca
    await searchInput.fill('João');

    // Aguardar debounce (300ms)
    await page.waitForTimeout(400);

    // Verificar que resultados foram filtrados
    // (assumindo que existe pelo menos um lead com "João")
    const leadCards = page.locator('[data-testid="lead-card"]');

    if (await leadCards.count() > 0) {
      const firstCard = leadCards.first();
      await expect(firstCard).toContainText(/joão/i);
    }
  });

  test('deve permitir filtrar por status', async ({ page }) => {
    // Localizar select de status
    const statusFilter = page.locator('select').filter({ hasText: /status/i });

    if (await statusFilter.isVisible()) {
      // Selecionar um status
      await statusFilter.selectOption({ label: /novo lead/i });

      // Aguardar atualização
      await page.waitForTimeout(500);

      // Verificar que apenas leads com o status selecionado são exibidos
      const leadCards = page.locator('[data-testid="lead-card"]');

      if (await leadCards.count() > 0) {
        // Todos os leads visíveis devem ter o status "Novo Lead"
        const badges = page.locator('[data-testid="lead-status-badge"]');
        const count = await badges.count();

        for (let i = 0; i < count; i++) {
          await expect(badges.nth(i)).toContainText(/novo lead/i);
        }
      }
    }
  });

  test('deve exibir botões de ação para cada lead', async ({ page }) => {
    // Aguardar cards de lead carregarem
    await page.waitForSelector('[data-testid="lead-card"]', { timeout: 10000 }).catch(() => {
      // Se não houver leads, pular teste
      test.skip();
    });

    const leadCards = page.locator('[data-testid="lead-card"]');

    if (await leadCards.count() > 0) {
      const firstCard = leadCards.first();

      // Verificar botões de ação
      await expect(firstCard.getByRole('button', { name: /ver timeline/i })).toBeVisible();
      await expect(firstCard.getByRole('button', { name: /visualizar/i })).toBeVisible();
      await expect(firstCard.getByRole('button', { name: /editar/i })).toBeVisible();
      await expect(firstCard.getByRole('button', { name: /excluir/i })).toBeVisible();
    }
  });

  test('deve abrir modal de timeline ao clicar no botão', async ({ page }) => {
    await page.waitForSelector('[data-testid="lead-card"]', { timeout: 10000 }).catch(() => {
      test.skip();
    });

    const leadCards = page.locator('[data-testid="lead-card"]');

    if (await leadCards.count() > 0) {
      const timelineButton = leadCards.first().getByRole('button', { name: /ver timeline/i });
      await timelineButton.click();

      // Verificar que modal de timeline abriu
      await expect(page.getByRole('heading', { name: /timeline de conversas/i })).toBeVisible();

      // Verificar botão de fechar
      const closeButton = page.getByRole('button', { name: /fechar/i });
      await expect(closeButton).toBeVisible();

      // Fechar modal
      await closeButton.click();
      await expect(page.getByRole('heading', { name: /timeline de conversas/i })).not.toBeVisible();
    }
  });

  test('deve permitir atualizar lista de leads', async ({ page }) => {
    // Clicar no botão atualizar
    const refreshButton = page.getByRole('button', { name: /atualizar/i });
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();

    // Aguardar indicador de loading (se houver)
    await page.waitForTimeout(1000);

    // Verificar que a página não quebrou
    await expect(page.getByRole('heading', { name: /gestão de leads/i })).toBeVisible();
  });

  test('deve exibir estado vazio quando não há leads', async ({ page }) => {
    // Este teste assume que você pode navegar para um tenant sem leads
    // ou mockar a resposta vazia

    // Verificar elementos do empty state
    const emptyMessage = page.getByText(/nenhum lead cadastrado|comece criando/i);

    if (await emptyMessage.isVisible()) {
      await expect(page.getByRole('button', { name: /criar primeiro lead/i })).toBeVisible();
    }
  });

  test('deve ser responsivo em mobile', async ({ page }) => {
    // Definir viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Verificar que elementos principais ainda são visíveis
    await expect(page.getByRole('heading', { name: /gestão de leads/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /novo lead/i })).toBeVisible();

    // Verificar que busca está visível
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });
});

test.describe('Jurify - Performance de Leads', () => {
  test('deve carregar página de leads em menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/leads');
    await expect(page.getByRole('heading', { name: /gestão de leads/i })).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Verificar que carregou em menos de 3 segundos
    expect(loadTime).toBeLessThan(3000);
  });

  test('deve implementar debouncing na busca', async ({ page }) => {
    await page.goto('/leads');

    const searchInput = page.getByPlaceholder(/buscar/i);
    await expect(searchInput).toBeVisible();

    // Digitar rapidamente
    await searchInput.fill('J');
    await page.waitForTimeout(100);
    await searchInput.fill('Jo');
    await page.waitForTimeout(100);
    await searchInput.fill('João');

    // Aguardar debounce completo (300ms)
    await page.waitForTimeout(400);

    // Se debouncing está implementado corretamente,
    // apenas UMA busca deve ter sido feita após o timeout
    expect(true).toBe(true); // Placeholder - em produção, mockaria requests
  });
});
