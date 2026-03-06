import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('FollowUpSequences');

export type TriggerEvent =
  | 'lead_created'
  | 'proposta_enviada'
  | 'sem_resposta_24h'
  | 'sem_resposta_48h'
  | 'contrato_enviado'
  | 'agendamento_criado'
  | 'lead_perdido'
  | 'manual';

export interface SequenceStep {
  delay_hours: number;
  channel: 'whatsapp' | 'email';
  template: string;
  subject?: string;
}

export interface FollowUpSequence {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  trigger_event: TriggerEvent;
  is_active: boolean;
  steps: SequenceStep[];
  total_triggered: number;
  total_completed: number;
  created_at: string;
  updated_at: string;
}

export type CreateSequenceInput = {
  name: string;
  description?: string;
  trigger_event: TriggerEvent;
  steps: SequenceStep[];
  is_active?: boolean;
};

export type UpdateSequenceInput = Partial<CreateSequenceInput>;

const QUERY_KEY_BASE = 'followup-sequences';

export function useFollowUpSequences() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const qKey = [QUERY_KEY_BASE, tenantId];

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: sequences = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<FollowUpSequence[]>({
    queryKey: qKey,
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('crm_followup_sequences')
        .select('id,tenant_id,name,description,trigger_event,is_active,steps,total_triggered,total_completed,created_at,updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) { log.error('Erro ao buscar sequências', error); throw error; }
      return (data || []) as FollowUpSequence[];
    },
    enabled: !!user && !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError ? (queryError as Error).message : null;

  // ── Create ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (input: CreateSequenceInput) => {
      if (!tenantId) throw new Error('Tenant não identificado');

      const { data, error } = await supabase
        .from('crm_followup_sequences')
        .insert([{
          tenant_id: tenantId,
          name: input.name,
          description: input.description || null,
          trigger_event: input.trigger_event,
          steps: JSON.stringify(input.steps),
          is_active: input.is_active ?? true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as FollowUpSequence;
    },
    onSuccess: (newSeq) => {
      queryClient.setQueryData<FollowUpSequence[]>(qKey, prev => [newSeq, ...(prev ?? [])]);
      toast({ title: 'Sucesso', description: `Sequência "${newSeq.name}" criada!` });
      log.info('Sequência criada', { id: newSeq.id });
    },
    onError: (err: unknown) => {
      log.error('Erro ao criar sequência', err);
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível criar a sequência.', variant: 'destructive' });
    },
  });

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: UpdateSequenceInput }) => {
      if (!tenantId) throw new Error('Tenant não identificado');

      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.name !== undefined) payload.name = input.name;
      if (input.description !== undefined) payload.description = input.description;
      if (input.trigger_event !== undefined) payload.trigger_event = input.trigger_event;
      if (input.steps !== undefined) payload.steps = JSON.stringify(input.steps);
      if (input.is_active !== undefined) payload.is_active = input.is_active;

      const { data, error } = await supabase
        .from('crm_followup_sequences')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as FollowUpSequence;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<FollowUpSequence[]>(qKey, prev =>
        (prev ?? []).map(s => s.id === updated.id ? updated : s)
      );
      toast({ title: 'Sucesso', description: 'Sequência atualizada!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar sequência', err);
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível atualizar.', variant: 'destructive' });
    },
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');

      const { error } = await supabase
        .from('crm_followup_sequences')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<FollowUpSequence[]>(qKey, prev =>
        (prev ?? []).filter(s => s.id !== deletedId)
      );
      toast({ title: 'Sucesso', description: 'Sequência excluída!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao excluir sequência', err);
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível excluir.', variant: 'destructive' });
    },
  });

  // ── Toggle active ──────────────────────────────────────────────────────────
  const toggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: !currentActive } });
    } catch { /* handled by mutation onError */ }
  }, [updateMutation]);

  // ── Trigger sequence for a lead ────────────────────────────────────────────
  const triggerSequence = useCallback(async (sequenceId: string, leadId: string) => {
    if (!tenantId) return;

    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence || !sequence.is_active || sequence.steps.length === 0) {
      log.warn('Sequência inválida ou inativa', { sequenceId });
      return;
    }

    const now = new Date();
    const queueItems = sequence.steps.map((step, index) => ({
      tenant_id: tenantId,
      sequence_id: sequenceId,
      lead_id: leadId,
      step_index: index,
      channel: step.channel,
      message_template: step.template,
      subject: step.subject || null,
      status: 'pending',
      scheduled_at: new Date(now.getTime() + step.delay_hours * 60 * 60 * 1000).toISOString(),
    }));

    const { error } = await supabase.from('crm_followup_queue').insert(queueItems);
    if (error) {
      log.error('Erro ao enfileirar follow-ups', error);
      toast({ title: 'Erro', description: 'Falha ao programar follow-ups automáticos.', variant: 'destructive' });
      return;
    }

    // Update trigger count
    await supabase
      .from('crm_followup_sequences')
      .update({ total_triggered: (sequence.total_triggered || 0) + 1 })
      .eq('id', sequenceId)
      .eq('tenant_id', tenantId);

    log.info('Sequência disparada', { sequenceId, leadId, steps: queueItems.length });
    toast({ title: 'Follow-up programado', description: `${queueItems.length} mensagens agendadas para envio automático.` });
  }, [tenantId, sequences, toast]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const createSequence = useCallback(async (input: CreateSequenceInput): Promise<boolean> => {
    if (!user) return false;
    try { await createMutation.mutateAsync(input); return true; } catch { return false; }
  }, [user, createMutation]);

  const updateSequence = useCallback(async (id: string, data: UpdateSequenceInput): Promise<boolean> => {
    try { await updateMutation.mutateAsync({ id, data }); return true; } catch { return false; }
  }, [updateMutation]);

  const deleteSequence = useCallback(async (id: string): Promise<boolean> => {
    try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
  }, [deleteMutation]);

  return {
    sequences,
    loading,
    error,
    isEmpty: !loading && !error && sequences.length === 0,
    refetch,
    createSequence,
    updateSequence,
    deleteSequence,
    toggleActive,
    triggerSequence,
  };
}
