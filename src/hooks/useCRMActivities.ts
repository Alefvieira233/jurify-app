import { useCallback, useState } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('CRMActivities');

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'whatsapp' | 'task' | 'status_change' | 'followup_scheduled' | 'followup_completed' | 'document_sent' | 'proposal_sent';

export type Activity = {
  id: string;
  tenant_id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type CreateActivity = {
  lead_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  scheduled_at?: string;
};

export const useCRMActivities = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const fetchActivities = useCallback(async (leadId: string, options?: { limit?: number; offset?: number }) => {
    if (!user) return;
    try {
      setLoading(true);
      const limit = options?.limit || 50;
      let query = supabase
        .from('crm_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.offset) {
        query = query.range(options.offset, options.offset + limit - 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      log.error('Failed to fetch activities', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logActivity = useCallback(async (data: CreateActivity): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      const { error } = await supabase
        .from('crm_activities')
        .insert({
          tenant_id: tenantId,
          lead_id: data.lead_id,
          user_id: user.id,
          activity_type: data.activity_type,
          title: data.title,
          description: data.description || null,
          metadata: data.metadata || {},
          scheduled_at: data.scheduled_at || null,
        });
      if (error) throw error;

      // Update last_activity_at on lead
      await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', data.lead_id);

      log.info('Activity logged', { type: data.activity_type, leadId: data.lead_id });
      return true;
    } catch (error) {
      log.error('Failed to log activity', error);
      toast({ title: 'Erro', description: 'Não foi possível registrar a atividade.', variant: 'destructive' });
      return false;
    }
  }, [user, tenantId, toast]);

  return { activities, loading, fetchActivities, logActivity };
};
