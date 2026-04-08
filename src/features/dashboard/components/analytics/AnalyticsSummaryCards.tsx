/**
 * AnalyticsSummaryCards -- KPI summary row with metric cards.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  Users,
  FileText,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number;
  leadsThisMonth: number;
  leadsGrowth: number;
  totalContracts: number;
  contractsThisMonth: number;
  contractsGrowth: number;
  conversionRate: number;
  avgResponseTime: number;
  aiCallsToday: number;
  totalRevenue: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
}

const MetricCard = React.memo(({ title, value, change, icon: Icon }: MetricCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}% vs periodo anterior
        </div>
      )}
    </CardContent>
  </Card>
));
MetricCard.displayName = 'MetricCard';

interface AnalyticsSummaryCardsProps {
  metrics: DashboardMetrics;
}

const AnalyticsSummaryCards = React.memo(({ metrics }: AnalyticsSummaryCardsProps) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <MetricCard
      title="Total de Clientes"
      value={metrics.leadsThisMonth}
      change={metrics.leadsGrowth}
      icon={Users}
    />
    <MetricCard
      title="Contratos"
      value={metrics.contractsThisMonth}
      change={metrics.contractsGrowth}
      icon={FileText}
    />
    <MetricCard
      title="Taxa de Conversao"
      value={`${metrics.conversionRate.toFixed(1)}%`}
      icon={TrendingUp}
    />
    <MetricCard
      title="Chamadas IA Hoje"
      value={metrics.aiCallsToday}
      icon={Brain}
    />
  </div>
));

AnalyticsSummaryCards.displayName = 'AnalyticsSummaryCards';

export { AnalyticsSummaryCards, MetricCard };
export type { AnalyticsSummaryCardsProps, DashboardMetrics };
