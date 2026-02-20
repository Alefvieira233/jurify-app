import { useCallback, useState } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('LeadScoring');

export type ScoreEntry = {
  id: string;
  lead_id: string;
  score: number;
  score_factors: Record<string, number>;
  scored_by: string;
  created_at: string;
};

export const useLeadScoring = () => {
  const { user, profile } = useAuth();
  const [scores, setScores] = useState<Record<string, number>>({});

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const getLeadScore = useCallback(async (leadId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('crm_lead_scores')
        .select('score')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const score = data?.score || 0;
      setScores(prev => ({ ...prev, [leadId]: score }));
      return score;
    } catch (error) {
      log.error('Failed to get lead score', error);
      return 0;
    }
  }, []);

  const scoreHistory = useCallback(async (leadId: string): Promise<ScoreEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('crm_lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ScoreEntry[];
    } catch (error) {
      log.error('Failed to get score history', error);
      return [];
    }
  }, []);

  const manualScore = useCallback(async (leadId: string, score: number, factors: Record<string, number>): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase.from('crm_lead_scores').insert({
        tenant_id: tenantId,
        lead_id: leadId,
        score: Math.max(0, Math.min(100, score)),
        score_factors: factors,
        scored_by: 'manual',
      });
      if (error) throw error;

      await supabase.from('leads').update({ lead_score: score, updated_at: new Date().toISOString() }).eq('id', leadId);
      setScores(prev => ({ ...prev, [leadId]: score }));
      return true;
    } catch (error) {
      log.error('Failed to score lead', error);
      return false;
    }
  }, [tenantId]);

  return { scores, getLeadScore, scoreHistory, manualScore };
};
