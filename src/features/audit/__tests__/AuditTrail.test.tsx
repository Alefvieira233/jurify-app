import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

const mockUseActivityLogs = vi.fn();
vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => mockUseActivityLogs(),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ open, title }: { open: boolean; title: string }) =>
    open ? React.createElement('div', { 'data-testid': 'confirm-dialog' }, title) : null,
}));

import AuditTrail from '../AuditTrail';

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

const baseLogsReturn = {
  logs: [],
  loading: false,
  totalCount: 0,
  fetchLogs: vi.fn(),
  clearOldLogs: vi.fn(),
  exportLogs: vi.fn(),
};

describe('AuditTrail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRBAC.mockReturnValue({ isAdmin: true });
  });

  it('renders the header with title', () => {
    mockUseActivityLogs.mockReturnValue({ ...baseLogsReturn });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText('Trilha de Auditoria')).toBeInTheDocument();
  });

  it('renders empty state when no logs exist', () => {
    mockUseActivityLogs.mockReturnValue({ ...baseLogsReturn });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading', () => {
    mockUseActivityLogs.mockReturnValue({
      ...baseLogsReturn,
      loading: true,
    });

    const { container } = render(<AuditTrail />, { wrapper: createWrapper() });

    const skeletons = container.querySelectorAll('.animate-pulse, [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders log entries when data exists', () => {
    const mockLogs = [
      {
        id: 'log-1',
        tipo_acao: 'criacao',
        descricao: 'Criou contrato #123',
        nome_usuario: 'Ana Oliveira',
        modulo: 'Contratos',
        data_hora: '2026-04-01T10:30:00Z',
      },
      {
        id: 'log-2',
        tipo_acao: 'login',
        descricao: 'Login realizado',
        nome_usuario: 'Carlos Lima',
        modulo: null,
        data_hora: '2026-04-01T09:00:00Z',
      },
    ];

    mockUseActivityLogs.mockReturnValue({
      ...baseLogsReturn,
      logs: mockLogs,
      totalCount: 2,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText('Criou contrato #123')).toBeInTheDocument();
    expect(screen.getByText('Login realizado')).toBeInTheDocument();
    expect(screen.getByText('Ana Oliveira')).toBeInTheDocument();
  });

  it('shows total count in subtitle', () => {
    mockUseActivityLogs.mockReturnValue({
      ...baseLogsReturn,
      totalCount: 42,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText(/42 registros/)).toBeInTheDocument();
  });

  it('shows export and clear buttons for admin', () => {
    mockUseActivityLogs.mockReturnValue({ ...baseLogsReturn });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    expect(screen.getByText('Limpar antigos')).toBeInTheDocument();
  });

  it('hides clear button for non-admin users', () => {
    mockUseRBAC.mockReturnValue({ isAdmin: false });
    mockUseActivityLogs.mockReturnValue({ ...baseLogsReturn });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    expect(screen.queryByText('Limpar antigos')).not.toBeInTheDocument();
  });

  it('calls exportLogs when export button is clicked', () => {
    const exportFn = vi.fn();
    mockUseActivityLogs.mockReturnValue({
      ...baseLogsReturn,
      exportLogs: exportFn,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(exportFn).toHaveBeenCalled();
  });
});
