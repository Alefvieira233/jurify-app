import { test, expect } from '@playwright/test';

test.describe('Jurify — Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
  });

  test('deve exibir página de login com todos os elementos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /acessar plataforma/i })).toBeVisible();
    await expect(page.getByText(/criar uma nova conta/i)).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.getByTestId('email-input').fill('usuario@invalido.com');
    await page.getByTestId('password-input').fill('SenhaErrada123!');
    await page.getByRole('button', { name: /acessar plataforma/i }).click();

    await expect(page.getByText(/erro no login/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve alternar para tela de cadastro e exibir validação de senha', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await expect(page.getByRole('heading', { name: /comece sua jornada/i })).toBeVisible();
    await expect(page.getByTestId('name-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /começar agora/i })).toBeVisible();

    // Type a weak password and check strength indicator
    await page.getByTestId('password-input').fill('abc');
    await expect(page.getByText(/fraca/i).first()).toBeVisible();
  });

  test('deve bloquear cadastro com senha fraca', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await page.getByTestId('name-input').fill('Teste E2E');
    await page.getByTestId('email-input').fill('e2e@test.com');
    await page.getByTestId('password-input').fill('fraca');
    await page.getByTestId('confirm-password-input').fill('fraca');
    await page.getByRole('button', { name: /começar agora/i }).click();

    // Wait for validation to trigger
    await expect(page.getByText(/mínimo 8 caracteres/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('deve redirecionar para dashboard após login bem-sucedido', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

    await page.getByTestId('email-input').fill(testEmail);
    await page.getByTestId('password-input').fill(testPassword);
    await page.getByRole('button', { name: /acessar plataforma/i }).click();

    await expect(page).toHaveURL(/.*\//, { timeout: 15_000 });
  });
});
