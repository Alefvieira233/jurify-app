/**
 * @module useLogsExecucao
 * @description Hook para consultar e gerenciar logs de execucao dos agentes de IA.
 * Fornece listagem com estatisticas (total, sucessos, erros, tempo medio),
 * busca por agente especifico e limpeza de logs antigos (30+ dias).
 *
 * @example
 * ```tsx
 * const { logs, stats, fetchLogs, limparLogs } = useLogsExecucao();
 * ```
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const logger = createLogger('LogsExecucao');

interface LogExecucao {
  agente_id: string;
  input_recebido: string;
  resposta_ia: string | null;
  status: 'success' | 'error' | 'processing';
  tempo_execucao: number | null;
  erro_detalhes: string | null;
  api_key_usado: string | null;
  created_at: string;
  agentes_ia?: {
    nome: string;
    tipo_agente: string;
  };
}

function computeStats(logs: LogExecucao[]) {
  const total = logs.length;
  const sucessos = logs.filter(l => l.status === 'success').length;
  const erros = logs.filter(l => l.status === 'error').length;
  const temposValidos = logs.filter(l => l.tempo_execucao).map(l => l.tempo_execucao!);
  const tempoMedio = temposValidos.length > 0
    ? temposValidos.reduce((acc, t) => acc + t, 0) / temposValidos.length
    : 0;
  return { total, sucessos, erros, tempoMedio };
}

export const useLogsExecucao = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.logsExecucao.list(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs_execucao_agentes')
        .select(`
          *,
          agentes_ia:agente_id (
            nome,
            tipo_agente
          )
        `)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return ((data || []) as LogExecucao[]).map(log => ({
        ...log,
        status: log.status
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = computeStats(logs);

  const fetchLogs = useCallback(async (limite = 50) => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('logs_execucao_agentes')
        .select(`
          *,
          agentes_ia:agente_id (
            nome,
            tipo_agente
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) throw error;

      const transformedData: LogExecucao[] = (data || []).map(log => ({
        ...log,
        status: log.status as 'success' | 'error' | 'processing'
      }));

      queryClient.setQueryData(['logs-execucao', tenantId], transformedData);
    } catch (error) {
      logger.error('Erro ao buscar logs', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs de execucao',
        variant: 'destructive',
      });
    }
  }, [tenantId, queryClient, toast]);

  const buscarLogsPorAgente = async (agenteId: string) => {
    if (!tenantId) return [];

    try {
      const { data, error } = await supabase
        .from('logs_execucao_agentes')
        .select(`
          *,
          agentes_ia:agente_id (
            nome,
            tipo_agente
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('agente_id', agenteId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedData: LogExecucao[] = (data || []).map(log => ({
        ...log,
        status: log.status as 'success' | 'error' | 'processing'
      }));

      return transformedData;
    } catch (error) {
      logger.error('Erro ao buscar logs por agente', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs do agente',
        variant: 'destructive',
      });
      return [];
    }
  };

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('logs_execucao_agentes')
        .delete()
        .eq('tenant_id', tenantId!)
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.logsExecucao.list(tenantId) });
      toast({ title: 'Sucesso', description: 'Logs antigos removidos com sucesso' });
    },
    onError: (error) => {
      logger.error('Erro ao limpar logs', error);
      toast({ title: 'Erro', description: 'Nao foi possivel limpar os logs', variant: 'destructive' });
    },
  });

  const limparLogs = async () => {
    if (!tenantId) return;
    await clearMutation.mutateAsync();
  };

  return {
    logs,
    loading,
    stats,
    fetchLogs,
    buscarLogsPorAgente,
    limparLogs,
    refetch: fetchLogs,
  };
};
