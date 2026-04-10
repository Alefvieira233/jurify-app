/**
 * @module useLeadsCRUD
 * @description Hook for lead create, update, delete, archive, and unarchive mutations.
 * Extracted from useLeads for single-responsibility.
 *
 * @internal Used by useLeads facade — do not import directly in components.
 */
import { useCallback } from 'react';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { normalizeLead, mapLeadInputToDb, type LeadQueryData } from './useLeadsQuery';
import type { Lead, LeadInput } from './useLeadsTypes';

const log = createLogger('LeadsCRUD');

interface UseLeadsCRUDOptions {
  qKey: readonly unknown[];
  queryData: LeadQueryData | undefined;
  tenantId: string | undefined;
  queryClient: QueryClient;
}

/**
 * Hook that encapsulates all lead mutation operations (create, update, delete, archive, unarchive).
 */
export function useLeadsCRUD({ qKey, queryData: _queryData, tenantId, queryClient }: UseLeadsCRUDOptions) {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: LeadInput) => {
      const payload = {
        ...mapLeadInputToDb(data),
        tenant_id: tenantId ?? null,
      };
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert([payload as typeof payload & { nome: string; tenant_id: string }])
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(newLead);
    },
    onSuccess: (newLead) => {
      addSentryBreadcrumb(`Lead criado: ${newLead.id}`, 'leads', 'info');
      queryClient.setQueryData(qKey, (prev: typeof _queryData) => ({
        leads: [newLead, ...(prev?.leads ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Sucesso', description: 'Lead criado com sucesso!' });
      if (tenantId && user?.id) {
        void supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'info',
          titulo: 'Novo lead cadastrado',
          mensagem: `${newLead.nome} foi adicionado ao pipeline.`,
          created_by: user.id,
        });
      }
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao criar lead', 'leads', 'error');
      log.error('Erro ao criar lead', err);
      toast({
        title: 'Erro',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<LeadInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const payload = mapLeadInputToDb(updateData);
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(updatedLead);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof _queryData) => ({
        leads: (prev?.leads ?? []).map((l: Lead) => l.id === updated.id ? { ...l, ...updated } : l),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Sucesso', description: 'Lead atualizado com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar lead', err);
      toast({
        title: 'Erro',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      addSentryBreadcrumb(`Lead deletado: ${deletedId}`, 'leads', 'info');
      queryClient.setQueryData(qKey, (prev: typeof _queryData) => ({
        leads: (prev?.leads ?? []).filter((l: Lead) => l.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({ title: 'Sucesso', description: 'Lead removido com sucesso!' });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao deletar lead', 'leads', 'error');
      log.error('Erro ao deletar lead', err);
      toast({
        title: 'Erro',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  // ── Archive / Unarchive ──────────────────────────────────────────────────

  const archiveMutation = useMutation({
    mutationFn: async ({ id, motivo, observacao, dataReativacao, proximoResponsavelId }: {
      id: string; motivo: string; observacao?: string; dataReativacao?: string; proximoResponsavelId?: string;
    }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const updatePayload: Record<string, unknown> = {
        arquivado_em: new Date().toISOString(),
        motivo_arquivamento: `${motivo}${observacao ? ` — ${observacao}` : ''}`,
        data_reativacao_prevista: dataReativacao ?? null,
        updated_at: new Date().toISOString(),
      };
      if (proximoResponsavelId && proximoResponsavelId !== '__nenhum__') {
        updatePayload.responsavel_id = proximoResponsavelId;
      }
      const { data: updated, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(updated);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof _queryData) => ({
        leads: (prev?.leads ?? []).map((l: Lead) => l.id === updated.id ? updated : l),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Lead arquivado com sucesso' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao arquivar', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await supabase
        .from('leads')
        .update({
          arquivado_em: null,
          motivo_arquivamento: null,
          data_reativacao_prevista: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(updated);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof _queryData) => ({
        leads: (prev?.leads ?? []).map((l: Lead) => l.id === updated.id ? updated : l),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Lead reativado com sucesso' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao reativar', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const archiveLead = useCallback(async (id: string, motivo: string, observacao?: string, dataReativacao?: string, proximoResponsavelId?: string): Promise<boolean> => {
    try { await archiveMutation.mutateAsync({ id, motivo, observacao, dataReativacao, proximoResponsavelId }); return true; } catch (err) { log.error('archiveLead failed', err); return false; }
  }, [archiveMutation]);

  const unarchiveLead = useCallback(async (id: string): Promise<boolean> => {
    try { await unarchiveMutation.mutateAsync(id); return true; } catch (err) { log.error('unarchiveLead failed', err); return false; }
  }, [unarchiveMutation]);

  // ── Public API wrappers ───────────────────────────────────────────────────

  const { canUse: canUsePlan, usage: planUsage, limits: planLimits, refresh: refreshPlanUsage } = usePlanLimits();

  const createLead = useCallback(async (data: LeadInput): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' });
      return false;
    }
    if (!canUsePlan('leads')) {
      toast({
        title: 'Limite de leads atingido',
        description: `Seu plano permite ${planLimits.leads} leads. Faça upgrade para continuar.`,
        variant: 'destructive',
      });
      return false;
    }
    try {
      await createMutation.mutateAsync(data);
      void refreshPlanUsage();
      return true;
    } catch (err) {
      log.error('createLead failed', err);
      return false;
    }
  }, [user, createMutation, toast, canUsePlan, planLimits.leads, refreshPlanUsage]);

  const updateLead = useCallback(async (id: string, updateData: Partial<LeadInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await updateMutation.mutateAsync({ id, updateData });
      return true;
    } catch (err) {
      log.error('updateLead failed', err);
      return false;
    }
  }, [user, tenantId, updateMutation]);

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      log.error('deleteLead failed', err);
      return false;
    }
  }, [user, tenantId, deleteMutation]);

  return {
    createLead,
    updateLead,
    deleteLead,
    archiveLead,
    unarchiveLead,
    planUsage,
    planLimits,
    canUsePlan,
  };
}
