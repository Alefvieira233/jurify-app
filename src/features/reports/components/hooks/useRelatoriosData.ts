import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';

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
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
  const tenantId = profile?.tenant_id || null;
  const visibilityScope = getLeadVisibilityScope();
  const deptoIds = getUserDepartamentos();

  return useQuery({
    queryKey: queryKeys.kpisGerais.list(tenantId, periodo, areaJuridica, origemLead, visibilityScope),
    enabled: !!tenantId,
    queryFn: async () => {
      const baseInicio = getDataInicio(periodo);

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, created_at, area_juridica, origem')
        .eq('tenant_id', tenantId!)
        .gte('created_at', baseInicio);

      // Defense-in-depth: filter by visibility scope
      if (visibilityScope === 'own') {
        leadsQuery = leadsQuery.eq('responsavel_id', profile?.id ?? '');
      } else if (visibilityScope === 'department') {
        if (deptoIds.length > 0) {
          leadsQuery = leadsQuery.in('departamento_id', deptoIds);
        } else {
          leadsQuery = leadsQuery.eq('responsavel_id', profile?.id ?? '');
        }
      }

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
        .eq('tenant_id', tenantId!)
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
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
  const tenantId = profile?.tenant_id || null;
  const visibilityScope = getLeadVisibilityScope();
  const deptoIds = getUserDepartamentos();

  return useQuery({
    queryKey: queryKeys.dadosFunil.list(tenantId, periodo, areaJuridica, origemLead, visibilityScope),
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('status')
        .eq('tenant_id', tenantId!)
        .gte('created_at', getDataInicio(periodo));

      // Defense-in-depth: filter by visibility scope
      if (visibilityScope === 'own') {
        query = query.eq('responsavel_id', profile?.id ?? '');
      } else if (visibilityScope === 'department') {
        if (deptoIds.length > 0) {
          query = query.in('departamento_id', deptoIds);
        } else {
          query = query.eq('responsavel_id', profile?.id ?? '');
        }
      }

      if (areaJuridica !== 'todas') {
        query = query.eq('area_juridica', areaJuridica);
      }

      if (origemLead !== 'todas') {
        query = query.eq('origem', origemLead);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contadores = {
        novo: 0,
        em_contato: 0,
        qualificado: 0,
        proposta: 0,
        negociacao: 0,
        ganho: 0,
        perdido: 0,
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
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
  const tenantId = profile?.tenant_id || null;
  const visibilityScope = getLeadVisibilityScope();
  const deptoIds = getUserDepartamentos();

  return useQuery({
    queryKey: queryKeys.dadosAreaJuridica.list(tenantId, periodo, origemLead, visibilityScope),
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('area_juridica')
        .eq('tenant_id', tenantId!)
        .gte('created_at', getDataInicio(periodo));

      // Defense-in-depth: filter by visibility scope
      if (visibilityScope === 'own') {
        query = query.eq('responsavel_id', profile?.id ?? '');
      } else if (visibilityScope === 'department') {
        if (deptoIds.length > 0) {
          query = query.in('departamento_id', deptoIds);
        } else {
          query = query.eq('responsavel_id', profile?.id ?? '');
        }
      }

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
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
  const tenantId = profile?.tenant_id || null;
  const visibilityScope = getLeadVisibilityScope();
  const deptoIds = getUserDepartamentos();

  return useQuery({
    queryKey: queryKeys.dadosOrigem.list(tenantId, periodo, areaJuridica, visibilityScope),
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('origem')
        .eq('tenant_id', tenantId!)
        .gte('created_at', getDataInicio(periodo));

      // Defense-in-depth: filter by visibility scope
      if (visibilityScope === 'own') {
        query = query.eq('responsavel_id', profile?.id ?? '');
      } else if (visibilityScope === 'department') {
        if (deptoIds.length > 0) {
          query = query.in('departamento_id', deptoIds);
        } else {
          query = query.eq('responsavel_id', profile?.id ?? '');
        }
      }

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
