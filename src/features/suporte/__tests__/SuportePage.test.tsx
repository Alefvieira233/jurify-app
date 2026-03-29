import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SuportePage from '../SuportePage';

const mockTickets = [
  {
    id: '1',
    tenant_id: 't1',
    criador_id: 'u1',
    tipo: 'bug' as const,
    conteudo: 'Erro ao carregar página de leads',
    status: 'aberto' as const,
    avaliacao: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    tenant_id: 't1',
    criador_id: 'u1',
    tipo: 'duvida' as const,
    conteudo: 'Como exportar relatórios?',
    status: 'fechado' as const,
    avaliacao: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockCreateTicket = { mutate: vi.fn(), isPending: false };
const mockUpdateTicket = { mutate: vi.fn(), isPending: false };

vi.mock('@/hooks/useTicketsSuporte', () => ({
  useTicketsSuporte: () => ({
    tickets: mockTickets,
    isLoading: false,
    createTicket: mockCreateTicket,
    updateTicket: mockUpdateTicket,
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <SuportePage />
    </MemoryRouter>
  );

describe('SuportePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ticket list', () => {
    renderPage();
    expect(screen.getByText(/Erro ao carregar/)).toBeInTheDocument();
    expect(screen.getByText(/Como exportar/)).toBeInTheDocument();
  });

  it('renders empty state when no tickets', () => {
    renderPage();
    // Search for something that doesn't exist — the empty state message should appear
    const searchInput = screen.getByPlaceholderText('Buscar tickets...');
    // Use fireEvent for synchronous test
    const { fireEvent } = require('@testing-library/react');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent12345' } });
    expect(screen.getByText('Nenhum ticket encontrado')).toBeInTheDocument();
  });

  it('shows tipo filter select', () => {
    renderPage();
    const select = screen.getByRole('combobox', { name: /filtrar por tipo/i });
    expect(select).toBeInTheDocument();
  });

  it('filters by search text', async () => {
    const user = userEvent.setup();
    renderPage();
    const searchInput = screen.getByPlaceholderText('Buscar tickets...');
    await user.clear(searchInput);
    await user.type(searchInput, 'exportar');
    expect(screen.queryByText(/Erro ao carregar/)).not.toBeInTheDocument();
    expect(screen.getByText(/Como exportar/)).toBeInTheDocument();
  });

  it('opens detail dialog on row click', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = screen.getByText(/Erro ao carregar/).closest('tr');
    expect(row).not.toBeNull();
    await user.click(row!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Detalhes do Ticket')).toBeInTheDocument();
  });
});
