/**
 * useLeadAutoRouting — encapsulates the "auto-route lead by area juridica → departamento"
 * frontend control. Maps a lead's `area_juridica` to an existing departamento by name
 * (case + diacritic insensitive) and assigns the first active member of that departamento
 * as `responsavel_id`.
 *
 * Static fallback mapping is used because the project does not (yet) ship a
 * `routing_rules` DB table. When that table lands, this hook can be extended to fetch
 * dynamic rules without touching the call sites.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errorMessages';

const log = createLogger('useLeadAutoRouting');

/** Static fallback mapping from area_juridica slug → departamento name. */
const AREA_TO_DEPT: Record<string, string> = {
  trabalhista: 'Trabalhista',
  civel: 'Cível',
  criminal: 'Criminal',
  familia: 'Família',
  tributario: 'Tributário',
  previdenciario: 'Previdenciário',
  empresarial: 'Empresarial',
  consumidor: 'Consumidor',
  imobiliario: 'Imobiliário',
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export interface AutoRouteResult {
  departamentoId: string;
  responsavelId: string | null;
}

export function useLeadAutoRouting() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const tenantId = profile?.tenant_id;

  /** Map of area slug → departamento (computed once per render). */
  const availableRules = useMemo(() => {
    return Object.entries(AREA_TO_DEPT).map(([area, deptName]) => {
      const dept = activeDepartamentos.find(
        (d) => normalize(d.nome) === normalize(deptName),
      );
      return { area, deptName, departamentoId: dept?.id ?? null };
    });
  }, [activeDepartamentos]);

  const mutation = useMutation({
    mutationFn: async (vars: { leadId: string; areaJuridica: string | null }): Promise<AutoRouteResult> => {
      if (!tenantId) throw new Error('Tenant não identificado');
      if (!vars.areaJuridica) throw new Error('Lead sem área jurídica definida');

      const slug = normalize(vars.areaJuridica);
      const targetDeptName = AREA_TO_DEPT[slug];
      if (!targetDeptName) {
        throw new Error(`Não há regra de roteamento para a área "${vars.areaJuridica}"`);
      }

      const dept = activeDepartamentos.find(
        (d) => normalize(d.nome) === normalize(targetDeptName),
      );
      if (!dept) {
        throw new Error(`Departamento "${targetDeptName}" não cadastrado. Crie em Configurações → Empresa → Classes → Departamento.`);
      }

      // Pick first active member as default responsavel; fall back to depto's
      // configured responsavel_padrao_id if the team list is empty.
      const firstMember = members.find((m) => m.ativo);
      const responsavelId =
        dept.responsavel_padrao_id ?? firstMember?.id ?? null;

      const { error } = await supabase
        .from('leads')
        .update({
          departamento_id: dept.id,
          ...(responsavelId ? { responsavel_id: responsavelId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', vars.leadId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return { departamentoId: dept.id, responsavelId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      toast({ title: 'Lead roteado por área jurídica' });
    },
    onError: (err: unknown) => {
      log.error('autoRouteByArea failed', err);
      toast({
        title: 'Não foi possível rotear o lead',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  const autoRouteByArea = useCallback(
    async (leadId: string, areaJuridica: string | null): Promise<AutoRouteResult | null> => {
      try {
        return await mutation.mutateAsync({ leadId, areaJuridica });
      } catch {
        return null;
      }
    },
    [mutation],
  );

  return {
    autoRouteByArea,
    availableRules,
    isRouting: mutation.isPending,
  };
}
