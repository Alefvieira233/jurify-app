import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

// Must use vi.hoisted so mock fns are available inside vi.mock factories
const { mockDeleteConexao, mockLogs, mockAlertas } = vi.hoisted(() => ({
  mockDeleteConexao: vi.fn().mockResolvedValue(undefined),
  mockLogs: { current: [] as unknown[] },
  mockAlertas: { current: [] as unknown[] },
}));

vi.mock('@/hooks/useConexoes', () => ({
  useConexoes: () => ({
    conexoes: [],
    isLoading: false,
    deleteConexao: mockDeleteConexao,
    createConexao: vi.fn(),
    updateConexao: vi.fn(),
    isCreating: false,
  }),
  useConexaoLogs: () => ({
    data: mockLogs.current,
    isLoading: false,
  }),
  useConexaoAlertas: () => ({
    data: mockAlertas.current,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    can: () => true,
    canManageIntegrations: true,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

import ConnectionDetailsDrawer from '../ConnectionDetailsDrawer';

function makeConexao(overrides: Partial<ConexaoWhatsApp> = {}): ConexaoWhatsApp {
  return {
    id: 'cx1',
    tenant_id: 't1',
    nome: 'WhatsApp Principal',
    telefone: '+5511999999999',
    tipo: 'kapso',
    provider: 'kapso',
    instance_name: 'jurify_inst1',
    status: 'connected',
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
    ...overrides,
  };
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('ConnectionDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogs.current = [];
    mockAlertas.current = [];
  });

  it('renders nothing when conexao is null', () => {
    const { container } = render(
      <ConnectionDetailsDrawer conexao={null} open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    // When conexao is null, component returns null — no sheet content rendered
    expect(container.firstChild).toBeNull();
  });

  it('renders connection name and status in header', () => {
    const conexao = makeConexao({ nome: 'Kapso Teste', status: 'connected' });
    render(
      <ConnectionDetailsDrawer conexao={conexao} open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Kapso Teste')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
  });

  it('renders 6 tab triggers', () => {
    const conexao = makeConexao();
    render(
      <ConnectionDetailsDrawer conexao={conexao} open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
    expect(screen.getByText('Diagnóstico')).toBeInTheDocument();
  });

  it('renders general info on Geral tab', () => {
    const conexao = makeConexao({
      tipo: 'kapso',
      provider: 'kapso',
      instance_name: 'test_instance',
    });
    render(
      <ConnectionDetailsDrawer conexao={conexao} open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    // Geral tab is active by default — check type and instance info labels
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Instância')).toBeInTheDocument();
  });

  it('shows unresolved alert count badge', () => {
    const conexao = makeConexao();
    mockAlertas.current = [
      {
        id: 'a1', conexao_id: 'cx1', tenant_id: 't1',
        tipo: 'desconexao', mensagem: 'Conexão perdida',
        severidade: 'error', lido: false, resolvido: false,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'a2', conexao_id: 'cx1', tenant_id: 't1',
        tipo: 'desconexao', mensagem: 'Conexão perdida novamente',
        severidade: 'warning', lido: false, resolvido: false,
        created_at: '2026-01-02T00:00:00Z',
      },
    ];
    render(
      <ConnectionDetailsDrawer conexao={conexao} open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    // The unresolved count badge shows "2" next to the Alertas tab
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
