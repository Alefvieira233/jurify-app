import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// --- Mock data ---
const mockLeads = [
  {
    id: 'l1', nome_completo: 'João Silva', email: 'joao@test.com', telefone: '11999999999',
    area_juridica: 'Civil', status: 'novo_lead', origem: 'Website', responsavel: 'Maria',
    valor_causa: 50000, created_at: '2025-01-01T00:00:00Z', observacoes: null, metadata: {},
  },
  {
    id: 'l2', nome_completo: 'Ana Costa', email: 'ana@test.com', telefone: '11888888888',
    area_juridica: 'Trabalhista', status: 'em_qualificacao', origem: 'Indicação', responsavel: 'Pedro',
    valor_causa: 30000, created_at: '2025-01-02T00:00:00Z', observacoes: null, metadata: {},
  },
  {
    id: 'l3', nome_completo: 'Carlos Lima', email: 'carlos@test.com', telefone: '11777777777',
    area_juridica: 'Civil', status: 'proposta_enviada', origem: 'WhatsApp', responsavel: 'Maria',
    valor_causa: 100000, created_at: '2025-01-03T00:00:00Z', observacoes: null, metadata: {},
  },
];

const mockUpdateLead = vi.fn().mockResolvedValue(true);
const mockFetchLeads = vi.fn();

vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({
    leads: mockLeads,
    loading: false,
    error: null,
    isEmpty: false,
    updateLead: mockUpdateLead,
    fetchLeads: mockFetchLeads,
    createLead: vi.fn(),
    deleteLead: vi.fn(),
    currentPage: 1,
    totalPages: 1,
    pageSize: 50,
    goToPage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    hasNextPage: false,
    hasPrevPage: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@test.com' },
    profile: { id: 'u1', tenant_id: 't1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (v: string) => v,
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

// Mock NovoLeadForm to avoid complex form dependencies
vi.mock('@/components/forms/NovoLeadForm', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="novo-lead-form">Form</div> : null,
}));

import PipelineJuridico from '../PipelineJuridico';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('PipelineJuridico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with pipeline title', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getByText('Pipeline Jurídico')).toBeInTheDocument();
  });

  it('renders all 6 pipeline stages', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Captação').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Qualificação').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Proposta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contrato').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Execução').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Arquivados').length).toBeGreaterThanOrEqual(1);
  });

  it('renders lead names in the board', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
  });

  it('shows lead count in header', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getAllByText(/3 leads/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/buscar lead/i)).toBeInTheDocument();
  });

  it('filters leads by search term', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/buscar lead/i);
    fireEvent.change(input, { target: { value: 'João' } });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    // Other leads should be filtered out from pipeline (empty state or hidden)
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('shows Novo Lead button', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    expect(screen.getByText('Novo Lead')).toBeInTheDocument();
  });

  it('opens form modal when Novo Lead is clicked', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Novo Lead'));
    expect(screen.getByTestId('novo-lead-form')).toBeInTheDocument();
  });

  it('shows Sincronizar button that calls fetchLeads', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    const syncBtn = screen.getByText(/sincronizar/i);
    fireEvent.click(syncBtn);
    expect(mockFetchLeads).toHaveBeenCalled();
  });

  it('shows clear filters button when filter is active', () => {
    render(<PipelineJuridico />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/buscar lead/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });
});
