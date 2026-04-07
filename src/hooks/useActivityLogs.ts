/** Manages activity log queries and logging for audit trail tracking. */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('ActivityLogs');

export interface LogAtividade {
  id: string;
  usuario_id: string;
  nome_usuario: string;
  tipo_acao: 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro';
  modulo: string;
  descricao: string;
  data_hora: string;
  ip_usuario?: string;
  detalhes_adicionais?: Record<string, unknown> | null;
}

export interface FiltrosLog {
  usuario_id?: string;
  tipo_acao?: string;
  modulo?: string;
  data_inicio?: string;
  data_fim?: string;
}

export const useActivityLogs = () => {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchLogsRpc = useCallback(async (
    limite = 50,
    offset = 0,
    filtros: FiltrosLog = {}
  ) => {
    if (!user || !tenantId) return { logs: [] as LogAtividade[], totalCount: 0 };

    const { data, error } = await supabase.rpc('buscar_logs_atividades', {
      _limite: limite,
      _offset: offset,
      _usuario_id: filtros.usuario_id ?? undefined,
      _tipo_acao: (filtros.tipo_acao as 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro') ?? undefined,
      _modulo: filtros.modulo ?? undefined,
      _data_inicio: filtros.data_inicio ? new Date(filtros.data_inicio).toISOString() : undefined,
      _data_fim: filtros.data_fim ? new Date(filtros.data_fim).toISOString() : undefined,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return { logs: data as LogAtividade[], totalCount: data[0]?.total_count || 0 };
    }
    return { logs: [] as LogAtividade[], totalCount: 0 };
  }, [user, tenantId]);

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: queryKeys.activityLogs.list(tenantId ?? undefined),
    queryFn: () => fetchLogsRpc(),
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const logs = queryData?.logs ?? [];
  const totalCount = queryData?.totalCount ?? 0;

  const fetchLogs = useCallback(async (
    limite = 50,
    offset = 0,
    filtros: FiltrosLog = {}
  ) => {
    if (!user || !tenantId) return;

    try {
      const result = await fetchLogsRpc(limite, offset, filtros);
      queryClient.setQueryData(queryKeys.activityLogs.list(tenantId), result);
    } catch (error) {
      log.error('Erro ao buscar logs', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs de atividade.',
        variant: 'destructive',
      });
    }
  }, [user, tenantId, fetchLogsRpc, queryClient, toast]);

  const logActivity = async (
    tipo_acao: 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro',
    modulo: string,
    descricao: string,
    detalhes_adicionais?: Record<string, unknown> | null
  ) => {
    if (!user || !tenantId) return;

    try {
      const { error } = await supabase.rpc('registrar_log_atividade', {
        _usuario_id: user.id,
        _nome_usuario: profile?.nome_completo || user.email || 'Usuário',
        _tipo_acao: tipo_acao,
        _modulo: modulo,
        _descricao: descricao,
        _ip_usuario: 'client-side',
        _detalhes_adicionais: (detalhes_adicionais ?? undefined) as Json | undefined
      });

      if (error) throw error;
    } catch (error) {
      log.error('Erro ao registrar log', error);
    }
  };

  const clearOldLogs = async (diasAntigos = 90) => {
    if (!user || !tenantId) return false;

    try {
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - diasAntigos);

      const { error } = await supabase
        .from('logs_atividades')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('data_hora', dataCorte.toISOString());

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Logs antigos (${diasAntigos} dias) removidos com sucesso.`,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs.list(tenantId) });
      return true;
    } catch (error) {
      log.error('Erro ao limpar logs', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel limpar os logs antigos.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const exportLogs = async (filtros: FiltrosLog = {}) => {
    if (!user || !tenantId) return;

    try {
      const { data, error } = await supabase.rpc('buscar_logs_atividades', {
        _limite: 10000,
        _offset: 0,
        _usuario_id: filtros.usuario_id ?? undefined,
        _tipo_acao: (filtros.tipo_acao as 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro') ?? undefined,
        _modulo: filtros.modulo ?? undefined,
        _data_inicio: filtros.data_inicio ? new Date(filtros.data_inicio).toISOString() : undefined,
        _data_fim: filtros.data_fim ? new Date(filtros.data_fim).toISOString() : undefined,
      });

      if (error) throw error;

      // Sanitize CSV field to prevent formula injection (=, +, -, @, tab, CR)
      const csvSafe = (val: string): string => {
        let safe = val.replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
        return `"${safe}"`;
      };

      const headers = ['Data/Hora', 'Usuario', 'Tipo Acao', 'Modulo', 'Descricao', 'IP'];
      const csvContent = [
        headers.join(','),
        ...data.map((log: { data_hora: string; nome_usuario: string; tipo_acao: string; modulo: string; descricao: string; ip_usuario: string | null }) => [
          csvSafe(new Date(log.data_hora).toLocaleString('pt-BR')),
          csvSafe(log.nome_usuario),
          csvSafe(log.tipo_acao),
          csvSafe(log.modulo),
          csvSafe(log.descricao),
          csvSafe(log.ip_usuario || '')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `logs_atividade_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'Sucesso',
        description: 'Logs exportados com sucesso!',
      });
    } catch (error) {
      log.error('Erro ao exportar logs', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel exportar os logs.',
        variant: 'destructive',
      });
    }
  };

  return {
    logs,
    loading,
    totalCount,
    fetchLogs,
    logActivity,
    clearOldLogs,
    exportLogs,
    refetch: () => fetchLogs(),
  };
};
