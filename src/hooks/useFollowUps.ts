import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  const { data: followUps = [], isLoading: loading } = useQuery({
    queryKey: ['crm-followups', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_followups')
        .select('*, leads:lead_id(id, nome, telefone, status)')
        .eq('tenant_id', tenantId!)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((f: FollowUp & { leads?: { nome?: string; telefone?: string; status?: string } | null }) => {
        const lead = f.leads;
        return {
          ...f,
          lead_name: lead?.nome || 'Lead desconhecido',
          lead_phone: lead?.telefone || '',
          lead_status: lead?.status || '',
        };
      });
    },
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['crm-followups-overdue', tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_followups')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('status', 'overdue');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['crm-followups', tenantId] });
    void queryClient.invalidateQueries({ queryKey: ['crm-followups-overdue', tenantId] });
  }, [queryClient, tenantId]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateFollowUp) => {
      if (!user || !tenantId) throw new Error('Not authenticated');

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
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Sucesso', description: 'Follow-up agendado com sucesso!' });
    },
    onError: (error) => {
      log.error('Failed to create follow-up', error);
      toast({ title: 'Erro', description: 'Não foi possível agendar o follow-up.', variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const now = new Date().toISOString();

      // Read existing metadata so we merge instead of overwriting
      const { data: existing } = await supabase
        .from('crm_followups')
        .select('metadata')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      const mergedMetadata = {
        ...((existing?.metadata as Record<string, unknown>) || {}),
        ...(notes ? { completion_notes: notes } : {}),
      };

      const { data: followUp, error } = await supabase
        .from('crm_followups')
        .update({ status: 'completed', completed_at: now, updated_at: now, metadata: mergedMetadata })
        .eq('id', id)
        .eq('tenant_id', tenantId)
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
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Sucesso', description: 'Follow-up concluído!' });
    },
    onError: (error) => {
      log.error('Failed to complete follow-up', error);
      toast({ title: 'Erro', description: 'Não foi possível concluir o follow-up.', variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('crm_followups')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Sucesso', description: 'Follow-up cancelado.' });
    },
    onError: (error) => {
      log.error('Failed to cancel follow-up', error);
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('crm_followups')
        .update({ status: 'snoozed', snoozed_until: until, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Sucesso', description: 'Follow-up adiado.' });
    },
    onError: (error) => {
      log.error('Failed to snooze follow-up', error);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('crm_followups')
        .update({ scheduled_at: newDate, status: 'pending', snoozed_until: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Sucesso', description: 'Follow-up reagendado!' });
    },
    onError: (error) => {
      log.error('Failed to reschedule follow-up', error);
    },
  });

  const fetchFollowUps = useCallback(async (options?: { leadId?: string; status?: string; assignedTo?: string }) => {
    if (!user || !tenantId) return;
    // If options are provided, do a filtered fetch and set query data directly
    if (options?.leadId || options?.status || options?.assignedTo) {
      try {
        let query = supabase
          .from('crm_followups')
          .select('*, leads:lead_id(id, nome, telefone, status)')
          .eq('tenant_id', tenantId)
          .order('scheduled_at', { ascending: true });

        if (options.leadId) query = query.eq('lead_id', options.leadId);
        if (options.status) query = query.eq('status', options.status);
        if (options.assignedTo) query = query.eq('assigned_to', options.assignedTo);

        const { data, error } = await query;
        if (error) throw error;

        const enriched = (data || []).map((f: FollowUp & { leads?: { nome?: string; telefone?: string; status?: string } | null }) => {
          const lead = f.leads;
          return {
            ...f,
            lead_name: lead?.nome || 'Lead desconhecido',
            lead_phone: lead?.telefone || '',
            lead_status: lead?.status || '',
          };
        });

        queryClient.setQueryData(['crm-followups', tenantId], enriched);
      } catch (error) {
        log.error('Failed to fetch follow-ups', error);
      }
    } else {
      invalidateAll();
    }
  }, [user, tenantId, queryClient, invalidateAll]);

  const createFollowUp = useCallback(async (data: CreateFollowUp): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('[useFollowUps] createFollowUp failed:', err);
      return false;
    }
  }, [user, tenantId, createMutation]);

  const completeFollowUp = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await completeMutation.mutateAsync({ id, notes });
      return true;
    } catch (err) {
      console.error('[useFollowUps] completeFollowUp failed:', err);
      return false;
    }
  }, [user, completeMutation]);

  const cancelFollowUp = useCallback(async (id: string): Promise<boolean> => {
    try {
      await cancelMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('[useFollowUps] cancelFollowUp failed:', err);
      return false;
    }
  }, [cancelMutation]);

  const snoozeFollowUp = useCallback(async (id: string, until: string): Promise<boolean> => {
    try {
      await snoozeMutation.mutateAsync({ id, until });
      return true;
    } catch (err) {
      console.error('[useFollowUps] snoozeFollowUp failed:', err);
      return false;
    }
  }, [snoozeMutation]);

  const rescheduleFollowUp = useCallback(async (id: string, newDate: string): Promise<boolean> => {
    try {
      await rescheduleMutation.mutateAsync({ id, newDate });
      return true;
    } catch (err) {
      console.error('[useFollowUps] rescheduleFollowUp failed:', err);
      return false;
    }
  }, [rescheduleMutation]);

  const getOverdueCount = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['crm-followups-overdue', tenantId] });
  }, [queryClient, tenantId]);

  return {
    followUps, overdueCount, loading,
    fetchFollowUps, createFollowUp, completeFollowUp,
    cancelFollowUp, snoozeFollowUp, rescheduleFollowUp, getOverdueCount,
  };
};
