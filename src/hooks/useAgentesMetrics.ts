import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const fetchMetrics = async () => {
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

      // Buscar execucoes de hoje
      const { data: execucoesHoje, error: errorHoje } = await supabase
        .from('logs_execucao_agentes')
        .select('id, status, tempo_execucao, created_at')
        .eq('tenant_id', profile.tenant_id)
        .gte('created_at', inicioHoje.toISOString())
        .eq('status', 'sucesso');

      if (errorHoje) throw errorHoje;

      // Buscar execucoes do mes
      const { data: execucoesMes, error: errorMes } = await supabase
        .from('logs_execucao_agentes')
        .select('id, status, tempo_execucao, created_at')
        .eq('tenant_id', profile.tenant_id)
        .gte('created_at', inicioMes.toISOString());

      if (errorMes) throw errorMes;

      // Buscar ultima execucao
      const { data: ultimaExecucao, error: errorUltima } = await supabase
        .from('logs_execucao_agentes')
        .select('created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (errorUltima && errorUltima.code !== 'PGRST116') {
        throw errorUltima;
      }

      // Buscar agente mais ativo
      const { data: agenteMaisAtivo, error: errorAgente } = await supabase
        .from('logs_execucao_agentes')
        .select('agente_id, agentes_ia:agente_id(nome)')
        .eq('tenant_id', profile.tenant_id)
        .gte('created_at', inicioMes.toISOString());

      if (errorAgente) throw errorAgente;

      // Calcular metricas
      const execucoesHojeCount = execucoesHoje?.length || 0;
      const execucoesMesCount = execucoesMes?.length || 0;

      // Tempo medio de resposta (em ms)
      const temposExecucao = execucoesMes?.map(log => log.tempo_execucao).filter(Boolean) || [];
      const tempoMedioResposta = temposExecucao.length > 0
        ? Math.round(temposExecucao.reduce((a, b) => a + b, 0) / temposExecucao.length)
        : 0;

      // Taxa de sucesso
      const execucoesSucesso = execucoesMes?.filter(log => log.status === 'sucesso').length || 0;
      const sucessoRate = execucoesMesCount > 0
        ? Math.round((execucoesSucesso / execucoesMesCount) * 100)
        : 0;

      // Agente mais ativo
      const agenteCounts: Record<string, { count: number; nome: string }> = {};
      agenteMaisAtivo?.forEach(log => {
        const agentId = log.agente_id as string | null;
        const agentNome = (log.agentes_ia as any)?.nome || 'Agente Desconhecido';
        if (agentId) {
          if (!agenteCounts[agentId]) {
            agenteCounts[agentId] = { count: 0, nome: agentNome };
          }
          agenteCounts[agentId].count++;
        }
      });

      const maisAtivo = Object.values(agenteCounts).reduce((max, current) =>
        current.count > max.count ? current : max, { count: 0, nome: null as string | null }
      );

      setMetrics({
        execucoesHoje: execucoesHojeCount,
        ultimaExecucao: ultimaExecucao?.created_at || null,
        execucoesMes: execucoesMesCount,
        tempoMedioResposta,
        sucessoRate,
        agenteMaisAtivo: maisAtivo.nome
      });
    } catch (error) {
      console.error('[useAgentesMetrics] Erro ao buscar metricas dos agentes:', error);
      setError('Erro ao carregar metricas dos agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [profile?.tenant_id]);

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