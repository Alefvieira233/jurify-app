import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TarefasPage from '../TarefasPage';
import type { Tarefa } from '@/hooks/useTarefas';

const mockUpdateTarefa = { mutate: vi.fn(), isPending: false };
const mockDeleteTarefa = { mutate: vi.fn(), isPending: false };
const mockCreateTarefa = { mutate: vi.fn(), isPending: false };

const mockUseTarefas = vi.fn();

vi.mock('@/hooks/useTarefas', () => ({
  useTarefas: () => mockUseTarefas(),
}));

vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({ members: [] }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', tenant_id: 't1', nome_completo: 'Test User' },
    user: { id: 'u1' },
  }),
}));

const makeTarefa = (overrides: Partial<Tarefa> = {}): Tarefa => ({
  id: 'tarefa-1',
  tenant_id: 't1',
  titulo: 'Tarefa Teste 1',
  descricao: null,
  prazo: null,
  pontos: null,
  responsavel_id: null,
  criador_id: 'u1',
  lead_id: null,
  status: 'pendente',
  prioridade: 'media',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const defaultHookReturn = {
  tarefas: [] as Tarefa[],
  isLoading: false,
  createTarefa: mockCreateTarefa as any,
  updateTarefa: mockUpdateTarefa as any,
  deleteTarefa: mockDeleteTarefa as any,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <TarefasPage />
    </MemoryRouter>
  );

describe('TarefasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTarefas.mockReturnValue(defaultHookReturn);
  });

  it('renders loading skeleton when isLoading is true', () => {
    mockUseTarefas.mockReturnValue({ ...defaultHookReturn, isLoading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no tarefas', () => {
    renderPage();
    expect(screen.getByText('Nenhuma tarefa criada ainda')).toBeInTheDocument();
  });

  it('renders tarefa rows', () => {
    mockUseTarefas.mockReturnValue({
      ...defaultHookReturn,
      tarefas: [
        makeTarefa({ id: 't1', titulo: 'Primeira Tarefa' }),
        makeTarefa({ id: 't2', titulo: 'Segunda Tarefa' }),
      ],
    });
    renderPage();
    expect(screen.getByText('Primeira Tarefa')).toBeInTheDocument();
    expect(screen.getByText('Segunda Tarefa')).toBeInTheDocument();
  });

  it('filters by search text', async () => {
    mockUseTarefas.mockReturnValue({
      ...defaultHookReturn,
      tarefas: [
        makeTarefa({ id: 't1', titulo: 'Reuniao com cliente' }),
        makeTarefa({ id: 't2', titulo: 'Preparar proposta' }),
      ],
    });
    renderPage();

    const searchInput = screen.getByPlaceholderText('Buscar tarefas...');
    await userEvent.type(searchInput, 'proposta');

    expect(screen.queryByText('Reuniao com cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Preparar proposta')).toBeInTheDocument();
  });

  it('shows priority filter select', () => {
    renderPage();
    expect(screen.getByText('Todas as prioridades')).toBeInTheDocument();
  });
});
