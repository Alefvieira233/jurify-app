import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Must use vi.hoisted so mock fns are available inside vi.mock factories
const { mockDeleteConexao, mockConexoes, mockIsLoading } = vi.hoisted(() => ({
  mockDeleteConexao: vi.fn().mockResolvedValue(undefined),
  mockConexoes: { current: [] as ReturnType<typeof makeMockConexao>[] },
  mockIsLoading: { current: false },
}));

function makeMockConexao(overrides: Partial<{
  id: string; nome: string; telefone: string | null; status: string;
  tipo: 'kapso' | 'oficial' | 'cloud_api'; provider: string;
  instance_name: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 'cx1',
    tenant_id: 't1',
    nome: overrides.nome ?? 'WhatsApp Principal',
    telefone: overrides.telefone ?? '+5511999999999',
    tipo: overrides.tipo ?? 'kapso' as const,
    provider: overrides.provider ?? 'kapso',
    instance_name: overrides.instance_name ?? 'jurify_instance1',
    status: overrides.status ?? 'connected',
    status_padrao: null,
    departamento_id: null,
    responsavel_id: null,
    avatar_url: null,
    last_heartbeat: null,
    last_sync: null,
    last_error: null,
    reconnect_attempts: 0,
    config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    departamento: null,
    responsavel: null,
  };
}

vi.mock('@/hooks/useConexoes', () => ({
  useConexoes: () => ({
    conexoes: mockConexoes.current,
    isLoading: mockIsLoading.current,
    deleteConexao: mockDeleteConexao,
    createConexao: vi.fn(),
    updateConexao: vi.fn(),
    isCreating: false,
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    can: () => true,
    canManageIntegrations: true,
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('@/features/whatsapp/WhatsAppWizard', () => ({
  default: () => React.createElement('div', { 'data-testid': 'whatsapp-wizard' }, 'WhatsAppWizard'),
}));

vi.mock('../ConnectionDetailsDrawer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'connection-details-drawer' }, 'ConnectionDetailsDrawer'),
}));

import ConexoesManager from '../ConexoesManager';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('ConexoesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConexoes.current = [];
    mockIsLoading.current = false;
  });

  it('renders header with title "Conexoes"', () => {
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Conexões')).toBeInTheDocument();
  });

  it('renders "Conectar WhatsApp" button in empty state', () => {
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
  });

  it('renders connection card with connection data', () => {
    mockConexoes.current = [makeMockConexao({ nome: 'Principal', telefone: '+5511999999999' })];
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Principal')).toBeInTheDocument();
  });

  it('renders status badge for connected connection', () => {
    mockConexoes.current = [makeMockConexao({ status: 'connected' })];
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Conectado')).toBeInTheDocument();
  });

  it('renders empty state with benefits when no connections', () => {
    mockConexoes.current = [];
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Conecte seu WhatsApp ao Jurify')).toBeInTheDocument();
    expect(screen.getByText('Atendimento automático 24h')).toBeInTheDocument();
  });

  it('filters connections by search term', () => {
    mockConexoes.current = [
      makeMockConexao({ id: 'cx1', nome: 'Principal', telefone: '+5511111111111' }),
      makeMockConexao({ id: 'cx2', nome: 'Secundario', telefone: '+5522222222222' }),
    ];
    render(<ConexoesManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Secundario')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Pesquisar conexões...'), {
      target: { value: 'Secundario' },
    });

    expect(screen.queryByText('Principal')).not.toBeInTheDocument();
    expect(screen.getByText('Secundario')).toBeInTheDocument();
  });

  it('does not show Kapso branding anywhere', () => {
    mockConexoes.current = [];
    render(<ConexoesManager />, { wrapper: createWrapper() });
    expect(screen.queryByText(/kapso/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/API/)).not.toBeInTheDocument();
  });
});
