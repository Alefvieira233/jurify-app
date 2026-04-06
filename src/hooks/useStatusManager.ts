/** Manages configurable status options for leads, contracts, and pipeline stages. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';

export interface StatusStage {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  auto_followup_days: number | null;
  created_at: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function useStatusManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: stages = [], isLoading } = useQuery({
    queryKey: queryKeys.statusStages.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('id, tenant_id, name, slug, color, position, is_won, is_lost, auto_followup_days, created_at')
        .eq('tenant_id', tenantId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusStage[];
    },
  });

  const { data: leadCounts = new Map<string, number>() } = useQuery({
    queryKey: queryKeys.statusStages.leadCounts(tenantId),
    enabled: !!tenantId && stages.length > 0,
    queryFn: async () => {
      const stageIds = stages.map((s) => s.id);
      if (stageIds.length === 0) return new Map<string, number>();

      const { data: allLeads } = await supabase
        .from('leads')
        .select('pipeline_stage_id')
        .in('pipeline_stage_id', stageIds);

      const countMap = new Map<string, number>();
      for (const lead of (allLeads ?? []) as Array<{ pipeline_stage_id: string | null }>) {
        const sid = lead.pipeline_stage_id;
        if (!sid) continue;
        countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
      }
      return countMap;
    },
  });

  const createStage = useMutation({
    mutationFn: async (values: {
      name: string;
      color: string;
      is_won?: boolean;
      is_lost?: boolean;
      auto_followup_days?: number | null;
    }) => {
      const maxPosition =
        stages.length > 0 ? Math.max(...stages.map((s) => s.position)) + 1 : 0;
      const { error } = await supabase.from('crm_pipeline_stages').insert({
        tenant_id: tenantId,
        name: values.name,
        slug: generateSlug(values.name),
        color: values.color ?? '#3B82F6',
        position: maxPosition,
        is_won: values.is_won ?? false,
        is_lost: values.is_lost ?? false,
        auto_followup_days: values.auto_followup_days ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.list(tenantId) });
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.leadCounts(tenantId) });
      toast({ title: 'Status criado' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar status', variant: 'destructive' });
    },
  });

  const updateStage = useMutation({
    mutationFn: async (values: {
      id: string;
      name?: string;
      color?: string;
      position?: number;
      is_won?: boolean;
      is_lost?: boolean;
      auto_followup_days?: number | null;
    }) => {
      const { id, ...rest } = values;
      const updatePayload: Record<string, unknown> = { ...rest };
      if (rest.name !== undefined) {
        updatePayload.slug = generateSlug(rest.name);
      }
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.list(tenantId) });
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.leadCounts(tenantId) });
      toast({ title: 'Status atualizado' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.list(tenantId) });
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.leadCounts(tenantId) });
      toast({ title: 'Status removido' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover status', variant: 'destructive' });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      const updates = items.map((item) =>
        supabase
          .from('crm_pipeline_stages')
          .update({ position: item.position })
          .eq('id', item.id)
          .eq('tenant_id', tenantId!)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.statusStages.list(tenantId) });
    },
    onError: () => {
      toast({ title: 'Erro ao reordenar status', variant: 'destructive' });
    },
  });

  return {
    stages,
    leadCounts,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  };
}
