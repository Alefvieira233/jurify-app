import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-area' }, children),
}));

vi.mock('../ConversationFilters', () => ({
  default: () => React.createElement('div', { 'data-testid': 'filters' }, 'Filters'),
}));

vi.mock('../whatsapp-helpers', () => ({
  getAvatarColor: () => 'bg-blue-500',
  getConvInitials: (name: string | null) => (name ? name.substring(0, 2).toUpperCase() : '??'),
  getStatusBadge: (status: string) =>
    React.createElement('span', { 'data-testid': `status-badge-${status}` }, status),
}));

import ConversationList from '../ConversationList';
import type { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';

const mockConversations: WhatsAppConversation[] = [
  {
    id: 'conv-1',
    contact_name: 'Maria Silva',
    phone_number: '5511999999999',
    status: 'ativo',
    last_message: 'Boa tarde, preciso de ajuda',
    last_message_at: '2026-04-06T10:00:00Z',
    unread_count: 3,
    tenant_id: 'tenant-1',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-06T10:00:00Z',
  } as WhatsAppConversation,
  {
    id: 'conv-2',
    contact_name: 'Joao Santos',
    phone_number: '5511888888888',
    status: 'aguardando',
    last_message: 'Obrigado pela informacao',
    last_message_at: '2026-04-05T15:00:00Z',
    unread_count: 0,
    tenant_id: 'tenant-1',
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-05T15:00:00Z',
  } as WhatsAppConversation,
  {
    id: 'conv-3',
    contact_name: null,
    phone_number: '5511777777777',
    status: 'ativo',
    last_message: null,
    last_message_at: null,
    unread_count: 1,
    tenant_id: 'tenant-1',
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
  } as WhatsAppConversation,
];

const defaultProps = {
  showMobileChat: false,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  convFilter: { tab: 'todos' as const, status: '' as const, responsavelId: '', areaJuridica: '' },
  onFilterChange: vi.fn(),
  filteredConversations: mockConversations,
  selectedConversation: null,
  stats: { total: 3, active: 2, pending: 1, qualified: 0 },
  isConnected: true,
  onSelectConversation: vi.fn(),
  onRefresh: vi.fn(),
  onSetup: vi.fn(),
  members: [],
  areasJuridicas: [],
};

describe('ConversationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversation items with names', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Joao Santos')).toBeInTheDocument();
    // conv-3 has no name, should show phone number
    expect(screen.getByText('5511777777777')).toBeInTheDocument();
  });

  it('shows unread badge on conversations with unread messages', () => {
    render(<ConversationList {...defaultProps} />);

    // Maria has 3 unread
    expect(screen.getByText('3')).toBeInTheDocument();
    // conv-3 has 1 unread
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders last message text', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('Boa tarde, preciso de ajuda')).toBeInTheDocument();
    expect(screen.getByText('Obrigado pela informacao')).toBeInTheDocument();
    expect(screen.getByText('Sem mensagens')).toBeInTheDocument();
  });

  it('calls onSelectConversation when clicking a conversation', () => {
    const onSelect = vi.fn();
    render(<ConversationList {...defaultProps} onSelectConversation={onSelect} />);

    const mariaItem = screen.getByText('Maria Silva').closest('[role="button"]');
    expect(mariaItem).toBeTruthy();
    fireEvent.click(mariaItem!);

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('shows empty state when no conversations match search', () => {
    render(
      <ConversationList
        {...defaultProps}
        filteredConversations={[]}
        searchQuery="inexistente"
      />,
    );

    expect(screen.getByText('Nenhuma conversa encontrada')).toBeInTheDocument();
  });

  it('displays connection status in footer', () => {
    render(<ConversationList {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Conectado')).toBeInTheDocument();

    render(<ConversationList {...defaultProps} isConnected={false} />);
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('displays stats in footer', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('3 conversas')).toBeInTheDocument();
    expect(screen.getByText('2 ativos')).toBeInTheDocument();
    expect(screen.getByText('1 pendentes')).toBeInTheDocument();
  });

  it('search input updates via setSearchQuery', () => {
    const setSearchQuery = vi.fn();
    render(<ConversationList {...defaultProps} setSearchQuery={setSearchQuery} />);

    const searchInput = screen.getByPlaceholderText('Buscar conversa...');
    fireEvent.change(searchInput, { target: { value: 'Maria' } });

    expect(setSearchQuery).toHaveBeenCalledWith('Maria');
  });
});
