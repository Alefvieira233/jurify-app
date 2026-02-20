import { useCallback, useState, useEffect } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('FollowUps');

export type FollowUpType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'task' | 'auto';
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled' | 'overdue' | 'snoozed';
export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';

export type FollowUp = {
  id: string;
  tenant_id: string;
  lead_id: string;
  created_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  followup_type: FollowUpType;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  scheduled_at: string;
  completed_at: string | null;
  snoozed_until: string | null;
  reminder_minutes: number;
  recurrence_rule: string | null;
  recurrence_end_at: string | null;
  auto_message_template: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lead_name?: string;
  lead_phone?: string;
  lead_status?: string;
};

export type CreateFollowUp = {
  lead_id: string;
  title: string;
  description?: string;
  followup_type: FollowUpType;
  priority?: FollowUpPriority;
  scheduled_at: string;
  assigned_to?: string;
  reminder_minutes?: number;
  recurrence_rule?: string | null;
  auto_message_template?: string;
};

export const useFollowUps = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const fetchFollowUps = useCallback(async (options?: { leadId?: string; status?: string; assignedTo?: string }) => {
    if (!user || !tenantId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('crm_followups')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      if (options?.leadId) query = query.eq('lead_id', options.leadId);
      if (options?.status) query = query.eq('status', options.status);
      if (options?.assignedTo) query = query.eq('assigned_to', options.assignedTo);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with lead data
      const leadIds = [...new Set((data || []).map((f: FollowUp) => f.lead_id))];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, nome, telefone, status')
        .in('id', leadIds);

      const leadMap = new Map((leads || []).map((l: { id: string; nome: string; telefone: string; status: string }) => [l.id, l]));

      const enriched = (data || []).map((f: FollowUp) => {
        const lead = leadMap.get(f.lead_id) as { nome?: string; telefone?: string; status?: string } | undefined;
        return {
          ...f,
          lead_name: lead?.nome || 'Lead desconhecido',
          lead_phone: lead?.telefone || '',
          lead_status: lead?.status || '',
        };
      });

      setFollowUps(enriched);
    } catch (error) {
      log.error('Failed to fetch follow-ups', error);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  const getOverdueCount = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { count, error } = await supabase
        .from('crm_followups')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'overdue');
      if (!error) setOverdueCount(count || 0);
    } catch (error) {
      log.error('Failed to get overdue count', error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (user) {
      void fetchFollowUps();
      void getOverdueCount();
    }
  }, [user, fetchFollowUps, getOverdueCount]);

  const createFollowUp = useCallback(async (data: CreateFollowUp): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      const { error } = await supabase
        .from('crm_followups')
        .insert({
          tenant_id: tenantId,
          lead_id: data.lead_id,
          created_by: user.id,
          assigned_to: data.assigned_to || user.id,
          title: data.title,
          description: data.description || null,
          followup_type: data.followup_type,
          priority: data.priority || 'medium',
          scheduled_at: data.scheduled_at,
          reminder_minutes: data.reminder_minutes ?? 30,
          recurrence_rule: data.recurrence_rule || null,
          auto_message_template: data.auto_message_template || null,
          status: 'pending',
        });
      if (error) throw error;

      // Update lead next_followup_at
      await supabase
        .from('leads')
        .update({
          next_followup_at: data.scheduled_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.lead_id);

      toast({ title: 'Sucesso', description: 'Follow-up agendado com sucesso!' });
      void fetchFollowUps();
      void getOverdueCount();
      return true;
    } catch (error) {
      log.error('Failed to create follow-up', error);
      toast({ title: 'Erro', description: 'Não foi possível agendar o follow-up.', variant: 'destructive' });
      return false;
    }
  }, [user, tenantId, fetchFollowUps, getOverdueCount, toast]);

  const completeFollowUp = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date().toISOString();
      const { data: followUp, error } = await supabase
        .from('crm_followups')
        .update({ status: 'completed', completed_at: now, updated_at: now, metadata: notes ? { completion_notes: notes } : {} })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Log activity
      if (followUp) {
        await supabase.from('crm_activities').insert({
          tenant_id: tenantId,
          lead_id: followUp.lead_id,
          user_id: user.id,
          activity_type: 'followup_completed',
          title: `Follow-up concluído: ${followUp.title}`,
          description: notes || null,
          metadata: { followup_id: id, followup_type: followUp.followup_type },
        });
      }

      toast({ title: 'Sucesso', description: 'Follow-up concluído!' });
      void fetchFollowUps();
      void getOverdueCount();
      return true;
    } catch (error) {
      log.error('Failed to complete follow-up', error);
      toast({ title: 'Erro', description: 'Não foi possível concluir o follow-up.', variant: 'destructive' });
      return false;
    }
  }, [user, tenantId, fetchFollowUps, getOverdueCount, toast]);

  const cancelFollowUp = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('crm_followups')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Follow-up cancelado.' });
      void fetchFollowUps();
      void getOverdueCount();
      return true;
    } catch (error) {
      log.error('Failed to cancel follow-up', error);
      return false;
    }
  }, [fetchFollowUps, getOverdueCount, toast]);

  const snoozeFollowUp = useCallback(async (id: string, until: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('crm_followups')
        .update({ status: 'snoozed', snoozed_until: until, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Follow-up adiado.' });
      void fetchFollowUps();
      return true;
    } catch (error) {
      log.error('Failed to snooze follow-up', error);
      return false;
    }
  }, [fetchFollowUps, toast]);

  const rescheduleFollowUp = useCallback(async (id: string, newDate: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('crm_followups')
        .update({ scheduled_at: newDate, status: 'pending', snoozed_until: null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Follow-up reagendado!' });
      void fetchFollowUps();
      return true;
    } catch (error) {
      log.error('Failed to reschedule follow-up', error);
      return false;
    }
  }, [fetchFollowUps, toast]);

  return {
    followUps, overdueCount, loading,
    fetchFollowUps, createFollowUp, completeFollowUp,
    cancelFollowUp, snoozeFollowUp, rescheduleFollowUp, getOverdueCount,
  };
};
