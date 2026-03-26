import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Must use vi.hoisted so mock fns are available inside vi.mock factories (hoisted)
const { mockInvoke, mockGetSession, mockMaybeSingle } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockGetSession: vi.fn().mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  }),
  mockMaybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    functions: { invoke: mockInvoke },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  },
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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import WhatsAppKapsoSetup from '../WhatsAppKapsoSetup';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('WhatsAppKapsoSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('renders header with title', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText('WhatsApp Kapso API')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/conecte seu whatsapp escaneando/i)).toBeInTheDocument();
  });

  it('renders info alert about Kapso API', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/kapso api permite conectar/i)).toBeInTheDocument();
  });

  it('renders Conexão WhatsApp card title', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText('Conexão WhatsApp')).toBeInTheDocument();
  });

  it('renders Conectar WhatsApp button in idle state', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    expect(screen.getByText('Nao configurado')).toBeInTheDocument();
  });

  it('calls kapso-manager on connect click', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, instanceName: 'test_inst', qrcode: 'base64qr' },
      error: null,
    });

    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Conectar WhatsApp'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('kapso-manager', expect.objectContaining({
        body: { action: 'create', instanceName: undefined },
      }));
    });
  });

  it('shows QR ready state after successful create', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, instanceName: 'test_inst', qrcode: 'data:image/png;base64,abc123' },
      error: null,
    });

    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Conectar WhatsApp'));

    await waitFor(() => {
      expect(screen.getByText('Aguardando QR')).toBeInTheDocument();
    });
  });

  it('shows error state when create fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Kapso API not configured'));

    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Conectar WhatsApp'));

    await waitFor(() => {
      expect(screen.getByText(/kapso api not configured/i)).toBeInTheDocument();
    });
  });

  it('loads existing instance from DB on mount', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: '1', status: 'ativa', observacoes: 'Instance: jurify_abc' },
      error: null,
    });

    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument();
    });
  });

  it('shows disconnect and remove buttons when connected', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: '1', status: 'ativa', observacoes: 'Instance: jurify_abc' },
      error: null,
    });

    render(<WhatsAppKapsoSetup />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
      expect(screen.getByText('Remover')).toBeInTheDocument();
    });
  });
});
