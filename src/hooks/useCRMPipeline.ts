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

      // Get lead counts per stage
      const stagesWithCounts = await Promise.all(
        (data || []).map(async (stage: PipelineStage) => {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('pipeline_stage_id', stage.id);

          const { data: valueData } = await supabase
            .from('leads')
            .select('expected_value')
            .eq('pipeline_stage_id', stage.id)
            .not('expected_value', 'is', null);

          const totalValue = (valueData || []).reduce((sum: number, l: { expected_value: number | null }) => sum + (l.expected_value || 0), 0);

          return { ...stage, lead_count: count || 0, total_value: totalValue };
        })
      );

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
    try {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Etapa atualizada!' });
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to update stage', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' });
      return false;
    }
  }, [fetchStages, toast]);

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Etapa removida!' });
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to delete stage', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a etapa.', variant: 'destructive' });
      return false;
    }
  }, [fetchStages, toast]);

  const reorderStages = useCallback(async (stageIds: string[]): Promise<boolean> => {
    try {
      const updates = stageIds.map((id, index) =>
        supabase.from('crm_pipeline_stages').update({ position: index }).eq('id', id)
      );
      await Promise.all(updates);
      void fetchStages();
      return true;
    } catch (error) {
      log.error('Failed to reorder stages', error);
      return false;
    }
  }, [fetchStages]);

  return { stages, loading, fetchStages, createStage, updateStage, deleteStage, reorderStages };
};
