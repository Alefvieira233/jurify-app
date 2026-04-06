import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useDashboardMetricsFast } from '@/hooks/useDashboardMetricsFast';
import { useLeads } from '@/hooks/useLeads';
import { formatarEtapaPipeline, formatarAreaJuridica } from '@/utils/formatting';

// ── Types ──

export type PeriodKey = 'hoje' | 'esta_semana' | 'este_mes' | '30_dias' | '90_dias' | 'personalizado';

export interface PeriodRange {
  start: Date;
  end: Date;
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: 'Hoje',
  esta_semana: 'Esta semana',
  este_mes: 'Este mês',
  '30_dias': 'Últimos 30 dias',
  '90_dias': 'Últimos 90 dias',
  personalizado: 'Personalizado',
};

export function computePeriodRange(period: PeriodKey, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  switch (period) {
    case 'hoje':
      return { start: todayStart, end: todayEnd };
    case 'esta_semana': {
      const day = todayStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - diff);
      return { start: weekStart, end: todayEnd };
    }
    case 'este_mes': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: todayEnd };
    }
    case '30_dias': {
      const d30 = new Date(todayStart);
      d30.setDate(d30.getDate() - 30);
      return { start: d30, end: todayEnd };
    }
    case '90_dias': {
      const d90 = new Date(todayStart);
      d90.setDate(d90.getDate() - 90);
      return { start: d90, end: todayEnd };
    }
    case 'personalizado': {
      const s = customStart ? new Date(customStart) : todayStart;
      const e = customEnd ? new Date(customEnd) : todayEnd;
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }
}

// ── CSV Helpers ──

export type CsvRow = { section: string; name: string; value: string | number; value_2?: string | number; value_3?: string | number };

const csvHeaders = ['section', 'name', 'value', 'value_2', 'value_3'];

const toCsv = (rows: CsvRow[]) => {
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [csvHeaders.join(','), ...rows.map(r => csvHeaders.map(h => esc(r[h as keyof CsvRow])).join(','))].join('\n');
};

export const downloadCsv = (filename: string, rows: CsvRow[]) => {
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
};

// ── Chart Colors ──

export const COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#4f46e5', '#0891b2'];

export const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
    borderRadius: 'calc(var(--radius) - 2px)', fontSize: 11,
    color: 'hsl(var(--foreground))', boxShadow: 'var(--shadow-md)',
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
};

// ── Hook ──

export function useReportMetrics(periodRange: PeriodRange) {
  const { profile } = useAuth();
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
  const tenantId = profile?.tenant_id;
  const { metrics, loading, error } = useDashboardMetricsFast();
  const { leads } = useLeads();

  /* ── Agendamentos query for "por área" chart ── */
  const { data: agendamentosList = [] } = useQuery({
    queryKey: queryKeys.agendamentosReport.list(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('agendamentos')
        .select('id, area_juridica, data_hora, status, created_at')
        .eq('tenant_id', tenantId);
      return (data || []) as Array<{
        id: string;
        area_juridica: string | null;
        data_hora: string;
        status: string | null;
        created_at: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  /* ── Clients per month query (Analytics tab) ── */
  const visibilityScope = getLeadVisibilityScope();
  const deptoIds = getUserDepartamentos();

  const { data: clientsList = [] } = useQuery({
    queryKey: queryKeys.clientsReport.list(tenantId, visibilityScope),
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
        .in('status', ['ganho', 'em_contato']);

      // Defense-in-depth: filter by visibility scope
      if (visibilityScope === 'own') {
        query = query.eq('responsavel_id', profile?.id ?? '');
      } else if (visibilityScope === 'department') {
        if (deptoIds.length > 0) {
          query = query.in('departamento_id', deptoIds);
        } else {
          query = query.eq('responsavel_id', profile?.id ?? '');
        }
      }

      const { data } = await query;
      return (data || []) as Array<{ id: string; status: string | null; created_at: string }>;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  /* ── Memoized chart data ── */

  const statusData = useMemo(() =>
    metrics ? Object.entries(metrics.leadsPorStatus).map(([status, count]) => ({
      name: formatarEtapaPipeline(status), value: count,
    })) : [],
  [metrics]);

  const areaData = useMemo(() =>
    metrics ? metrics.leadsPorArea.slice(0, 6).map(item => ({ name: formatarAreaJuridica(item.area), leads: item.total })) : [],
  [metrics]);

  const agentesData = useMemo(() =>
    metrics ? metrics.execucoesRecentesAgentes.map(a => ({
      name: a.agente_nome, execucoes: a.total_execucoes, sucesso: a.sucesso, erro: a.erro,
    })) : [],
  [metrics]);

  /* ── Origem dos Leads — horizontal bar chart ── */
  const origemData = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    const filtered = leads.filter(l => {
      const created = new Date(l.created_at);
      return created >= periodRange.start && created <= periodRange.end;
    });
    const origemMap = new Map<string, number>();
    for (const lead of filtered) {
      const origem = lead.origem || 'Não informado';
      origemMap.set(origem, (origemMap.get(origem) ?? 0) + 1);
    }
    return Array.from(origemMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads, periodRange]);

  /* ── Agendamentos por Área Jurídica — pie chart ── */
  const agendamentosPorAreaData = useMemo(() => {
    if (!agendamentosList || agendamentosList.length === 0) return [];
    const filtered = agendamentosList.filter(a => {
      const created = new Date(a.created_at);
      return created >= periodRange.start && created <= periodRange.end;
    });
    const areaMap = new Map<string, number>();
    for (const ag of filtered) {
      const area = formatarAreaJuridica(ag.area_juridica || 'consulta_geral');
      areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
    }
    return Array.from(areaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [agendamentosList, periodRange]);

  /* ── Clients per month (Analytics) ── */
  const clientsPerMonthData = useMemo(() => {
    if (!clientsList || clientsList.length === 0) return [];
    const monthMap = new Map<string, number>();
    for (const client of clientsList) {
      const d = new Date(client.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const label = `${monthNames[Number(month) - 1]}/${year?.slice(2)}`;
        return { name: label, clientes: value };
      });
  }, [clientsList]);

  /* ── Agentes IA analytics (bar + line) ── */
  const agentesAnalyticsData = useMemo(() => {
    if (!metrics) return [];
    return metrics.execucoesRecentesAgentes.map(a => ({
      name: a.agente_nome,
      total: a.total_execucoes,
      sucesso: a.sucesso,
      erro: a.erro,
      taxaSucesso: a.total_execucoes > 0
        ? Number(((a.sucesso / a.total_execucoes) * 100).toFixed(1))
        : 0,
    }));
  }, [metrics]);

  /* ── Export helpers ── */

  const handleExportRelatorios = () => {
    if (!metrics) return;
    const rows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads',            value: metrics.totalLeads },
      { section: 'kpi', name: 'leads_novo_mes',         value: metrics.leadsNovoMes },
      { section: 'kpi', name: 'contratos',              value: metrics.contratos },
      { section: 'kpi', name: 'contratos_assinados',    value: metrics.contratosAssinados },
      { section: 'kpi', name: 'agendamentos',           value: metrics.agendamentos },
      { section: 'kpi', name: 'agendamentos_hoje',      value: metrics.agendamentosHoje },
      { section: 'kpi', name: 'agentes_ativos',         value: metrics.agentesAtivos },
      { section: 'kpi', name: 'execucoes_agentes_hoje', value: metrics.execucoesAgentesHoje },
      ...Object.entries(metrics.leadsPorStatus).map(([name, value]) => ({ section: 'status', name, value })),
      ...metrics.leadsPorArea.map(a => ({ section: 'area', name: a.area, value: a.total })),
      ...metrics.execucoesRecentesAgentes.map(a => ({ section: 'agente', name: a.agente_nome, value: a.total_execucoes, value_2: a.sucesso, value_3: a.erro })),
    ];
    downloadCsv(`relatorios-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportDemo = () => {
    const demoRows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads', value: 120 },
      { section: 'kpi', name: 'contratos',   value: 42  },
      { section: 'area', name: 'Trabalhista', value: 30  },
      { section: 'area', name: 'Cível',       value: 28  },
    ];
    downloadCsv('relatorios-demo.csv', demoRows);
  };

  return {
    metrics,
    loading,
    error,
    statusData,
    areaData,
    agentesData,
    origemData,
    agendamentosPorAreaData,
    clientsPerMonthData,
    agentesAnalyticsData,
    handleExportRelatorios,
    handleExportDemo,
  };
}
