import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  totalLeads: number;
  leadsNovoMes: number;
  contratos: number;
  contratosAssinados: number;
  agendamentos: number;
  agendamentosHoje: number;
  agentesAtivos: number;
  execucoesAgentesHoje: number;
  leadsPorStatus: {
    novo_lead: number;
    em_qualificacao: number;
    proposta_enviada: number;
    contrato_assinado: number;
    em_atendimento: number;
    lead_perdido: number;
  };
  leadsPorArea: Array<{
    area: string;
    total: number;
  }>;
  execucoesRecentesAgentes: Array<{
    agente_nome: string;
    total_execucoes: number;
    sucesso: number;
    erro: number;
  }>;
}

const DEFAULT_METRICS: DashboardMetrics = {
  totalLeads: 0,
  leadsNovoMes: 0,
  contratos: 0,
  contratosAssinados: 0,
  agendamentos: 0,
  agendamentosHoje: 0,
  agentesAtivos: 0,
  execucoesAgentesHoje: 0,
  leadsPorStatus: {
    novo_lead: 0,
    em_qualificacao: 0,
    proposta_enviada: 0,
    contrato_assinado: 0,
    em_atendimento: 0,
    lead_perdido: 0,
  },
  leadsPorArea: [],
  execucoesRecentesAgentes: [],
};

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics(DEFAULT_METRICS);
      setLoading(false);
      return;
    }

    try {
      console.log('[useDashboardMetrics] Carregando metricas do dashboard...');
      setLoading(true);
      setError(null);

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      const tenantId = profile?.tenant_id;

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, created_at, area_juridica');

      let contratosQuery = supabase
        .from('contratos')
        .select('id, status_assinatura, created_at');

      let agendamentosQuery = supabase
        .from('agendamentos')
        .select('id, data_hora, created_at');

      let agentesQuery = supabase
        .from('agentes_ia')
        .select('id, status, created_at');

      if (tenantId) {
        leadsQuery = leadsQuery.eq('tenant_id', tenantId);
        contratosQuery = contratosQuery.eq('tenant_id', tenantId);
        agendamentosQuery = agendamentosQuery.eq('tenant_id', tenantId);
        agentesQuery = agentesQuery.eq('tenant_id', tenantId);
      }

      // Executar queries sequencialmente com tratamento silencioso de erros
      let leads: any[] = [];
      let contratos: any[] = [];
      let agendamentos: any[] = [];
      let agentes: any[] = [];

      try { const r = await leadsQuery; leads = r.data || []; } catch { leads = []; }
      try { const r = await contratosQuery; contratos = r.data || []; } catch { contratos = []; }
      try { const r = await agendamentosQuery; agendamentos = r.data || []; } catch { agendamentos = []; }
      try { const r = await agentesQuery; agentes = r.data || []; } catch { agentes = []; }

      // TODO: Criar tabelas agent_executions e logs_execucao_agentes no banco
      const execucoes: any[] = [];

      const leadsNovoMes = leads.filter(lead =>
        new Date(lead.created_at) >= inicioMes
      ).length;

      const leadsPorStatus = {
        novo_lead: leads.filter(l => l.status === 'novo_lead').length,
        em_qualificacao: leads.filter(l => l.status === 'em_qualificacao').length,
        proposta_enviada: leads.filter(l => l.status === 'proposta_enviada').length,
        contrato_assinado: leads.filter(l => l.status === 'contrato_assinado').length,
        em_atendimento: leads.filter(l => l.status === 'em_atendimento').length,
        lead_perdido: leads.filter(l => l.status === 'lead_perdido').length,
      };

      const areasMap = new Map<string, number>();
      leads.forEach(lead => {
        const area = lead.area_juridica || 'Nao informado';
        areasMap.set(area, (areasMap.get(area) || 0) + 1);
      });
      const leadsPorArea = Array.from(areasMap.entries()).map(([area, total]) => ({
        area,
        total
      })).slice(0, 10);

      const contratosAssinados = contratos.filter(contrato =>
        contrato.status_assinatura === 'assinado'
      ).length;

      const agendamentosHoje = agendamentos.filter(agendamento => {
        const dataAgendamento = new Date(agendamento.data_hora);
        return dataAgendamento >= inicioHoje && dataAgendamento < new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);
      }).length;

      const agentesAtivos = agentes.filter(agente => agente.status === 'ativo').length;

      const execucoesAgentesHoje = execucoes.filter(execucao => {
        const dataExecucao = new Date(execucao.created_at);
        return dataExecucao >= inicioHoje;
      }).length;

      const execucoesPorAgente = new Map<string, { agente_nome: string; total_execucoes: number; sucesso: number; erro: number }>();

      execucoes.forEach(execucao => {
        let nomeAgente = 'Agente Desconhecido';

        if (execucao.agentes_ia && typeof execucao.agentes_ia === 'object' && 'nome' in execucao.agentes_ia) {
          nomeAgente = execucao.agentes_ia.nome;
        } else if (execucao.current_agent) {
          nomeAgente = execucao.current_agent;
        } else if (execucao.agents_involved && Array.isArray(execucao.agents_involved) && execucao.agents_involved.length > 0) {
          nomeAgente = execucao.agents_involved[0];
        }

        const current = execucoesPorAgente.get(nomeAgente) || {
          agente_nome: nomeAgente,
          total_execucoes: 0,
          sucesso: 0,
          erro: 0
        };

        current.total_execucoes++;
        if (execucao.status === 'success' || execucao.status === 'completed' || execucao.status === 'sucesso') {
          current.sucesso++;
        }
        if (execucao.status === 'error' || execucao.status === 'failed' || execucao.status === 'erro') {
          current.erro++;
        }

        execucoesPorAgente.set(nomeAgente, current);
      });

      const execucoesRecentesAgentes = Array.from(execucoesPorAgente.values())
        .sort((a, b) => b.total_execucoes - a.total_execucoes)
        .slice(0, 5);

      const finalMetrics: DashboardMetrics = {
        totalLeads: leads.length,
        leadsNovoMes,
        contratos: contratos.length,
        contratosAssinados,
        agendamentos: agendamentos.length,
        agendamentosHoje,
        agentesAtivos,
        execucoesAgentesHoje,
        leadsPorStatus,
        leadsPorArea,
        execucoesRecentesAgentes,
      };

      setMetrics(finalMetrics);
      console.log('[useDashboardMetrics] Metricas carregadas:', finalMetrics);
    } catch (error: unknown) {
      console.error('[useDashboardMetrics] Erro ao carregar metricas:', error);
      const message = error instanceof Error ? error.message : 'Erro ao conectar com banco de dados';
      setError(message);
      setMetrics(DEFAULT_METRICS);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.tenant_id]);

  const refetch = useCallback(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    void fetchMetrics();

    const interval = setInterval(() => {
      void fetchMetrics();
    }, 300000);
    const handleVisibility = () => {
      if (!document.hidden) {
        void fetchMetrics();
      }
    };
    const handleFocus = () => {
      void fetchMetrics();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch,
    isEmpty: !loading && !error && metrics.totalLeads === 0,
    isStale: false,
  };
};
