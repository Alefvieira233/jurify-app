import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const { toast } = useToast();

  const fetchLogs = useCallback(async (
    limite = 50,
    offset = 0,
    filtros: FiltrosLog = {}
  ) => {
    if (!user || !tenantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('buscar_logs_atividades', {
        _limite: limite,
        _offset: offset,
        _usuario_id: filtros.usuario_id || null,
        _tipo_acao: (filtros.tipo_acao as 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro') || null,
        _modulo: filtros.modulo || null,
        _data_inicio: filtros.data_inicio ? new Date(filtros.data_inicio).toISOString() : null,
        _data_fim: filtros.data_fim ? new Date(filtros.data_fim).toISOString() : null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setLogs(data);
        setTotalCount(data[0]?.total_count || 0);
      } else {
        setLogs([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar os logs de atividade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, toast]);

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
        _detalhes_adicionais: detalhes_adicionais
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao registrar log:', error);
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

      await fetchLogs();
      return true;
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
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
        _usuario_id: filtros.usuario_id || null,
        _tipo_acao: (filtros.tipo_acao as 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro') || null,
        _modulo: filtros.modulo || null,
        _data_inicio: filtros.data_inicio ? new Date(filtros.data_inicio).toISOString() : null,
        _data_fim: filtros.data_fim ? new Date(filtros.data_fim).toISOString() : null
      });

      if (error) throw error;

      const headers = ['Data/Hora', 'Usuario', 'Tipo Acao', 'Modulo', 'Descricao', 'IP'];
      const csvContent = [
        headers.join(','),
        ...data.map((log: { data_hora: string; nome_usuario: string; tipo_acao: string; modulo: string; descricao: string; ip_usuario: string | null }) => [
          new Date(log.data_hora).toLocaleString('pt-BR'),
          log.nome_usuario,
          log.tipo_acao,
          log.modulo,
          `"${log.descricao.replace(/"/g, '""')}"`,
          log.ip_usuario || ''
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
      console.error('Erro ao exportar logs:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel exportar os logs.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      void fetchLogs();
    }
  }, [fetchLogs, user]);

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
