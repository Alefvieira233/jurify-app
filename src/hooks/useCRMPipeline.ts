import { useCallback, useState, useEffect } from 'react';
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
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const fetchStages = useCallback(async () => {
    if (!user || !tenantId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('tenant_id', tenantId)
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

      // Aggregate in memory — O(n) instead of 2*N queries
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

      const stagesWithCounts = (data || []).map((stage: PipelineStage) => ({
        ...stage,
        lead_count: countMap.get(stage.id) || 0,
        total_value: valueMap.get(stage.id) || 0,
      }));

      setStages(stagesWithCounts);
    } catch (error) {
      log.error('Failed to fetch stages', error);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    if (user) void fetchStages();
  }, [user, fetchStages]);

  const createStage = useCallback(async (data: Partial<PipelineStage>): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const maxPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
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
      toast({ title: 'Sucesso', description: 'Etapa criada com sucesso!' });
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to create stage', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a etapa.', variant: 'destructive' });
      return false;
    }
  }, [tenantId, stages, fetchStages, toast]);

  const updateStage = useCallback(async (id: string, data: Partial<PipelineStage>): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Etapa atualizada!' });
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to update stage', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' });
      return false;
    }
  }, [tenantId, fetchStages, toast]);

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Etapa removida!' });
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to delete stage', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a etapa.', variant: 'destructive' });
      return false;
    }
  }, [tenantId, fetchStages, toast]);

  const reorderStages = useCallback(async (stageIds: string[]): Promise<boolean> => {
    try {
      const updates = stageIds.map((id, index) =>
        supabase.from('crm_pipeline_stages').update({ position: index }).eq('id', id).eq('tenant_id', tenantId)
      );
      await Promise.all(updates);
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to reorder stages', error);
      return false;
    }
  }, [tenantId, fetchStages]);

  return { stages, loading, fetchStages, createStage, updateStage, deleteStage, reorderStages };
};
