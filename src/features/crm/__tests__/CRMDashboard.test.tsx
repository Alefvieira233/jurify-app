import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// --- Mock data ---
const mockStages = [
  { id: 's1', name: 'Captação', slug: 'captacao', color: '#2563eb', position: 0, lead_count: 5, total_value: 50000, is_won: false, is_lost: false },
  { id: 's2', name: 'Qualificação', slug: 'qualificacao', color: '#d97706', position: 1, lead_count: 3, total_value: 30000, is_won: false, is_lost: false },
  { id: 's3', name: 'Contrato', slug: 'contrato', color: '#059669', position: 2, lead_count: 2, total_value: 100000, is_won: true, is_lost: false },
];

const mockFollowUps = [
  { id: 'f1', title: 'Ligar para João', lead_name: 'João Silva', scheduled_at: new Date().toISOString(), status: 'pending', priority: 'high' },
  { id: 'f2', title: 'Email para Ana', lead_name: 'Ana Costa', scheduled_at: '2024-01-01T00:00:00Z', status: 'overdue', priority: 'urgent' },
];

const mockLeads = [
  { id: 'l1', nome_completo: 'João Silva', temperature: 'hot', status: 'novo_lead', lead_score: 80, probability: 70, followup_count: 2 },
  { id: 'l2', nome_completo: 'Ana Costa', temperature: 'warm', status: 'em_qualificacao', lead_score: 50, probability: 40, followup_count: 1 },
];

const mockTags = [
  { id: 't1', name: 'VIP', color: '#2563eb' },
  { id: 't2', name: 'Urgente', color: '#e11d48' },
];

vi.mock('@/hooks/useCRMPipeline', () => ({
  useCRMPipeline: () => ({ stages: mockStages, loading: false, fetchStages: vi.fn(), createStage: vi.fn(), updateStage: vi.fn(), deleteStage: vi.fn() }),
}));

vi.mock('@/hooks/useFollowUps', () => ({
  useFollowUps: () => ({
    followUps: mockFollowUps, overdueCount: 1, loading: false,
    createFollowUp: vi.fn(), completeFollowUp: vi.fn(), cancelFollowUp: vi.fn(), snoozeFollowUp: vi.fn(), fetchFollowUps: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCRMTags', () => ({
  useCRMTags: () => ({ tags: mockTags, loading: false, createTag: vi.fn(), deleteTag: vi.fn() }),
}));

vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({
    leads: mockLeads, loading: false, error: null, isEmpty: false,
    fetchLeads: vi.fn(), createLead: vi.fn(), updateLead: vi.fn(), deleteLead: vi.fn(),
    currentPage: 1, totalPages: 1, pageSize: 25, goToPage: vi.fn(),
    nextPage: vi.fn(), prevPage: vi.fn(), hasNextPage: false, hasPrevPage: false,
  }),
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

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/utils/formatting', () => ({
  fmtCurrency: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
  fmtDateTime: (d: string) => new Date(d).toLocaleDateString('pt-BR'),
}));

// Mock FollowUpPanel to avoid deep dependency chain
vi.mock('../FollowUpPanel', () => ({
  default: () => <div data-testid="follow-up-panel">FollowUpPanel</div>,
}));

import CRMDashboard from '../CRMDashboard';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('CRMDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CRM header', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('CRM Profissional')).toBeInTheDocument();
  });

  it('shows total leads in subtitle', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    // Total leads = sum of stage lead_counts = 5+3+2 = 10
    expect(screen.getByText(/10 clientes/)).toBeInTheDocument();
  });

  // --- KPI Cards ---

  it('renders KPI: Clientes no Pipeline', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Clientes no Pipeline')).toBeInTheDocument();
  });

  it('renders KPI: Valor Total Pipeline', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Valor Total Pipeline')).toBeInTheDocument();
  });

  it('renders KPI: Follow-ups Pendentes', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Follow-ups Pendentes')).toBeInTheDocument();
  });

  it('renders KPI: Clientes Quentes', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Clientes Quentes')).toBeInTheDocument();
  });

  // --- Pipeline Stages ---

  it('renders Pipeline de Vendas section', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Pipeline de Vendas')).toBeInTheDocument();
  });

  it('renders all pipeline stage names', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Captação').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Qualificação').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contrato').length).toBeGreaterThanOrEqual(1);
  });

  it('shows stage count', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/3 estágios/)).toBeInTheDocument();
  });

  // --- Follow-ups ---

  it('renders Follow-ups button in header', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Follow-ups').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Próximos Follow-ups section', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Próximos Follow-ups')).toBeInTheDocument();
  });

  it('renders follow-up titles', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Ligar para João')).toBeInTheDocument();
    expect(screen.getByText('Email para Ana')).toBeInTheDocument();
  });

  it('shows overdue badge "Atrasado"', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });

  // --- Tags ---

  it('renders Tags section', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders tag names', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getAllByText('Urgente').length).toBeGreaterThanOrEqual(1);
  });

  it('shows tag count', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  // --- Interactions ---

  it('opens follow-up sheet when button is clicked', () => {
    render(<CRMDashboard />, { wrapper: createWrapper() });
    const followUpBtns = screen.getAllByText('Follow-ups');
    fireEvent.click(followUpBtns[0]);
    expect(screen.getByTestId('follow-up-panel')).toBeInTheDocument();
  });
});
