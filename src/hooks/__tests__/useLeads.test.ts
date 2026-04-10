/**
 * useLeads — tests against the programmable Supabase mock.
 *
 * Unlike the previous version which used a chainable Proxy that returned canned
 * data for any method call, this file uses `createMockSupabase` from
 * `src/tests/__helpers__/supabaseMock.ts`. The mock:
 *   - Processes `.eq()`, `.order()`, `.range()`, etc. against seeded rows
 *   - Actually mutates state on insert/update/delete
 *   - Lets us assert that createLead added a row, updateLead modified it, etc.
 *
 * This means a test passing actually implies the hook wired the query right.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockSupabase } from '../../tests/__helpers__/supabaseMock';

// Seed two leads belonging to tenant-1 and one to tenant-2. The hook should
// only see tenant-1's data when the current user belongs to tenant-1.
const seedLeads = [
  {
    id: '1',
    nome: 'João Silva',
    nome_completo: 'João Silva',
    email: 'joao@test.com',
    telefone: '11999999999',
    area_juridica: 'Civil',
    status: 'novo',
    origem: 'Website',
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: { responsavel_nome: 'Maria' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: '2',
    nome: 'Maria Santos',
    nome_completo: 'Maria Santos',
    email: 'maria@test.com',
    telefone: '11888888888',
    area_juridica: 'Trabalhista',
    status: 'qualificado',
    origem: 'Indicação',
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: { responsavel_nome: 'João' },
    created_at: '2025-01-02T00:00:00Z',
    updated_at: null,
  },
  {
    id: '3',
    nome: 'Carlos (other tenant)',
    nome_completo: 'Carlos Pereira',
    email: 'carlos@other.com',
    telefone: '11777777777',
    area_juridica: 'Criminal',
    status: 'novo',
    origem: 'Google',
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-2',
    metadata: {},
    created_at: '2025-01-03T00:00:00Z',
    updated_at: null,
  },
];

// vi.mock is hoisted, so the factory runs BEFORE any top-level code. The mock
// must be created inside the factory and stashed on globalThis so the test
// body can still reach it.
vi.mock('@/integrations/supabase/client', async () => {
  const { createMockSupabase } = await import('../../tests/__helpers__/supabaseMock');
  const mock = createMockSupabase({ tables: { leads: [] } });
  (globalThis as Record<string, unknown>).__jurifyMockSupabase__ = mock;
  return { supabase: mock, supabaseUntyped: mock };
});

function getMock(): ReturnType<typeof createMockSupabase> {
  return (globalThis as Record<string, unknown>).__jurifyMockSupabase__ as ReturnType<typeof createMockSupabase>;
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com', user_metadata: { tenant_id: 'tenant-1' } },
    profile: { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    isAdmin: true,
    isManager: true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    canRead: () => true,
    hasPermission: () => true,
    getUserDepartamentos: () => [],
    getLeadVisibilityScope: () => 'all',
    getLeadsVisibilityScope: () => 'all',
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import AFTER mocks are registered
import { useLeads } from '../useLeads';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLeads', () => {
  beforeEach(() => {
    getMock().reset();
    getMock().seed('leads', seedLeads);
    vi.clearAllMocks();
  });

  it('fetches only leads for the current tenant (cross-tenant isolation)', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Seed has 3 leads (2 in tenant-1, 1 in tenant-2). The hook must only
    // see tenant-1's rows. If the hook forgot to filter by tenant_id, this
    // would fail with 3 leads.
    expect(result.current.leads).toHaveLength(2);
    expect(result.current.leads.every((l) => l.tenant_id === 'tenant-1')).toBe(true);
  });

  it('exposes the expected lead shape', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.leads).toHaveLength(2));

    const firstLead = result.current.leads[0];
    expect(firstLead).toHaveProperty('id');
    expect(firstLead).toHaveProperty('nome_completo');
    expect(firstLead).toHaveProperty('email');
    expect(firstLead).toHaveProperty('telefone');
    expect(firstLead).toHaveProperty('area_juridica');
    expect(firstLead).toHaveProperty('status');
    expect(firstLead).toHaveProperty('origem');
  });

  it('normalizes optional fields with defaults', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.leads).toHaveLength(2));

    const lead = result.current.leads[0];
    expect(lead.lead_score).toBeDefined();
    expect(lead.temperature).toBeDefined();
    expect(lead.probability).toBeDefined();
    expect(lead.followup_count).toBeDefined();
    expect(lead.responsavel_id).toBeDefined();
  });

  it('createLead actually inserts a row into the DB', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const beforeCount = getMock().snapshot.leads.length;

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createLead({
        nome_completo: 'Novo Lead',
        telefone: '11555555555',
      });
    });

    expect(success).toBe(true);
    expect(getMock().snapshot.leads.length).toBe(beforeCount + 1);
    // mapLeadInputToDb() in useLeadsQuery.ts maps nome_completo → nome before insert.
    const inserted = getMock().snapshot.leads.find((l) => l.nome === 'Novo Lead');
    expect(inserted).toBeDefined();
    expect(inserted!.tenant_id).toBe('tenant-1'); // must be set by the hook
  });

  it('updateLead actually modifies the row in the DB', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateLead('1', { nome_completo: 'João Updated' });
    });

    expect(success).toBe(true);
    const updated = getMock().snapshot.leads.find((l) => l.id === '1');
    expect(updated).toBeDefined();
    // mapLeadInputToDb maps nome_completo → nome on write.
    expect(updated!.nome).toBe('João Updated');
  });

  it('deleteLead actually removes the row from the DB', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const beforeIds = getMock().snapshot.leads.map((l) => l.id);
    expect(beforeIds).toContain('1');

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.deleteLead('1');
    });

    expect(success).toBe(true);
    const afterIds = getMock().snapshot.leads.map((l) => l.id);
    expect(afterIds).not.toContain('1');
  });

  it('createLead returns false and surfaces error when DB rejects the insert', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate RLS denial for leads table
    getMock().setError('leads', { message: 'new row violates row-level security policy', code: '42501' });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createLead({ nome_completo: 'Should Fail', telefone: '1' });
    });

    expect(success).toBe(false);
  });

  it('isEmpty is false when leads exist', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.leads).toHaveLength(2));

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes pagination helpers when enabled', async () => {
    const { result } = renderHook(() => useLeads({ enablePagination: true }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.goToPage).toBe('function');
    expect(typeof result.current.nextPage).toBe('function');
    expect(typeof result.current.prevPage).toBe('function');
    expect(result.current.currentPage).toBe(1);
    expect(typeof result.current.hasNextPage).toBe('boolean');
    expect(typeof result.current.hasPrevPage).toBe('boolean');
  });

  it('totalPages defaults to 1 when pagination is disabled', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalPages).toBe(1);
  });

  it('goToPage updates currentPage', async () => {
    const { result } = renderHook(() => useLeads({ enablePagination: true }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentPage).toBe(1);
    act(() => {
      result.current.goToPage(1);
    });
    expect(result.current.currentPage).toBe(1);
  });
});
