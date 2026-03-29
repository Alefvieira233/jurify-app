import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * LíderHub Smoke — Phase 7 final integration gate.
 * Verifies every route wired in Phases 2-6 renders without an ErrorBoundary crash.
 * Does NOT assert data (data depends on tenant seed); asserts the page loads.
 */

const LIDERHUB_ROUTES = [
  { path: '/',                  label: 'Home'             },
  { path: '/dashboard',         label: 'Dashboard'        },
  { path: '/conexoes',          label: 'Conexões'         },
  { path: '/crm',               label: 'Contatos'         },
  { path: '/pipeline',          label: 'Pipeline Kanban'  },
  { path: '/whatsapp',          label: 'WhatsApp IA'      },
  { path: '/tarefas',           label: 'Tarefas'          },
  { path: '/processos',         label: 'Processos'        },
  { path: '/prazos',            label: 'Prazos'           },
  { path: '/documentos',        label: 'Documentos'       },
  { path: '/relatorios',        label: 'Relatórios'       },
  { path: '/metricas',          label: 'Métricas'         },
  { path: '/agentes',           label: 'Agentes IA'       },
  { path: '/base-conhecimento', label: 'Base Conhecimento'},
  { path: '/suporte',           label: 'Suporte'          },
  { path: '/configuracoes',     label: 'Configurações'    },
  { path: '/notificacoes',      label: 'Notificações'     },
  { path: '/fluxos',            label: 'Fluxos'           },
  { path: '/regras',            label: 'Regras'           },
];

test.describe('LíderHub — Route Smoke Tests', () => {
  // Shared login: run once, reuse storage state
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of LIDERHUB_ROUTES) {
    test(`${route.label} (${route.path}) — renders without ErrorBoundary`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await expect(page.getByText(/algo deu errado|error boundary/i)).not.toBeVisible({ timeout: 15_000 });
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }
});

test.describe('LíderHub — Sidebar Navigation', () => {
  test('sidebar renders Jurídico section', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    // The Jurídico section button should be visible in the sidebar
    const sidebar = page.locator('nav[aria-label="Menu principal"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
    await expect(sidebar.getByText('Jurídico')).toBeVisible({ timeout: 5_000 });
  });

  test('sidebar Jurídico section expands to show Processos', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    const sidebar = page.locator('nav[aria-label="Menu principal"]');
    const juridicoBtn = sidebar.getByText('Jurídico');
    await expect(juridicoBtn).toBeVisible({ timeout: 10_000 });
    await juridicoBtn.click();
    await expect(sidebar.getByText('Processos')).toBeVisible({ timeout: 3_000 });
    await expect(sidebar.getByText('Prazos')).toBeVisible({ timeout: 3_000 });
    await expect(sidebar.getByText('Documentos')).toBeVisible({ timeout: 3_000 });
  });

  test('sidebar Relatórios section expands to show Métricas', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    const sidebar = page.locator('nav[aria-label="Menu principal"]');
    const relBtn = sidebar.getByText('Relatórios').first();
    await expect(relBtn).toBeVisible({ timeout: 10_000 });
    await relBtn.click();
    await expect(sidebar.getByText('Métricas')).toBeVisible({ timeout: 3_000 });
  });
});
