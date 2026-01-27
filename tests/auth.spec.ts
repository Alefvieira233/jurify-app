
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit without filling fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.text-red-500')).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await page.goto('/auth');
    
    // Should start with login
    await expect(page.locator('text=Entrar')).toBeVisible();
    
    // Toggle to signup
    await page.click('text=Criar conta');
    await expect(page.locator('text=Criar Conta')).toBeVisible();
    
    // Toggle back to login
    await page.click('text=Já tem conta?');
    await expect(page.locator('text=Entrar')).toBeVisible();
  });

  test('should redirect authenticated users', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/auth');
    
    // Should redirect to main app
    await expect(page).toHaveURL('/');
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to auth page
    await expect(page).toHaveURL('/auth');
  });

  test('should allow authenticated users to access dashboard', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@test.com' }
      }));
    });
    
    await page.goto('/');
    
    // Should show dashboard
    await expect(page.locator('text=Dashboard Comercial')).toBeVisible();
  });
});

test.describe('Role-Based Access', () => {
  test('should show access denied for restricted sections', async ({ page }) => {
    // Mock user with limited permissions
    await page.addInitScript(() => {
      window.mockUserRole = 'suporte';
    });
    
    await page.goto('/?tab=usuarios');
    
    await expect(page.locator('text=Acesso Negado')).toBeVisible();
  });

  test('should allow admin access to all sections', async ({ page }) => {
    // Mock admin user
    await page.addInitScript(() => {
      window.mockUserRole = 'administrador';
    });
    
    await page.goto('/?tab=configuracoes');
    
    await expect(page.locator('text=Configurações Gerais')).toBeVisible();
  });
});
