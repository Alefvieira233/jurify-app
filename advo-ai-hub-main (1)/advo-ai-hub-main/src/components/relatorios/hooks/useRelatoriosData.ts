import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PeriodoFiltro = 'mes' | 'trimestre' | 'ano' | 'personalizado';

function getDataInicio(periodo: PeriodoFiltro): string {
  const agora = new Date();
  switch (periodo) {
    case 'mes':
      return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    case 'trimestre': {
      const mesAtual = agora.getMonth();
      const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
      return new Date(agora.getFullYear(), inicioTrimestre, 1).toISOString();
    }
    case 'ano':
      return new Date(agora.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  }
}

export const useKPIs = (periodo: PeriodoFiltro, areaJuridica: string, origemLead: string) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  return useQuery({
    queryKey: ['kpis-gerais', tenantId, periodo, areaJuridica, origemLead],
    queryFn: async () => {
      if (!tenantId) {
        return {
          totalLeads: 0,
          contratosAssinados: 0,
          valorTotalContratos: 0,
          taxaConversao: 0
        };
      }

      const baseInicio = getDataInicio(periodo);

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, created_at, area_juridica, origem')
        .eq('tenant_id', tenantId)
        .gte('created_at', baseInicio);

      if (areaJuridica !== 'todas') {
        leadsQuery = leadsQuery.eq('area_juridica', areaJuridica);
      }

      if (origemLead !== 'todas') {
        leadsQuery = leadsQuery.eq('origem', origemLead);
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      const { data: contratos, error: contratosError } = await supabase
        .from('contratos')
        .select('id, status, status_assinatura, valor_causa, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', baseInicio);

      if (contratosError) throw contratosError;

      const totalLeads = leads?.length || 0;
      const contratosAssinados = contratos?.filter(c => c?.status === 'assinado' || c?.status_assinatura === 'assinado').length || 0;
      const valorTotalContratos = contratos?.reduce((sum, c) => sum + (c?.valor_causa || 0), 0) || 0;
      const taxaConversao = totalLeads > 0 ? (contratosAssinados / totalLeads * 100) : 0;

      return {
        totalLeads,
        contratosAssinados,
        valorTotalContratos,
        taxaConversao
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
};

export const useFunilData = (periodo: PeriodoFiltro, areaJuridica: string, origemLead: string) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  return useQuery({
    queryKey: ['dados-funil', tenantId, periodo, areaJuridica, origemLead],
    queryFn: async () => {
      if (!tenantId) {
        return {
          novo_lead: 0,
          em_qualificacao: 0,
          proposta_enviada: 0,
          contrato_assinado: 0,
          em_atendimento: 0,
          lead_perdido: 0
        };
      }

      let query = supabase
        .from('leads')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('created_at', getDataInicio(periodo));

      if (areaJuridica !== 'todas') {
        query = query.eq('area_juridica', areaJuridica);
      }

      if (origemLead !== 'todas') {
        query = query.eq('origem', origemLead);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contadores = {
        novo_lead: 0,
        em_qualificacao: 0,
        proposta_enviada: 0,
        contrato_assinado: 0,
        em_atendimento: 0,
        lead_perdido: 0
      };

      if (data && Array.isArray(data)) {
        data.forEach(lead => {
          if (lead?.status && Object.prototype.hasOwnProperty.call(contadores, lead.status)) {
            contadores[lead.status as keyof typeof contadores]++;
          }
        });
      }

      return contadores;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
};

export const useAreaJuridicaData = (periodo: PeriodoFiltro, origemLead: string) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  return useQuery({
    queryKey: ['dados-area-juridica', tenantId, periodo, origemLead],
    queryFn: async () => {
      if (!tenantId) {
        return {} as Record<string, number>;
      }

      let query = supabase
        .from('leads')
        .select('area_juridica')
        .eq('tenant_id', tenantId)
        .gte('created_at', getDataInicio(periodo));

      if (origemLead !== 'todas') {
        query = query.eq('origem', origemLead);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contadores: Record<string, number> = {};
      if (data && Array.isArray(data)) {
        data.forEach(lead => {
          if (lead?.area_juridica) {
            contadores[lead.area_juridica] = (contadores[lead.area_juridica] || 0) + 1;
          }
        });
      }

      return contadores;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
};

export const useOrigemData = (periodo: PeriodoFiltro, areaJuridica: string) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  return useQuery({
    queryKey: ['dados-origem', tenantId, periodo, areaJuridica],
    queryFn: async () => {
      if (!tenantId) {
        return {} as Record<string, number>;
      }

      let query = supabase
        .from('leads')
        .select('origem')
        .eq('tenant_id', tenantId)
        .gte('created_at', getDataInicio(periodo));

      if (areaJuridica !== 'todas') {
        query = query.eq('area_juridica', areaJuridica);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contadores: Record<string, number> = {};
      if (data && Array.isArray(data)) {
        data.forEach(lead => {
          if (lead?.origem) {
            contadores[lead.origem] = (contadores[lead.origem] || 0) + 1;
          }
        });
      }

      return contadores;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
};
