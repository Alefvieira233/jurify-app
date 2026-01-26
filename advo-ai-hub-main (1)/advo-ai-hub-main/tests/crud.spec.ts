
import { test, expect } from '@playwright/test';

test.describe('Leads CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@test.com' }
      }));
      window.mockUserRole = 'administrador';
    });
    
    await page.goto('/?tab=leads');
  });

  test('should display leads list', async ({ page }) => {
    await expect(page.locator('[data-testid="leads-list"]')).toBeVisible();
    await expect(page.locator('text=Gestão de Leads')).toBeVisible();
  });

  test('should open new lead form', async ({ page }) => {
    await page.click('[data-testid="new-lead-button"]');
    await expect(page.locator('[data-testid="lead-form"]')).toBeVisible();
  });

  test('should validate lead form fields', async ({ page }) => {
    await page.click('[data-testid="new-lead-button"]');
    
    // Try to submit without required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.text-red-500')).toBeVisible();
  });

  test('should create new lead', async ({ page }) => {
    await page.click('[data-testid="new-lead-button"]');
    
    // Fill form
    await page.fill('input[name="nome_completo"]', 'João Silva');
    await page.fill('input[name="email"]', 'joao@example.com');
    await page.fill('input[name="telefone"]', '11999999999');
    await page.selectOption('select[name="area_juridica"]', 'Direito Civil');
    await page.selectOption('select[name="origem"]', 'Website');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Lead criado com sucesso')).toBeVisible();
  });
});

test.describe('Contracts CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@test.com' }
      }));
      window.mockUserRole = 'administrador';
    });
    
    await page.goto('/?tab=contratos');
  });

  test('should display contracts list', async ({ page }) => {
    await expect(page.locator('text=Gestão de Contratos')).toBeVisible();
  });

  test('should create new contract', async ({ page }) => {
    await page.click('[data-testid="new-contract-button"]');
    
    // Fill contract form
    await page.fill('input[name="nome_cliente"]', 'Maria Santos');
    await page.fill('input[name="valor_causa"]', '15000');
    await page.selectOption('select[name="area_juridica"]', 'Direito Trabalhista');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Contrato criado com sucesso')).toBeVisible();
  });
});

test.describe('Agendamentos CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@test.com' }
      }));
      window.mockUserRole = 'administrador';
    });
    
    await page.goto('/?tab=agendamentos');
  });

  test('should display appointments calendar', async ({ page }) => {
    await expect(page.locator('text=Agendamentos')).toBeVisible();
  });

  test('should create new appointment', async ({ page }) => {
    await page.click('[data-testid="new-appointment-button"]');
    
    // Fill appointment form
    await page.fill('input[name="data_hora"]', '2024-12-20T10:00');
    await page.fill('input[name="responsavel"]', 'Dr. João');
    await page.selectOption('select[name="area_juridica"]', 'Direito Civil');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible();
  });
});

test.describe('AI Agents CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@test.com' }
      }));
      window.mockUserRole = 'administrador';
    });
    
    await page.goto('/?tab=agentes');
  });

  test('should display agents list', async ({ page }) => {
    await expect(page.locator('text=Agentes de IA')).toBeVisible();
  });

  test('should create new agent', async ({ page }) => {
    await page.click('[data-testid="new-agent-button"]');
    
    // Fill agent form
    await page.fill('input[name="nome"]', 'Agente Direito Civil');
    await page.fill('textarea[name="descricao_funcao"]', 'Especialista em direito civil');
    await page.selectOption('select[name="area_juridica"]', 'Direito Civil');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Agente criado com sucesso')).toBeVisible();
  });

  test('should test agent execution', async ({ page }) => {
    // Assume there's at least one agent
    await page.click('[data-testid="test-agent-button"]:first-child');
    
    // Fill test input
    await page.fill('textarea[name="input"]', 'Teste de execução do agente');
    await page.fill('input[name="api_key"]', 'test-api-key');
    
    await page.click('button:has-text("Executar")');
    
    // Should show execution result
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible();
  });
});
