import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      action ? React.createElement('button', { 'data-testid': 'empty-action', onClick: action.onClick }, action.label) : null,
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' }, title),
}));

// Mock supabase for useQuery inside FluxosManager
const { mockSupabase } = vi.hoisted(() => {
  const mockFn = () => ({
    noop: true,
  });
  const supabase = {
    from: mockFn as any,
  };
  return { mockSupabase: supabase };
});

// Initialize the actual mock implementation
mockSupabase.from = vi.fn(() => ({
  select: vi.fn(() => ({
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  delete: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: mockSupabase,
}));

// We need to mock the FlowEditor lazy import
vi.mock('../FlowEditor', () => ({
  FlowEditor: () => React.createElement('div', { 'data-testid': 'flow-editor' }, 'FlowEditor'),
  default: () => React.createElement('div', { 'data-testid': 'flow-editor' }, 'FlowEditor'),
}));

import { FluxosManager } from '../FluxosManager';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('FluxosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header and Novo Fluxo button', async () => {
    // Default mock returns empty data which triggers empty state after loading
    render(<FluxosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Fluxos de Automação')).toBeInTheDocument();
    expect(screen.getByText('Novo Fluxo')).toBeInTheDocument();
  });

  it('shows empty state when no flows exist', async () => {
    render(<FluxosManager />, { wrapper: createWrapper() });

    // Wait for query to resolve (empty data)
    const emptyState = await screen.findByTestId('empty-state');
    expect(emptyState).toHaveTextContent('Nenhum fluxo de automação');
  });

  it('shows loading skeletons while fetching', () => {
    // Override mock to never resolve (keeps isLoading=true)
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => new Promise(() => {})), // never resolves
      })),
    });

    const { container } = render(<FluxosManager />, { wrapper: createWrapper() });

    // Skeleton elements should be visible
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders flow cards when flows exist', async () => {
    const mockFlows = [
      {
        id: 'flow-1',
        tenant_id: 'tenant-1',
        nome: 'Follow-up Automatico',
        descricao: 'Envia follow-up apos 3 dias',
        status: 'ativo',
        trigger_type: 'novo',
        trigger_config: {},
        viewport: { x: 0, y: 0, zoom: 1 },
        execucoes_total: 42,
        ultima_execucao: '2026-04-01T10:00:00Z',
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockFlows, error: null })),
      })),
    });

    render(<FluxosManager />, { wrapper: createWrapper() });

    const flowName = await screen.findByText('Follow-up Automatico');
    expect(flowName).toBeInTheDocument();

    expect(screen.getByText('42 execuções')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });
});
