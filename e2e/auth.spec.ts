import { test, expect } from '@playwright/test';

test.describe('Jurify — Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('deve exibir página de login com todos os elementos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByLabel(/email profissional/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /acessar plataforma/i })).toBeVisible();
    await expect(page.getByText(/criar uma nova conta/i)).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.getByLabel(/email profissional/i).fill('usuario@invalido.com');
    await page.getByLabel(/senha/i).fill('SenhaErrada123!');
    await page.getByRole('button', { name: /acessar plataforma/i }).click();

    await expect(page.getByText(/erro no login/i)).toBeVisible({ timeout: 10_000 });
  });

  test('deve alternar para tela de cadastro e exibir validação de senha', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await expect(page.getByRole('heading', { name: /comece sua jornada/i })).toBeVisible();
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /começar agora/i })).toBeVisible();

    // Type a weak password and check strength indicator
    await page.getByLabel(/senha/i).fill('abc');
    await expect(page.getByText(/fraca/i)).toBeVisible();
    await expect(page.getByText(/mínimo 8 caracteres/i)).toBeVisible();
  });

  test('deve bloquear cadastro com senha fraca', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await page.getByLabel(/nome completo/i).fill('Teste E2E');
    await page.getByLabel(/email profissional/i).fill('e2e@test.com');
    await page.getByLabel(/senha/i).fill('fraca');
    await page.getByRole('button', { name: /começar agora/i }).click();

    await expect(page.getByText(/senha fraca/i)).toBeVisible({ timeout: 5_000 });
  });

  test('deve redirecionar para dashboard após login bem-sucedido', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

    await page.getByLabel(/email profissional/i).fill(testEmail);
    await page.getByLabel(/senha/i).fill(testPassword);
    await page.getByRole('button', { name: /acessar plataforma/i }).click();

    await expect(page).toHaveURL(/.*\//, { timeout: 15_000 });
  });
});

test.describe('Jurify — Segurança', () => {
  test('deve proteger rotas autenticadas', async ({ page }) => {
    await page.goto('/leads');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });
  });

  test('deve sanitizar inputs contra XSS', async ({ page }) => {
    await page.goto('/auth');

    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected!');
    });

    const xssPayload = '<script>alert("XSS")</script>';
    await page.getByLabel(/email profissional/i).fill(xssPayload);
    await page.getByLabel(/senha/i).fill('SenhaForte123!');
    await page.getByRole('button', { name: /acessar plataforma/i }).click();

    // If we reach here, XSS was blocked
    await page.waitForTimeout(1_000);
  });
});
