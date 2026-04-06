import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import SubscriptionStatus from '../SubscriptionStatus';

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

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders free plan when no subscription', () => {
    mockUseAuth.mockReturnValue({
      profile: { subscription_status: null, subscription_tier: null },
    });

    render(<SubscriptionStatus />, { wrapper: createWrapper() });

    expect(screen.getByText('Gratuito')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Fazer Upgrade')).toBeInTheDocument();
  });

  it('renders active pro plan with correct status', () => {
    mockUseAuth.mockReturnValue({
      profile: { subscription_status: 'active', subscription_tier: 'pro' },
    });

    render(<SubscriptionStatus />, { wrapper: createWrapper() });

    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Gerenciar')).toBeInTheDocument();
  });

  it('renders enterprise plan name', () => {
    mockUseAuth.mockReturnValue({
      profile: { subscription_status: 'active', subscription_tier: 'enterprise' },
    });

    render(<SubscriptionStatus />, { wrapper: createWrapper() });

    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('navigates to /planos when button is clicked', () => {
    mockUseAuth.mockReturnValue({
      profile: { subscription_status: null, subscription_tier: null },
    });

    render(<SubscriptionStatus />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Fazer Upgrade'));
    expect(mockNavigate).toHaveBeenCalledWith('/planos');
  });

  it('shows Assinatura card title', () => {
    mockUseAuth.mockReturnValue({
      profile: { subscription_status: 'inactive', subscription_tier: null },
    });

    render(<SubscriptionStatus />, { wrapper: createWrapper() });

    expect(screen.getByText('Assinatura')).toBeInTheDocument();
  });
});
