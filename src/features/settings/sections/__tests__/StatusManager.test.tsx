import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const { mockStages, mockIsLoading } = vi.hoisted(() => ({
  mockStages: { current: [] as ReturnType<typeof makeMockStage>[] },
  mockIsLoading: { current: false },
}));

function makeMockStage(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  auto_followup_days: number | null;
}> = {}) {
  return {
    id: overrides.id ?? 'stage-1',
    tenant_id: 't1',
    name: overrides.name ?? 'Recepção',
    slug: overrides.slug ?? 'recepcao',
    color: overrides.color ?? '#3B82F6',
    position: overrides.position ?? 0,
    is_won: overrides.is_won ?? false,
    is_lost: overrides.is_lost ?? false,
    auto_followup_days: overrides.auto_followup_days ?? null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

vi.mock('@/hooks/useStatusManager', () => ({
  useStatusManager: () => ({
    stages: mockStages.current,
    leadCounts: new Map<string, number>(),
    isLoading: mockIsLoading.current,
    createStage: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    updateStage: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    deleteStage: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, variables: null },
    reorderStages: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock StatusFormDialog to isolate StatusManager tests
vi.mock('../StatusFormDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open
      ? React.createElement('div', { 'data-testid': 'status-form-dialog' }, 'StatusFormDialog')
      : null,
}));

import StatusManager from '../StatusManager';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('StatusManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStages.current = [];
    mockIsLoading.current = false;
  });

  it('renders stage list from hook data', () => {
    mockStages.current = [
      makeMockStage({ id: 's1', name: 'Recepção', slug: 'recepcao' }),
      makeMockStage({ id: 's2', name: 'Análise', slug: 'analise' }),
      makeMockStage({ id: 's3', name: 'Qualificado', slug: 'qualificado' }),
    ];
    render(<StatusManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Recepção')).toBeInTheDocument();
    expect(screen.getByText('Análise')).toBeInTheDocument();
    expect(screen.getByText('Qualificado')).toBeInTheDocument();
  });

  it('shows empty state when no stages', () => {
    mockStages.current = [];
    render(<StatusManager />, { wrapper: createWrapper() });

    expect(
      screen.getByText('Nenhum status configurado. Clique em "Criar Status" para começar.')
    ).toBeInTheDocument();
  });

  it('search filters stages by name', () => {
    mockStages.current = [
      makeMockStage({ id: 's1', name: 'Recepção', slug: 'recepcao' }),
      makeMockStage({ id: 's2', name: 'Análise', slug: 'analise' }),
      makeMockStage({ id: 's3', name: 'Qualificado', slug: 'qualificado' }),
    ];
    render(<StatusManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Recepção')).toBeInTheDocument();
    expect(screen.getByText('Análise')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Pesquisar status...'), {
      target: { value: 'Análise' },
    });

    expect(screen.queryByText('Recepção')).not.toBeInTheDocument();
    expect(screen.getByText('Análise')).toBeInTheDocument();
    expect(screen.queryByText('Qualificado')).not.toBeInTheDocument();
  });
});
