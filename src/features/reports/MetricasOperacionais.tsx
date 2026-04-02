/**
 * @module MetricasOperacionais
 * @description Comprehensive operational metrics dashboard for CRM leads.
 * All data is computed client-side from the leads array — no additional queries.
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Archive, Clock, Building2, UserCheck, Globe, FileX } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/features/pipeline/pipelineConfig';
import { MOTIVOS_ARQUIVAMENTO } from '@/types/crm-operacional';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

const MOTIVOS_MAP = Object.fromEntries(
  MOTIVOS_ARQUIVAMENTO.map(m => [m.value, m.label]),
);

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#4f46e5', '#0891b2', '#7c3aed', '#f43f5e'];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'calc(var(--radius) - 2px)',
    fontSize: 11,
    color: 'hsl(var(--foreground))',
    boxShadow: 'var(--shadow-md)',
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
};

/* ─── Component ────────────────────────────────────────────────────────────── */

function MetricasOperacionais() {
  const { leads, loading } = useLeads();
  const { departamentos } = useDepartamentos();
  const { members } = useTeamMembers();

  /* ── Build lookup maps ── */
  const deptoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departamentos) {
      map.set(d.id, d.nome);
    }
    return map;
  }, [departamentos]);

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.id, m.nome_completo ?? 'Sem nome');
    }
    return map;
  }, [members]);

  /* ── Section 1: KPI Cards ── */
  const kpis = useMemo(() => {
    const ativos = leads.filter(l => !l.arquivado_em);
    const ganhos = ativos.filter(l => l.status === 'ganho');
    const arquivados = leads.filter(l => !!l.arquivado_em);

    // Tempo medio no funil: avg days from created_at to won_at for ganho leads
    const ganhosComWon = ganhos.filter(l => l.won_at);
    const avgDays = ganhosComWon.length > 0
      ? Math.round(ganhosComWon.reduce((sum, l) => sum + daysBetween(l.created_at, l.won_at!), 0) / ganhosComWon.length)
      : 0;

    const taxaConversao = ativos.length > 0
      ? ((ganhos.length / ativos.length) * 100).toFixed(1)
      : '0';

    return {
      ativos: ativos.length,
      taxaConversao,
      tempoMedioFunil: avgDays,
      arquivados: arquivados.length,
      ganhos: ganhos.length,
    };
  }, [leads]);

  /* ── Section 2: Metricas por Departamento (active leads only) ── */
  const deptoMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; ganhos: number; valorTotal: number }>();

    for (const lead of leads.filter(l => !l.arquivado_em)) {
      const key = lead.departamento_id ?? '__sem_depto__';
      const nome = lead.departamento_id ? (deptoMap.get(lead.departamento_id) ?? 'Desconhecido') : 'Sem departamento';

      if (!map.has(key)) {
        map.set(key, { nome, total: 0, ganhos: 0, valorTotal: 0 });
      }
      const entry = map.get(key)!;
      entry.total++;
      if (lead.status === 'ganho') entry.ganhos++;
      entry.valorTotal += lead.expected_value ?? lead.valor_causa ?? 0;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [leads, deptoMap]);

  /* ── Section 3: Metricas por Responsavel (active leads only) ── */
  const respMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; atribuidos: number; ganhos: number; perdidos: number }>();

    for (const lead of leads.filter(l => !l.arquivado_em)) {
      const key = lead.responsavel_id ?? '__sem_resp__';
      const nome = lead.responsavel_id ? (memberMap.get(lead.responsavel_id) ?? 'Desconhecido') : 'Sem responsavel';

      if (!map.has(key)) {
        map.set(key, { nome, atribuidos: 0, ganhos: 0, perdidos: 0 });
      }
      const entry = map.get(key)!;
      entry.atribuidos++;
      if (lead.status === 'ganho') entry.ganhos++;
      if (lead.status === 'perdido') entry.perdidos++;
    }

    return Array.from(map.values()).sort((a, b) => b.atribuidos - a.atribuidos);
  }, [leads, memberMap]);

  /* ── Section 4: Funil por Etapa (active leads only) ── */
  const funnelData = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const lead of leads.filter(l => !l.arquivado_em)) {
      const status = lead.status ?? 'novo';
      countMap.set(status, (countMap.get(status) ?? 0) + 1);
    }

    return PIPELINE_STAGES.map(stage => ({
      name: stage.title,
      value: countMap.get(stage.id) ?? 0,
      color: STAGE_COLORS[stage.color]?.hex ?? '#6b7280',
      id: stage.id,
    }));
  }, [leads]);

  /* ── Section 5: Performance por Origem ── */
  const origemMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; ganhos: number }>();

    for (const lead of leads) {
      const origem = lead.origem ?? 'Nao informado';
      if (!map.has(origem)) {
        map.set(origem, { nome: origem, total: 0, ganhos: 0 });
      }
      const entry = map.get(origem)!;
      entry.total++;
      if (lead.status === 'ganho') entry.ganhos++;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [leads]);

  /* ── Section 6: Arquivamentos por Motivo ── */
  const arquivamentoData = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of leads) {
      if (!lead.arquivado_em) continue;
      const raw = lead.motivo_arquivamento;
      const parts = raw ? raw.split(' \u2014 ') : [];
      const rawMotivo = (parts[0] ?? '').trim() || 'sem_motivo';
      const label = raw ? (MOTIVOS_MAP[rawMotivo] ?? rawMotivo) : 'Sem motivo';
      map.set(label, (map.get(label) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  /* ── Empty state ── */
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

      {/* ── Section 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Leads Ativos</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.ativos}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Excluindo arquivados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Taxa de Conversão</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.taxaConversao}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">{kpis.ganhos} de {kpis.ativos} leads ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tempo Médio no Funil</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.tempoMedioFunil} dias</p>
            <p className="text-[11px] text-muted-foreground mt-1">Da criação ao ganho</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50/50 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Leads Arquivados</span>
              <Archive className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.arquivados}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Total arquivados</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Metricas por Departamento ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-500" />
            Métricas por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deptoMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deptoMetrics.map((d) => (
                <div
                  key={d.nome}
                  className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{d.nome}</span>
                    <Badge variant="secondary" className="text-[10px]">{d.total} leads</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Ganhos</p>
                      <p className="font-semibold text-emerald-600">{d.ganhos}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversão</p>
                      <p className="font-semibold">{pct(d.ganhos, d.total)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold">
                        {d.valorTotal > 0 ? `R$ ${d.valorTotal.toLocaleString('pt-BR')}` : '-'}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={d.total > 0 ? (d.ganhos / d.total) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Metricas por Responsavel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-500" />
            Métricas por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          {respMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Responsável</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Atribuídos</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Ganhos</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Perdidos</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {respMetrics.map((r) => (
                    <tr key={r.nome} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{r.nome}</td>
                      <td className="py-2.5 px-3 text-center">{r.atribuidos}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                          {r.ganhos}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">
                          {r.perdidos}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">{pct(r.ganhos, r.atribuidos)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 4: Funil de Conversao por Etapa ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Funil de Conversão por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData.every(d => d.value === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead no funil.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry) => (
                    <Cell key={`cell-${entry.id}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Performance por Origem ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-500" />
            Performance por Origem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {origemMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Origem</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Leads</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Ganhos</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {origemMetrics.map((o) => (
                    <tr key={o.nome} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-medium capitalize">{o.nome}</td>
                      <td className="py-2.5 px-3 text-center">{o.total}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                          {o.ganhos}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">{pct(o.ganhos, o.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 6: Arquivamentos por Motivo ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileX className="h-4 w-4 text-rose-500" />
            Arquivamentos por Motivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {arquivamentoData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead arquivado.</p>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={280} className="max-w-[340px]">
                <PieChart>
                  <Pie
                    data={arquivamentoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {arquivamentoData.map((_, idx) => (
                      <Cell key={`pie-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 space-y-2 w-full">
                {arquivamentoData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-sm flex-1 truncate">{item.name}</span>
                    <Badge variant="outline" className="text-[10px]">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricasOperacionais;
