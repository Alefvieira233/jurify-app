import { useCallback, useState, useEffect } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('CRMTags');

export type Tag = {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
};

export const useCRMTags = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const fetchTags = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      log.error('Failed to fetch tags', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { if (user) void fetchTags(); }, [user, fetchTags]);

  const createTag = useCallback(async (name: string, color?: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase.from('crm_tags').insert({ tenant_id: tenantId, name, color: color || '#6B7280' });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Tag criada!' });
      void fetchTags();
      return true;
    } catch (error) {
      log.error('Failed to create tag', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a tag.', variant: 'destructive' });
      return false;
    }
  }, [tenantId, fetchTags, toast]);

  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('crm_tags').delete().eq('id', id);
      if (error) throw error;
      void fetchTags();
      return true;
    } catch (error) {
      log.error('Failed to delete tag', error);
      return false;
    }
  }, [fetchTags]);

  const addTagToLead = useCallback(async (leadId: string, tagId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('crm_lead_tags').insert({ lead_id: leadId, tag_id: tagId });
      if (error) throw error;
      return true;
    } catch (error) {
      log.error('Failed to add tag to lead', error);
      return false;
    }
  }, []);

  const removeTagFromLead = useCallback(async (leadId: string, tagId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('crm_lead_tags').delete().eq('lead_id', leadId).eq('tag_id', tagId);
      if (error) throw error;
      return true;
    } catch (error) {
      log.error('Failed to remove tag from lead', error);
      return false;
    }
  }, []);

  const getLeadTags = useCallback(async (leadId: string): Promise<Tag[]> => {
    try {
      const { data, error } = await supabase
        .from('crm_lead_tags')
        .select('tag_id, crm_tags(*)')
        .eq('lead_id', leadId);
      if (error) throw error;
      return (data || []).map((r: Record<string, unknown>) => r.crm_tags as Tag).filter(Boolean);
    } catch (error) {
      log.error('Failed to get lead tags', error);
      return [];
    }
  }, []);

  return { tags, loading, fetchTags, createTag, deleteTag, addTagToLead, removeTagFromLead, getLeadTags };
};
