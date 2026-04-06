/**
 * @module MetricasOperacionais
 * @description Comprehensive operational metrics dashboard for CRM leads.
 * All data is computed client-side from the leads array -- no additional queries.
 */

import { Users, TrendingUp, Archive, Clock } from 'lucide-react';
import { useMetricasData } from './useMetricasData';
import { MetricCard } from './MetricCard';
import { DepartamentoGrid, ResponsavelTable } from './MetricsGrid';
import { FunnelChart, OrigemTable, ArquivamentoPieChart } from './MetricsCharts';

function MetricasOperacionais() {
  const { leads, loading, kpis, deptoMetrics, respMetrics, funnelData, origemMetrics, arquivamentoData } =
    useMetricasData();

  if (!loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Sem dados operacionais</h3>
        <p className="text-sm text-muted-foreground">Crie leads no Pipeline para visualizar as metricas aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Leads Ativos"
          value={kpis.ativos}
          subtitle="Excluindo arquivados"
          icon={Users}
          iconColor="text-blue-500"
          gradientFrom="from-blue-50/50"
          gradientTo="to-blue-100/30"
          darkFrom="dark:from-blue-950/20"
          darkTo="dark:to-blue-900/10"
          borderColor="border-blue-200/30"
        />
        <MetricCard
          label="Taxa de Conversao"
          value={`${kpis.taxaConversao}%`}
          subtitle={`${kpis.ganhos} de ${kpis.ativos} leads ativos`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          gradientFrom="from-emerald-50/50"
          gradientTo="to-emerald-100/30"
          darkFrom="dark:from-emerald-950/20"
          darkTo="dark:to-emerald-900/10"
          borderColor="border-emerald-200/30"
        />
        <MetricCard
          label="Tempo Medio no Funil"
          value={`${kpis.tempoMedioFunil} dias`}
          subtitle="Da criacao ao ganho"
          icon={Clock}
          iconColor="text-amber-500"
          gradientFrom="from-amber-50/50"
          gradientTo="to-amber-100/30"
          darkFrom="dark:from-amber-950/20"
          darkTo="dark:to-amber-900/10"
          borderColor="border-amber-200/30"
        />
        <MetricCard
          label="Leads Arquivados"
          value={kpis.arquivados}
          subtitle="Total arquivados"
          icon={Archive}
          iconColor="text-rose-500"
          gradientFrom="from-rose-50/50"
          gradientTo="to-rose-100/30"
          darkFrom="dark:from-rose-950/20"
          darkTo="dark:to-rose-900/10"
          borderColor="border-rose-200/30"
        />
      </div>

      <DepartamentoGrid data={deptoMetrics} />
      <ResponsavelTable data={respMetrics} />
      <FunnelChart data={funnelData} />
      <OrigemTable data={origemMetrics} />
      <ArquivamentoPieChart data={arquivamentoData} />
    </div>
  );
}

export default MetricasOperacionais;
