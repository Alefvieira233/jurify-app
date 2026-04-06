import { useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/features/pipeline/pipelineConfig';
import { MOTIVOS_ARQUIVAMENTO } from '@/types/crm-operacional';

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

const MOTIVOS_MAP = Object.fromEntries(
  MOTIVOS_ARQUIVAMENTO.map(m => [m.value, m.label]),
);

export function useMetricasData() {
  const { leads, loading } = useLeads();
  const { departamentos } = useDepartamentos();
  const { members } = useTeamMembers();

  const deptoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departamentos) map.set(d.id, d.nome);
    return map;
  }, [departamentos]);

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(m.id, m.nome_completo ?? 'Sem nome');
    return map;
  }, [members]);

  const kpis = useMemo(() => {
    const ativos = leads.filter(l => !l.arquivado_em);
    const ganhos = ativos.filter(l => l.status === 'ganho');
    const arquivados = leads.filter(l => !!l.arquivado_em);

    const ganhosComWon = ganhos.filter(l => l.won_at);
    const avgDays = ganhosComWon.length > 0
      ? Math.round(ganhosComWon.reduce((sum, l) => sum + daysBetween(l.created_at, l.won_at!), 0) / ganhosComWon.length)
      : 0;

    const taxaConversao = ativos.length > 0
      ? ((ganhos.length / ativos.length) * 100).toFixed(1)
      : '0';

    return { ativos: ativos.length, taxaConversao, tempoMedioFunil: avgDays, arquivados: arquivados.length, ganhos: ganhos.length };
  }, [leads]);

  const deptoMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; ganhos: number; valorTotal: number }>();
    for (const lead of leads.filter(l => !l.arquivado_em)) {
      const key = lead.departamento_id ?? '__sem_depto__';
      const nome = lead.departamento_id ? (deptoMap.get(lead.departamento_id) ?? 'Desconhecido') : 'Sem departamento';
      if (!map.has(key)) map.set(key, { nome, total: 0, ganhos: 0, valorTotal: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (lead.status === 'ganho') entry.ganhos++;
      entry.valorTotal += lead.expected_value ?? lead.valor_causa ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [leads, deptoMap]);

  const respMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; atribuidos: number; ganhos: number; perdidos: number }>();
    for (const lead of leads.filter(l => !l.arquivado_em)) {
      const key = lead.responsavel_id ?? '__sem_resp__';
      const nome = lead.responsavel_id ? (memberMap.get(lead.responsavel_id) ?? 'Desconhecido') : 'Sem responsavel';
      if (!map.has(key)) map.set(key, { nome, atribuidos: 0, ganhos: 0, perdidos: 0 });
      const entry = map.get(key)!;
      entry.atribuidos++;
      if (lead.status === 'ganho') entry.ganhos++;
      if (lead.status === 'perdido') entry.perdidos++;
    }
    return Array.from(map.values()).sort((a, b) => b.atribuidos - a.atribuidos);
  }, [leads, memberMap]);

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

  const origemMetrics = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; ganhos: number }>();
    for (const lead of leads) {
      const origem = lead.origem ?? 'Nao informado';
      if (!map.has(origem)) map.set(origem, { nome: origem, total: 0, ganhos: 0 });
      const entry = map.get(origem)!;
      entry.total++;
      if (lead.status === 'ganho') entry.ganhos++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [leads]);

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

  return { leads, loading, kpis, deptoMetrics, respMetrics, funnelData, origemMetrics, arquivamentoData };
}
