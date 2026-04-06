import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseNotifications = vi.fn();
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

import NotificationsPanel from '../NotificationsPanel';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockNotificationsList = [
  {
    id: 'n1',
    titulo: 'Novo lead recebido',
    mensagem: 'Maria Silva entrou pelo WhatsApp',
    tipo: 'info' as const,
    data_criacao: '2026-04-06T10:00:00Z',
    created_at: '2026-04-06T10:00:00Z',
  },
  {
    id: 'n2',
    titulo: 'Prazo vencendo',
    mensagem: 'Processo 0001234 vence amanha',
    tipo: 'alerta' as const,
    data_criacao: '2026-04-06T09:00:00Z',
    created_at: '2026-04-06T09:00:00Z',
  },
  {
    id: 'n3',
    titulo: 'Contrato assinado',
    mensagem: 'Cliente Beta assinou o contrato',
    tipo: 'sucesso' as const,
    data_criacao: '2026-04-05T15:00:00Z',
    created_at: '2026-04-05T15:00:00Z',
  },
];

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when loading', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: true,
      unreadCount: 0,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      isRead: () => false,
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders notification list with correct content', () => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotificationsList,
      loading: false,
      unreadCount: 2,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      isRead: (n: { id: string }) => n.id === 'n3',
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo lead recebido')).toBeInTheDocument();
    expect(screen.getByText('Prazo vencendo')).toBeInTheDocument();
    expect(screen.getByText('Contrato assinado')).toBeInTheDocument();
  });

  it('displays unread count badge', () => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotificationsList,
      loading: false,
      unreadCount: 2,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      isRead: (n: { id: string }) => n.id === 'n3',
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/2 não lidas/)).toBeInTheDocument();
  });

  it('shows "Marcar lida" button on unread notifications', () => {
    const markAsRead = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: mockNotificationsList,
      loading: false,
      unreadCount: 2,
      fetchNotifications: vi.fn(),
      markAsRead,
      markAllAsRead: vi.fn(),
      isRead: (n: { id: string }) => n.id === 'n3',
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    const markButtons = screen.getAllByText('Marcar lida');
    // 2 unread notifications should have the button
    expect(markButtons).toHaveLength(2);

    // Click first one
    fireEvent.click(markButtons[0]);
    expect(markAsRead).toHaveBeenCalledWith('n1');
  });

  it('shows empty state when no notifications exist', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      unreadCount: 0,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      isRead: () => false,
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    // "Tudo em dia" appears in both header subtitle and empty body
    expect(screen.getAllByText('Tudo em dia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nenhuma notificação encontrada')).toBeInTheDocument();
  });

  it('shows "Marcar todas" button when unread notifications exist', () => {
    const markAllAsRead = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: mockNotificationsList,
      loading: false,
      unreadCount: 2,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead,
      isRead: (n: { id: string }) => n.id === 'n3',
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    const markAllBtn = screen.getByText('Marcar todas');
    expect(markAllBtn).toBeInTheDocument();

    fireEvent.click(markAllBtn);
    expect(markAllAsRead).toHaveBeenCalled();
  });

  it('filter pills show correct counts', () => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotificationsList,
      loading: false,
      unreadCount: 2,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      isRead: (n: { id: string }) => n.id === 'n3',
    });

    render(<NotificationsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Todas (3)')).toBeInTheDocument();
    expect(screen.getByText('Não lidas (2)')).toBeInTheDocument();
    expect(screen.getByText('Lidas (1)')).toBeInTheDocument();
  });
});
