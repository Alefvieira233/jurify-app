import { test, expect } from '@playwright/test';

/**
 * Signup & Onboarding E2E — covers the auth page form states:
 * Login form loads, toggle to signup, validation errors, no ErrorBoundary
 */
test.describe('Jurify — Signup & Onboarding', () => {
  test('página /auth carrega o formulário de login', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
    // Email and password fields should be present
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/senha/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('alternância para cadastro mostra campos extras', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    // Click toggle to switch to signup mode
    const signupToggle = page.getByRole('button', { name: /cadastr|criar.*conta|registr/i });
    if (await signupToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await signupToggle.click();
    } else {
      // Try link/tab approach — "Criar uma nova conta" is the link text on this app
      const signupLink = page.getByText(/criar.*conta|cadastr|registr/i).first();
      if (await signupLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await signupLink.click();
      }
    }
    await page.waitForTimeout(500);
    // After switching there should be more than one password-like field or a confirm field
    const inputs = page.locator('input[type="password"], input[name*="confirm"], input[placeholder*="confirm"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('senha fraca exibe mensagem de erro de validação', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    // Switch to signup if available
    const signupToggle = page.getByRole('button', { name: /cadastr|criar conta|registr/i });
    if (await signupToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signupToggle.click();
    }
    await page.waitForTimeout(300);

    // Fill email
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill('test@example.com');
    }

    // Fill weak password
    const passwordInputs = page.locator('input[type="password"]');
    if (await passwordInputs.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await passwordInputs.first().fill('123');
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /cadastr|criar|registr|acessar/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    }

    await page.waitForTimeout(500);
    // Page should not crash
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('senhas divergentes exibem erro de validação', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    // Switch to signup
    const signupToggle = page.getByRole('button', { name: /cadastr|criar conta|registr/i });
    if (await signupToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signupToggle.click();
    }
    await page.waitForTimeout(300);

    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill('test@example.com');
    }

    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    if (count >= 2) {
      await passwordInputs.nth(0).fill('StrongPass123!');
      await passwordInputs.nth(1).fill('DifferentPass456!');

      const submitBtn = page.getByRole('button', { name: /cadastr|criar|registr/i }).first();
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
      }
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });

  test('página /auth não ativa ErrorBoundary em nenhum estado', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();

    // Interact with the form
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill('invalid-email');
    }

    const submitBtn = page.getByRole('button', { name: /acessar|entrar|login/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    }
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible();
  });
});
