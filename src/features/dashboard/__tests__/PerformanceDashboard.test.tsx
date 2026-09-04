import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PerformanceDashboard from '../components/PerformanceDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'test-user', tenant_id: 'test-tenant' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe('PerformanceDashboard Component', () => {
  it('renders dashboard heading correctly', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PerformanceDashboard />
      </QueryClientProvider>
    );

    expect(screen.getByText('Dashboard de Performance')).toBeInTheDocument();
    expect(screen.getByText('Métricas e indicadores de uso do sistema')).toBeInTheDocument();
  });
});
