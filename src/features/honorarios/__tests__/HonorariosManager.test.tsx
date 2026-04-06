import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockUseHonorarios = vi.fn();
vi.mock('@/hooks/useHonorarios', () => ({
  useHonorarios: () => mockUseHonorarios(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: () => ({
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ eq: () => ({ data: null, error: null }) }) }),
    }),
  },
}));

vi.mock('./components/NovoHonorarioForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'novo-honorario-form' }, 'Form'),
}));

vi.mock('@/schemas/honorarioSchema', () => ({
  HONORARIO_STATUS_LABELS: {
    pendente: 'Pendente',
    pago: 'Pago',
    inadimplente: 'Inadimplente',
    cancelado: 'Cancelado',
  },
}));

vi.mock('@/constants/statusConfig', () => ({
  getStatusClasses: () => '',
}));

import HonorariosManager from '../HonorariosManager';

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

const baseHonorariosReturn = {
  honorarios: [],
  totalRecebido: 0,
  totalAcordado: 0,
  totalCount: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  loading: false,
  error: null,
  isEmpty: true,
  fetchHonorarios: vi.fn(),
  createHonorario: vi.fn(),
  updateHonorario: vi.fn(),
};

describe('HonorariosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: { tenant_id: 'tenant-1' } });
    mockUseRBAC.mockReturnValue({ can: () => true });
  });

  it('renders empty state when no honorarios exist', () => {
    mockUseHonorarios.mockReturnValue({ ...baseHonorariosReturn });

    render(<HonorariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhum Honorario')).toBeInTheDocument();
  });

  it('renders honorario cards when data exists', () => {
    const mockData = [
      {
        id: 'hon-1',
        tipo: 'fixo',
        status: 'pendente',
        valor_total_acordado: 10000,
        valor_recebido: 5000,
        data_vencimento: '2026-05-01',
        observacoes: 'Contrato mensal',
        overdue: false,
        tenant_id: 'tenant-1',
      },
      {
        id: 'hon-2',
        tipo: 'hora',
        status: 'pago',
        valor_total_acordado: 3000,
        valor_recebido: 3000,
        data_vencimento: null,
        observacoes: null,
        overdue: false,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseHonorarios.mockReturnValue({
      ...baseHonorariosReturn,
      honorarios: mockData,
      isEmpty: false,
      totalRecebido: 8000,
      totalAcordado: 13000,
    });

    render(<HonorariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Fixo')).toBeInTheDocument();
    expect(screen.getByText('Por Hora')).toBeInTheDocument();
    expect(screen.getByText('Contrato mensal')).toBeInTheDocument();
  });

  it('displays financial summary cards', () => {
    mockUseHonorarios.mockReturnValue({
      ...baseHonorariosReturn,
      honorarios: [{
        id: 'hon-1', tipo: 'fixo', status: 'pendente',
        valor_total_acordado: 10000, valor_recebido: 6000,
        data_vencimento: null, observacoes: null, overdue: false,
        tenant_id: 'tenant-1',
      }],
      isEmpty: false,
      totalRecebido: 6000,
      totalAcordado: 10000,
    });

    render(<HonorariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Total Acordado')).toBeInTheDocument();
    expect(screen.getByText('Total Recebido')).toBeInTheDocument();
    expect(screen.getByText('A Receber')).toBeInTheDocument();
  });

  it('shows overdue badge for overdue honorarios', () => {
    mockUseHonorarios.mockReturnValue({
      ...baseHonorariosReturn,
      honorarios: [{
        id: 'hon-1', tipo: 'fixo', status: 'pendente',
        valor_total_acordado: 5000, valor_recebido: 0,
        data_vencimento: '2026-01-01', observacoes: null, overdue: true,
        tenant_id: 'tenant-1',
      }],
      isEmpty: false,
      totalRecebido: 0,
      totalAcordado: 5000,
    });

    render(<HonorariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Marcar Inadimplente')).toBeInTheDocument();
  });

  it('shows Novo Honorario button when user has create permission', () => {
    mockUseHonorarios.mockReturnValue({
      ...baseHonorariosReturn,
      honorarios: [{ id: 'h1', tipo: 'fixo', status: 'pago', valor_total_acordado: 1000, valor_recebido: 1000, data_vencimento: null, observacoes: null, overdue: false, tenant_id: 't1' }],
      isEmpty: false,
      totalRecebido: 1000,
      totalAcordado: 1000,
    });

    render(<HonorariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Honorario')).toBeInTheDocument();
  });
});
