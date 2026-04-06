import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
    user: { id: 'user-1' },
  }),
}));

// Mock supabase with a chainable builder
const mockLimit = vi.fn();

function createChainMock() {
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = mockLimit;
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: vi.fn(() => createChainMock()),
  },
}));

import TimelineConversas from '../TimelineConversas';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockConversas = [
  {
    id: 'tc-1',
    lead_id: 'lead-1',
    lead_nome: 'Maria Silva',
    tipo: 'whatsapp',
    conteudo: 'Boa tarde, gostaria de saber sobre o meu processo',
    remetente: 'lead',
    timestamp: '2026-04-06T10:00:00Z',
    status: 'lido',
    metadata: null,
  },
  {
    id: 'tc-2',
    lead_id: 'lead-1',
    lead_nome: 'Maria Silva',
    tipo: 'agente_ia',
    conteudo: 'Olá Maria! Seu processo está em andamento.',
    remetente: 'agente',
    agente_ia_nome: 'Assistente Juridico',
    timestamp: '2026-04-06T10:01:00Z',
    status: 'enviado',
    metadata: { resposta_agente: true, tempo_resposta: 500 },
  },
  {
    id: 'tc-3',
    lead_id: 'lead-2',
    lead_nome: 'Joao Santos',
    tipo: 'email',
    conteudo: 'Segue em anexo o contrato revisado com as alteracoes solicitadas.',
    remetente: 'usuario',
    usuario_nome: 'Dr. Carlos',
    timestamp: '2026-04-05T16:00:00Z',
    status: 'entregue',
    metadata: { email: 'joao@test.com' },
  },
];

describe('TimelineConversas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    // Never resolve the query to keep loading state
    mockLimit.mockReturnValue(new Promise(() => {}));

    render(<TimelineConversas />, { wrapper: createWrapper() });

    expect(screen.getByText('Timeline de Conversas')).toBeInTheDocument();
    // Skeletons present in loading state
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders timeline entries after data loads', async () => {
    mockLimit.mockResolvedValue({ data: mockConversas, error: null });

    render(<TimelineConversas />, { wrapper: createWrapper() });

    // Wait for data to load -- Maria Silva appears in multiple entries
    const entries = await screen.findAllByText('Maria Silva', {}, { timeout: 3000 });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Boa tarde, gostaria de saber/)).toBeInTheDocument();
    expect(screen.getByText('Assistente Juridico')).toBeInTheDocument();
    expect(screen.getByText('Dr. Carlos')).toBeInTheDocument();
  });

  it('renders empty state when no conversations found', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    render(<TimelineConversas />, { wrapper: createWrapper() });

    const emptyMsg = await screen.findByText('Nenhuma conversa encontrada');
    expect(emptyMsg).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    render(<TimelineConversas />, { wrapper: createWrapper() });

    const errorMsg = await screen.findByText('Erro ao carregar conversas');
    expect(errorMsg).toBeInTheDocument();
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
  });

  it('shows conversation count badge when not filtered by lead', async () => {
    mockLimit.mockResolvedValue({ data: mockConversas, error: null });

    render(<TimelineConversas />, { wrapper: createWrapper() });

    const badge = await screen.findByText('3 conversas');
    expect(badge).toBeInTheDocument();
  });

  it('displays type badges on entries', async () => {
    mockLimit.mockResolvedValue({ data: mockConversas, error: null });

    render(<TimelineConversas />, { wrapper: createWrapper() });

    // Wait for any entry to appear
    await screen.findAllByText('Maria Silva', {}, { timeout: 3000 });
    expect(screen.getByText('whatsapp')).toBeInTheDocument();
    expect(screen.getByText('agente ia')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });
});
