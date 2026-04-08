import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
  }),
}));

// Mock supabase to control shouldShow query
const mockMaybeSingle = vi.fn();
vi.mock('@/integrations/supabase/client', () => {
  const mockObj = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  };
  return { supabase: mockObj, supabaseUntyped: mockObj };
});

vi.mock('../steps', () => ({
  WelcomeStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement('div', { 'data-testid': 'welcome-step' },
      React.createElement('span', null, 'Bem-vindo'),
      React.createElement('button', { 'data-testid': 'welcome-next', onClick: onNext }, 'Proximo'),
    ),
  WhatsAppStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement('div', { 'data-testid': 'whatsapp-step' },
      React.createElement('span', null, 'WhatsApp'),
      React.createElement('button', { 'data-testid': 'whatsapp-next', onClick: onNext }, 'Proximo'),
    ),
  AgentsStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement('div', { 'data-testid': 'agents-step' },
      React.createElement('span', null, 'Agentes'),
      React.createElement('button', { 'data-testid': 'agents-next', onClick: onNext }, 'Proximo'),
    ),
  DoneStep: ({ onComplete }: { onComplete: () => void }) =>
    React.createElement('div', { 'data-testid': 'done-step' },
      React.createElement('span', null, 'Concluido'),
      React.createElement('button', { 'data-testid': 'finish', onClick: onComplete }, 'Finalizar'),
    ),
}));

import OnboardingWizard from '../OnboardingWizard';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when wizard is already completed', async () => {
    // Simulate completed wizard
    mockMaybeSingle.mockResolvedValue({ data: { value: 'true' }, error: null });

    const { container } = render(<OnboardingWizard />, { wrapper: createWrapper() });

    // shouldShow will be false, so component returns null
    // Wait for query to settle
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders first step (Welcome) when wizard has not been completed', async () => {
    // Simulate not completed
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingWizard />, { wrapper: createWrapper() });

    const welcomeStep = await screen.findByTestId('welcome-step');
    expect(welcomeStep).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument();
  });

  it('navigates through steps correctly', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingWizard />, { wrapper: createWrapper() });

    // Step 0: Welcome
    const welcomeNext = await screen.findByTestId('welcome-next');
    fireEvent.click(welcomeNext);

    // Step 1: WhatsApp
    expect(await screen.findByTestId('whatsapp-step')).toBeInTheDocument();

    const whatsappNext = screen.getByTestId('whatsapp-next');
    fireEvent.click(whatsappNext);

    // Step 2: Agents
    expect(await screen.findByTestId('agents-step')).toBeInTheDocument();

    const agentsNext = screen.getByTestId('agents-next');
    fireEvent.click(agentsNext);

    // Step 3: Done
    expect(await screen.findByTestId('done-step')).toBeInTheDocument();
    expect(screen.getByText('Concluido')).toBeInTheDocument();
  });

  it('shows skip button on first step', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingWizard />, { wrapper: createWrapper() });

    await screen.findByTestId('welcome-step');
    expect(screen.getByText('Pular configuracao')).toBeInTheDocument();
  });

  it('shows back button on intermediate steps', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingWizard />, { wrapper: createWrapper() });

    // Navigate to step 1
    const welcomeNext = await screen.findByTestId('welcome-next');
    fireEvent.click(welcomeNext);

    await screen.findByTestId('whatsapp-step');
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });

  it('calls navigate on finish', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingWizard />, { wrapper: createWrapper() });

    // Navigate to done step
    fireEvent.click(await screen.findByTestId('welcome-next'));
    fireEvent.click(await screen.findByTestId('whatsapp-next'));
    fireEvent.click(await screen.findByTestId('agents-next'));

    const finishBtn = await screen.findByTestId('finish');
    fireEvent.click(finishBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
