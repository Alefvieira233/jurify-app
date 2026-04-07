/** Fetches and computes AI agent execution metrics (today, monthly, top agent). */

import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentesMetrics');

interface AgentesMetrics {
  execucoesHoje: number;
  ultimaExecucao: string | null;
  execucoesMes: number;
  tempoMedioResposta: number;
  sucessoRate: number;
  agenteMaisAtivo: string | null;
}

export const useAgentesMetrics = () => {
  const [metrics, setMetrics] = useState<AgentesMetrics>({
    execucoesHoje: 0,
    ultimaExecucao: null,
    execucoesMes: 0,
    tempoMedioResposta: 0,
    sucessoRate: 0,
    agenteMaisAtivo: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useAuth();

  const fetchMetrics = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Fetch month data (superset) and last execution in parallel — 2 queries instead of 4
      // The month query includes today's data, so we derive today's count client-side
      const [mesResult, ultimaResult] = await Promise.all([
        supabase
          .from('agent_ai_logs')
          .select('agent_name, status, latency_ms, created_at')
          .eq('tenant_id', profile.tenant_id)
          .gte('created_at', inicioMes.toISOString()),
        supabase
          .from('agent_ai_logs')
          .select('created_at')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (mesResult.error) throw mesResult.error;
      if (ultimaResult.error) throw ultimaResult.error;

      const allMesRows = mesResult.data || [];
      const inicioHojeISO = inicioHoje.toISOString();

      // Derive today's successful executions from the month data
      const execucoesHojeCount = allMesRows.filter(
        (row) => row.created_at >= inicioHojeISO && row.status === 'success'
      ).length;
      const execucoesMesCount = allMesRows.length;

      // Tempo medio de resposta (em ms)
      const temposExecucao = allMesRows.map(row => row.latency_ms).filter((v): v is number => v != null);
      const tempoMedioResposta = temposExecucao.length > 0
        ? Math.round(temposExecucao.reduce((a, b) => a + b, 0) / temposExecucao.length)
        : 0;

      // Taxa de sucesso
      const execucoesSucesso = allMesRows.filter(row => ['success', 'completed'].includes(row.status ?? '')).length;
      const sucessoRate = execucoesMesCount > 0
        ? Math.round((execucoesSucesso / execucoesMesCount) * 100)
        : 0;

      // Agente mais ativo (derived from the same month data with join)
      const agenteCounts: Record<string, { count: number; nome: string }> = {};
      allMesRows.forEach(row => {
        const agentName = row.agent_name;
        if (agentName) {
          if (!agenteCounts[agentName]) {
            agenteCounts[agentName] = { count: 0, nome: agentName };
          }
          agenteCounts[agentName].count++;
        }
      });

      const maisAtivo = Object.values(agenteCounts).reduce((max, current) =>
        current.count > max.count ? current : max, { count: 0, nome: null as string | null }
      );

      setMetrics({
        execucoesHoje: execucoesHojeCount,
        ultimaExecucao: ultimaResult.data?.created_at || null,
        execucoesMes: execucoesMesCount,
        tempoMedioResposta,
        sucessoRate,
        agenteMaisAtivo: maisAtivo.nome
      });
    } catch (error) {
      log.error('Erro ao buscar metricas dos agentes', error);
      setError('Erro ao carregar metricas dos agentes');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  // Formatar ultima execucao
  const getUltimaExecucaoFormatada = (): string => {
    if (!metrics.ultimaExecucao) return 'Nunca';

    const agora = new Date();
    const ultimaExec = new Date(metrics.ultimaExecucao);
    const diffMs = agora.getTime() - ultimaExec.getTime();

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutos < 1) return 'Agora mesmo';
    if (minutos < 60) return `Ha ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    if (horas < 24) return `Ha ${horas} hora${horas > 1 ? 's' : ''}`;
    return `Ha ${dias} dia${dias > 1 ? 's' : ''}`;
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics: fetchMetrics,
    ultimaExecucaoFormatada: getUltimaExecucaoFormatada()
  };
};
