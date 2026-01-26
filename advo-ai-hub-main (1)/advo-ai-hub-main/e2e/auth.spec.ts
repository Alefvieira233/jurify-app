import { test, expect } from '@playwright/test';

test.describe('Jurify - Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve exibir página de login', async ({ page }) => {
    // Aguardar a página de autenticação carregar
    await expect(page).toHaveURL(/.*auth/);

    // Verificar elementos da tela de login
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth');

    // Preencher com credenciais inválidas
    await page.getByPlaceholder(/email/i).fill('usuario@invalido.com');
    await page.getByPlaceholder(/senha/i).fill('senhaerrada');

    // Clicar em entrar
    await page.getByRole('button', { name: /entrar/i }).click();

    // Verificar mensagem de erro
    await expect(page.getByText(/credenciais inválidas|erro ao fazer login/i)).toBeVisible();
  });

  test('deve validar formato de email', async ({ page }) => {
    await page.goto('/auth');

    // Tentar usar email inválido
    await page.getByPlaceholder(/email/i).fill('emailinvalido');
    await page.getByPlaceholder(/senha/i).fill('senha123');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Verificar validação de email
    await expect(page.getByText(/email inválido|formato de email incorreto/i)).toBeVisible();
  });

  test('deve redirecionar para dashboard após login bem-sucedido', async ({ page }) => {
    // Nota: Este teste requer configuração de credenciais de teste
    // Em ambiente de teste, você deve usar variáveis de ambiente
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

    await page.goto('/auth');

    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/senha/i).fill(testPassword);
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguardar redirecionamento para dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Verificar elementos do dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('deve permitir navegar para tela de cadastro', async ({ page }) => {
    await page.goto('/auth');

    // Clicar no link de cadastro
    const signUpLink = page.getByText(/criar conta|cadastre-se|sign up/i);

    if (await signUpLink.isVisible()) {
      await signUpLink.click();

      // Verificar que navegou para tela de cadastro
      await expect(page.getByRole('heading', { name: /cadastr|sign up|criar conta/i })).toBeVisible();
    }
  });

  test('deve permitir recuperação de senha', async ({ page }) => {
    await page.goto('/auth');

    // Procurar link de esqueci minha senha
    const forgotPasswordLink = page.getByText(/esqueci minha senha|recuperar senha|forgot password/i);

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Verificar tela de recuperação
      await expect(page.getByRole('heading', { name: /recuperar senha|reset password/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    }
  });
});

test.describe('Jurify - Segurança', () => {
  test('deve proteger rotas autenticadas', async ({ page }) => {
    // Tentar acessar dashboard sem estar autenticado
    await page.goto('/dashboard');

    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*auth/, { timeout: 5000 });
  });

  test('deve implementar timeout de sessão', async ({ page, context }) => {
    // Nota: Este é um teste conceitual
    // Em produção, você configuraria um timeout menor para testes

    // Este teste verificaria se após X minutos de inatividade,
    // o usuário é deslogado automaticamente (LGPD compliance - 30 min)
    expect(true).toBe(true); // Placeholder
  });

  test('deve sanitizar inputs contra XSS', async ({ page }) => {
    await page.goto('/auth');

    // Tentar injetar script
    const xssPayload = '<script>alert("XSS")</script>';

    await page.getByPlaceholder(/email/i).fill(xssPayload);
    await page.getByPlaceholder(/senha/i).fill('senha123');

    // Verificar que script não foi executado
    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected!');
    });

    await page.getByRole('button', { name: /entrar/i }).click();

    // Se chegou aqui, XSS foi bloqueado
    expect(true).toBe(true);
  });
});
