import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEnterpriseActivity = (tenantId: string | null) => {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const loadRecentActivity = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: activity } = await supabase
        .from('lead_interactions')
        .select(`
          *,
          leads (nome, telefone)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  }, [tenantId]);

  return {
    recentActivity,
    loadRecentActivity,
  };
};
