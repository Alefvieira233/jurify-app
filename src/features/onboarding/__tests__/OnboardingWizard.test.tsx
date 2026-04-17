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
    profile: { id: 'user-1', tenant_id: 'tenant-1', nome_completo: 'Test Admin' },
  }),
}));

// Mock supabase — only the paths exercised by the wizard shouldShow query
// and step persistence need to respond predictably.
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@/integrations/supabase/client', () => {
  const mockObj = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
      upsert: mockUpsert,
    })),
  };
  return { supabase: mockObj, supabaseUntyped: mockObj };
});

// Replace step components with test doubles so we only exercise the wizard
// navigation contract, not each step's internals.
vi.mock('../steps/index', () => ({
  WelcomeStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'welcome-step' },
      React.createElement('span', null, 'Bem-vindo'),
      React.createElement('button', { 'data-testid': 'welcome-next', onClick: onNext }, 'Proximo'),
    ),
  EscritorioStep: ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'escritorio-step' },
      React.createElement('button', { 'data-testid': 'escritorio-next', onClick: onNext }, 'Next'),
      React.createElement('button', { 'data-testid': 'escritorio-skip', onClick: onSkip }, 'Skip'),
    ),
  EquipeStep: ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'equipe-step' },
      React.createElement('button', { 'data-testid': 'equipe-next', onClick: onNext }, 'Next'),
      React.createElement('button', { 'data-testid': 'equipe-skip', onClick: onSkip }, 'Skip'),
    ),
  PlanoStep: ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'plano-step' },
      React.createElement('button', { 'data-testid': 'plano-next', onClick: onNext }, 'Next'),
      React.createElement('button', { 'data-testid': 'plano-skip', onClick: onSkip }, 'Skip'),
    ),
  WhatsAppStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'whatsapp-step' },
      React.createElement('button', { 'data-testid': 'whatsapp-next', onClick: onNext }, 'Next'),
    ),
  AgentsStep: ({ onNext }: { onNext: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'agents-step' },
      React.createElement('button', { 'data-testid': 'agents-next', onClick: onNext }, 'Next'),
    ),
  DoneStep: ({ onComplete }: { onComplete: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'done-step' },
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
    // Default: not completed, no resume step
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('renders nothing when wizard is already completed', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { value: 'true' }, error: null });

    const { container } = render(<OnboardingWizard />, { wrapper: createWrapper() });
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders first step (Welcome) when wizard has not been completed', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });
    expect(await screen.findByTestId('welcome-step')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument();
  });

  it('advances through all 7 steps in order', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByTestId('welcome-next'));
    expect(await screen.findByTestId('escritorio-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('escritorio-next'));
    expect(await screen.findByTestId('equipe-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('equipe-next'));
    expect(await screen.findByTestId('plano-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('plano-next'));
    expect(await screen.findByTestId('whatsapp-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('whatsapp-next'));
    expect(await screen.findByTestId('agents-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agents-next'));
    expect(await screen.findByTestId('done-step')).toBeInTheDocument();
  });

  it('honors Pular por agora on the Escritorio step', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByTestId('welcome-next'));
    fireEvent.click(await screen.findByTestId('escritorio-skip'));
    expect(await screen.findByTestId('equipe-step')).toBeInTheDocument();
  });

  it('honors Pular por agora on Equipe and Plano', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByTestId('welcome-next'));
    fireEvent.click(await screen.findByTestId('escritorio-next'));
    fireEvent.click(await screen.findByTestId('equipe-skip'));
    expect(await screen.findByTestId('plano-step')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('plano-skip'));
    expect(await screen.findByTestId('whatsapp-step')).toBeInTheDocument();
  });

  it('shows skip button on first step', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });
    await screen.findByTestId('welcome-step');
    expect(screen.getByText('Pular configuracao')).toBeInTheDocument();
  });

  it('shows back button on intermediate steps', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('welcome-next'));
    await screen.findByTestId('escritorio-step');
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });

  it('navigates home on finish', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByTestId('welcome-next'));
    fireEvent.click(await screen.findByTestId('escritorio-next'));
    fireEvent.click(await screen.findByTestId('equipe-next'));
    fireEvent.click(await screen.findByTestId('plano-next'));
    fireEvent.click(await screen.findByTestId('whatsapp-next'));
    fireEvent.click(await screen.findByTestId('agents-next'));

    fireEvent.click(await screen.findByTestId('finish'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('exposes a progressbar with correct aria attrs', async () => {
    render(<OnboardingWizard />, { wrapper: createWrapper() });

    await screen.findByTestId('welcome-step');
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '7');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
  });
});
