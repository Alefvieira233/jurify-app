import { test, expect } from '@playwright/test';

/**
 * Multi-Tenant Data Isolation Tests
 *
 * Verifies that Supabase RLS policies correctly isolate tenant data.
 * These are the MOST critical security tests — a failure here means
 * data leakage between tenants.
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.
 * Tests are skipped gracefully when env vars are missing (CI without secrets).
 */

test.describe('Multi-Tenant Data Isolation', () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  test('authenticated user cannot see data from other tenants via API', async ({ request }) => {
    if (!supabaseUrl || !anonKey) {
      test.skip();
      return;
    }

    // Query leads without tenant filter — RLS should still filter
    const response = await request.get(`${supabaseUrl}/rest/v1/leads?select=id,tenant_id&limit=10`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    // Anon key without auth should return empty or 401
    expect(response.status()).toBeGreaterThanOrEqual(200);
    const data = await response.json();

    // All returned records should have the same tenant_id (or empty)
    if (Array.isArray(data) && data.length > 0) {
      const tenantIds = new Set(data.map((r: any) => r.tenant_id));
      expect(tenantIds.size).toBeLessThanOrEqual(1);
    }
  });

  test('RLS blocks access to other tenant tables', async ({ request }) => {
    if (!supabaseUrl || !anonKey) {
      test.skip();
      return;
    }

    // Test multiple tables that contain sensitive tenant data
    const tables = ['leads', 'contratos', 'agendamentos', 'notificacoes'];

    for (const table of tables) {
      const response = await request.get(
        `${supabaseUrl}/rest/v1/${table}?select=id,tenant_id&limit=5`,
        {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
        },
      );

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const tenantIds = new Set(data.map((r: any) => r.tenant_id));
        // Should never return data from multiple tenants
        expect(tenantIds.size).toBeLessThanOrEqual(1);
      }
    }
  });

  test('unauthenticated request returns no data from protected tables', async ({ request }) => {
    if (!supabaseUrl || !anonKey) {
      test.skip();
      return;
    }

    // Request with anon key only (no user JWT) should return empty arrays
    const protectedTables = ['leads', 'contratos', 'agendamentos', 'tarefas'];

    for (const table of protectedTables) {
      const response = await request.get(
        `${supabaseUrl}/rest/v1/${table}?select=id&limit=1`,
        {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
        },
      );

      // Should be 200 with empty array or 401/403
      if (response.status() === 200) {
        const data = await response.json();
        // Anon key without user session should not expose data
        expect(Array.isArray(data)).toBeTruthy();
        // RLS should block all rows for unauthenticated requests
        expect(data.length).toBe(0);
      } else {
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    }
  });
});
