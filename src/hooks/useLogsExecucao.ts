import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LogExecucao {
  id: string;
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

export const useLogsExecucao = () => {
  const [logs, setLogs] = useState<LogExecucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    sucessos: 0,
    erros: 0,
    tempoMedio: 0,
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const fetchLogs = async (limite = 50) => {
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

      setLogs(transformedData);

      const total = transformedData.length;
      const sucessos = transformedData.filter(log => log.status === 'success').length;
      const erros = transformedData.filter(log => log.status === 'error').length;
      const temposValidos = transformedData.filter(log => log.tempo_execucao).map(log => log.tempo_execucao!) || [];
      const tempoMedio = temposValidos.length > 0
        ? temposValidos.reduce((acc, tempo) => acc + tempo, 0) / temposValidos.length
        : 0;

      setStats({ total, sucessos, erros, tempoMedio });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs de execucao',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Erro ao buscar logs por agente:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs do agente',
        variant: 'destructive',
      });
      return [];
    }
  };

  const limparLogs = async () => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('logs_execucao_agentes')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      await fetchLogs();
      toast({
        title: 'Sucesso',
        description: 'Logs antigos removidos com sucesso',
      });
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel limpar os logs',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantId]);

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