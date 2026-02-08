import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeads } from '../useLeads';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [
            {
              id: '1',
              nome_completo: 'João Silva',
              email: 'joao@test.com',
              telefone: '11999999999',
              area_juridica: 'Civil',
              status: 'novo_lead',
              origem: 'Website',
              responsavel: 'Maria',
              created_at: '2025-01-01T00:00:00Z'
            },
            {
              id: '2',
              nome_completo: 'Maria Santos',
              email: 'maria@test.com',
              telefone: '11888888888',
              area_juridica: 'Trabalhista',
              status: 'em_qualificacao',
              origem: 'Indicação',
              responsavel: 'João',
              created_at: '2025-01-02T00:00:00Z'
            }
          ],
          error: null
        }))
      }))
    }))
  }
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com' }
  })
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// TODO: Refatorar mocks para compatibilidade com useLeads atual (useAuth + useSupabaseQuery)
describe.skip('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch leads on mount', async () => {
    const { result } = renderHook(() => useLeads());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have loaded 2 leads
    expect(result.current.leads).toHaveLength(2);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have correct lead data structure', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstLead = result.current.leads[0];

    expect(firstLead).toHaveProperty('id');
    expect(firstLead).toHaveProperty('nome_completo');
    expect(firstLead).toHaveProperty('email');
    expect(firstLead).toHaveProperty('telefone');
    expect(firstLead).toHaveProperty('area_juridica');
    expect(firstLead).toHaveProperty('status');
    expect(firstLead).toHaveProperty('origem');
    expect(firstLead).toHaveProperty('responsavel');
  });

  it('should provide createLead function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.createLead).toBe('function');
  });

  it('should provide updateLead function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.updateLead).toBe('function');
  });

  it('should provide fetchLeads function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.fetchLeads).toBe('function');
  });
});
