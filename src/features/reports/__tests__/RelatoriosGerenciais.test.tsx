import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useMRR', () => ({
  useMRR: () => ({ data: null }),
}));

vi.mock('@/hooks/useResponseTime', () => ({
  useResponseTime: () => ({ data: [] }),
}));

vi.mock('@/features/dashboard/components/analytics/ConversionFunnel', () => ({
  ConversionFunnel: () => React.createElement('div', null, 'ConversionFunnel'),
}));

vi.mock('@/features/dashboard/components/analytics/RevenueCard', () => ({
  RevenueCard: () => React.createElement('div', null, 'RevenueCard'),
}));

vi.mock('@/features/dashboard/components/analytics/ResponseTimeChart', () => ({
  ResponseTimeChart: () => React.createElement('div', null, 'ResponseTimeChart'),
}));

vi.mock('@/features/dashboard/components/analytics/ChurnCard', () => ({
  ChurnCard: () => React.createElement('div', null, 'ChurnCard'),
}));

vi.mock('@/features/dashboard/components/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => React.createElement('div', null, 'AnalyticsDashboard'),
}));

vi.mock('../MetricasOperacionais', () => ({
  default: () => React.createElement('div', null, 'MetricasOperacionais'),
}));

vi.mock('../ReportFilters', () => ({
  default: () => React.createElement('div', { 'data-testid': 'report-filters' }, 'Filters'),
}));

vi.mock('../ReportChartPanel', () => ({
  default: () => React.createElement('div', { 'data-testid': 'chart-panel' }, 'Charts'),
  EmptyChart: () => React.createElement('div', null, 'Empty'),
}));

// Mock recharts to avoid SVG rendering issues in JSDOM
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  ComposedChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Bar: () => null,
}));

const mockUseReportMetrics = vi.fn();
vi.mock('../useReportMetrics', () => ({
  useReportMetrics: () => mockUseReportMetrics(),
  computePeriodRange: () => ({ start: '2026-03-01', end: '2026-03-31' }),
  tooltipStyle: {},
  PERIOD_LABELS: { '30_dias': '30 dias', personalizado: 'Personalizado' },
}));

vi.mock('../hooks/useReportExport', () => ({
  useReportExport: () => ({
    exportCSV: vi.fn().mockResolvedValue(undefined),
    exportPDF: vi.fn().mockResolvedValue(undefined),
    exportExcel: vi.fn().mockResolvedValue(undefined),
    exporting: null,
  }),
}));

import RelatoriosGerenciais from '../RelatoriosGerenciais';

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

describe('RelatoriosGerenciais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    mockUseReportMetrics.mockReturnValue({
      metrics: null,
      loading: true,
      error: null,
      statusData: [],
      areaData: [],
      agentesData: [],
      origemData: [],
      agendamentosPorAreaData: [],
      clientsPerMonthData: [],
      agentesAnalyticsData: [],
      handleExportRelatorios: vi.fn(),
      handleExportDemo: vi.fn(),
    });

    const { container } = render(<RelatoriosGerenciais />, { wrapper: createWrapper() });

    const skeletons = container.querySelectorAll('.animate-pulse, [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty/preparation state when no metrics available', () => {
    mockUseReportMetrics.mockReturnValue({
      metrics: null,
      loading: false,
      error: null,
      statusData: [],
      areaData: [],
      agentesData: [],
      origemData: [],
      agendamentosPorAreaData: [],
      clientsPerMonthData: [],
      agentesAnalyticsData: [],
      handleExportRelatorios: vi.fn(),
      handleExportDemo: vi.fn(),
    });

    render(<RelatoriosGerenciais />, { wrapper: createWrapper() });

    expect(screen.getByText(/em prepara/i)).toBeInTheDocument();
    expect(screen.getByText(/Gerar Relat/i)).toBeInTheDocument();
  });

  it('renders report tabs when data is loaded', () => {
    mockUseReportMetrics.mockReturnValue({
      metrics: {
        totalLeads: 100,
        totalClientes: 50,
        totalProcessos: 30,
        totalAgendamentos: 20,
        ticketMedio: 2500,
        taxaConversao: 50,
        novosLeadsPeriodo: 15,
        novosClientesPeriodo: 8,
      },
      loading: false,
      error: null,
      statusData: [{ name: 'Ativo', value: 10 }],
      areaData: [{ name: 'Trabalhista', value: 5 }],
      agentesData: [],
      origemData: [],
      agendamentosPorAreaData: [],
      clientsPerMonthData: [],
      agentesAnalyticsData: [],
      handleExportRelatorios: vi.fn(),
      handleExportDemo: vi.fn(),
    });

    render(<RelatoriosGerenciais />, { wrapper: createWrapper() });

    expect(screen.getByText('Resumo Geral')).toBeInTheDocument();
    expect(screen.getByText('Faturamento')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Gerencial')).toBeInTheDocument();
  });

  it('displays export button on resumo tab', () => {
    mockUseReportMetrics.mockReturnValue({
      metrics: {
        totalLeads: 0, totalClientes: 0, totalProcessos: 0,
        totalAgendamentos: 0, ticketMedio: 0, taxaConversao: 0,
        novosLeadsPeriodo: 0, novosClientesPeriodo: 0,
      },
      loading: false,
      error: null,
      statusData: [],
      areaData: [],
      agentesData: [],
      origemData: [],
      agendamentosPorAreaData: [],
      clientsPerMonthData: [],
      agentesAnalyticsData: [],
      handleExportRelatorios: vi.fn(),
      handleExportDemo: vi.fn(),
    });

    render(<RelatoriosGerenciais />, { wrapper: createWrapper() });

    // ReportFilters is mocked to a stub in this test, so the new "Exportar"
    // dropdown lives inside that stub. Assert the top-level "CSV Rápido"
    // quick-export button instead — it's the stable legacy path.
    expect(screen.getByText(/CSV R[aá]pido/)).toBeInTheDocument();
  });
});
