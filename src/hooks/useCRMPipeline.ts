import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('CRMPipeline');

export type PipelineStage = {
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
  lead_count?: number;
  total_value?: number;
};

export const useCRMPipeline = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const { data: stages = [], isLoading: loading } = useQuery({
    queryKey: ['crm-pipeline-stages', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('position', { ascending: true });

      if (error) throw error;

      const stageIds = (data || []).map((s: PipelineStage) => s.id);

      // Bulk query: get all leads for these stages in ONE call (not N+1)
      const { data: allLeads } = stageIds.length > 0
        ? await supabase
            .from('leads')
            .select('pipeline_stage_id, expected_value')
            .in('pipeline_stage_id', stageIds)
        : { data: [] };

      // Aggregate in memory
      const countMap = new Map<string, number>();
      const valueMap = new Map<string, number>();
      for (const lead of (allLeads || []) as Array<{ pipeline_stage_id: string | null; expected_value: number | null }>) {
        const sid = lead.pipeline_stage_id;
        if (!sid) continue;
        countMap.set(sid, (countMap.get(sid) || 0) + 1);
        if (lead.expected_value) {
          valueMap.set(sid, (valueMap.get(sid) || 0) + lead.expected_value);
        }
      }

      return (data || []).map((stage: PipelineStage) => ({
        ...stage,
        lead_count: countMap.get(stage.id) || 0,
        total_value: valueMap.get(stage.id) || 0,
      }));
    },
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['crm-pipeline-stages', tenantId] });
  }, [queryClient, tenantId]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PipelineStage>) => {
      const currentStages = queryClient.getQueryData<PipelineStage[]>(['crm-pipeline-stages', tenantId]) || [];
      const maxPosition = currentStages.length > 0 ? Math.max(...currentStages.map(s => s.position)) + 1 : 0;
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '_'),
          color: data.color || '#3B82F6',
          position: data.position ?? maxPosition,
          is_won: data.is_won || false,
          is_lost: data.is_lost || false,
          auto_followup_days: data.auto_followup_days || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Etapa criada com sucesso!' });
    },
    onError: (error) => {
      log.error('Failed to create stage', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a etapa.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PipelineStage> }) => {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Etapa atualizada!' });
    },
    onError: (error) => {
      log.error('Failed to update stage', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Etapa removida!' });
    },
    onError: (error) => {
      log.error('Failed to delete stage', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a etapa.', variant: 'destructive' });
    },
  });

  const fetchStages = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const createStage = useCallback(async (data: Partial<PipelineStage>): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('[useCRMPipeline] createStage failed:', err);
      return false;
    }
  }, [tenantId, createMutation]);

  const updateStage = useCallback(async (id: string, data: Partial<PipelineStage>): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch (err) {
      console.error('[useCRMPipeline] updateStage failed:', err);
      return false;
    }
  }, [tenantId, updateMutation]);

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('[useCRMPipeline] deleteStage failed:', err);
      return false;
    }
  }, [tenantId, deleteMutation]);

  const reorderStages = useCallback(async (stageIds: string[]): Promise<boolean> => {
    try {
      const updates = stageIds.map((id, index) =>
        supabase.from('crm_pipeline_stages').update({ position: index }).eq('id', id).eq('tenant_id', tenantId)
      );
      await Promise.all(updates);
      invalidate();
      return true;
    } catch (error) {
      log.error('Failed to reorder stages', error);
      return false;
    }
  }, [tenantId, invalidate]);

  return { stages, loading, fetchStages, createStage, updateStage, deleteStage, reorderStages };
};
