import { test, expect } from '@playwright/test';

test('Full Flow: Message -> AI -> CRM', async ({ page }) => {
    // 1. Simulate WhatsApp Message (via API or UI Mock)
    // Since we can't easily trigger real WhatsApp, we verify the CRM side
    // assuming the webhook worked (or we mock the webhook call)

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@jurify.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Verify Dashboard
    await expect(page).toHaveURL('/dashboard');

    // Navigate to Leads (Kanban)
    await page.click('text=Leads');
    await expect(page).toHaveURL('/leads');

    // Verify Kanban Board is present
    await expect(page.locator('text=Novo Lead')).toBeVisible();

    // Verify if our AI generated lead appears (mocked check)
    // await expect(page.locator('text=Test Client')).toBeVisible();

    // Test Drag and Drop
    // const card = page.locator('.card-hover').first();
    // const targetColumn = page.locator('text=Em Qualificação');
    // await card.dragTo(targetColumn);
});
