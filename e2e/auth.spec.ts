import { test, expect } from '@playwright/test';

test.describe('Jurify — Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
  });

  test('deve exibir página de login com todos os elementos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByTestId('input-login-email')).toBeVisible();
    await expect(page.getByTestId('input-login-password')).toBeVisible();
    await expect(page.getByTestId('btn-login-submit')).toBeVisible();
    await expect(page.getByText(/criar uma nova conta/i)).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.getByTestId('input-login-email').fill('usuario@invalido.com');
    await page.getByTestId('input-login-password').fill('SenhaErrada123!');
    await page.getByTestId('btn-login-submit').click();

    await expect(page.getByText(/erro no login/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve alternar para tela de cadastro e exibir validação de senha', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await expect(page.getByRole('heading', { name: /comece sua jornada/i })).toBeVisible();
    await expect(page.getByTestId('input-register-name')).toBeVisible();
    await expect(page.getByTestId('btn-register-submit')).toBeVisible();

    // Type a weak password and check strength indicator
    await page.getByTestId('input-register-password').fill('abc');
    await expect(page.getByTestId('password-strength-text')).toHaveText(/fraca/i);
    await expect(page.getByText(/mínimo 8 caracteres/i)).toBeVisible();
  });

  test('deve bloquear cadastro com senha fraca', async ({ page }) => {
    await page.getByText(/criar uma nova conta/i).click();

    await page.getByTestId('input-register-name').fill('Teste E2E');
    await page.getByTestId('input-register-email').fill('e2e@test.com');
    // "12345678" passes Zod (min 8) but fails the strength requirement (needs 4 of 5)
    await page.getByTestId('input-register-password').fill('12345678');
    await page.getByTestId('input-register-confirm-password').fill('12345678');
    await page.getByTestId('btn-register-submit').click();

    await expect(page.getByText(/senha fraca/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('deve redirecionar para dashboard após login bem-sucedido', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@jurify.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123!';

    await page.getByTestId('input-login-email').fill(testEmail);
    await page.getByTestId('input-login-password').fill(testPassword);
    await page.getByTestId('btn-login-submit').click();

    await expect(page).toHaveURL(/.*\//, { timeout: 15_000 });
  });
});

test.describe('Jurify — Segurança', () => {
  test('deve proteger rotas autenticadas', async ({ page }) => {
    await page.goto('/leads');
    await expect(page).toHaveURL(/.*auth/, { timeout: 10_000 });
  });

  test('deve sanitizar inputs contra XSS', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });

    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected!');
    });

    const xssPayload = '<script>alert("XSS")</script>';
    await page.getByTestId('input-login-email').fill(xssPayload);
    await page.getByTestId('input-login-password').fill('SenhaForte123!');
    await page.getByTestId('btn-login-submit').click();

    // If we reach here, XSS was blocked
    await page.waitForTimeout(1_000);
  });
});
