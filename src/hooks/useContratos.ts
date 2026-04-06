/**
 * CRUD operations for contracts (contratos) with optimistic updates and tenant filtering.
 *
 * @deprecated For new entity hooks, prefer {@link useEntityCRUD} which extracts the common
 * CRUD pattern into a reusable factory. This hook predates that abstraction and contains
 * custom logic (e.g. plan limits) that prevented automatic migration.
 *
 * @see useEntityCRUD — preferred pattern for new entity hooks
 */


import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';
import { queryKeys } from '@/lib/queryKeys';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const log = createLogger('Contratos');

type ContratoRow = {
  id: string;
  lead_id: string | null;
  tenant_id: string | null;
  nome_cliente: string | null;
  area_juridica: string | null;
  valor_causa: number | null;
  texto_contrato?: string | null;
  clausulas_customizadas?: string | null;
  status: string | null;
  status_assinatura: string | null;
  link_assinatura_zapsign: string | null;
  zapsign_document_id: string | null;
  data_geracao_link: string | null;
  data_envio_whatsapp: string | null;
  responsavel: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Contrato = ContratoRow;

export type ContratoInput = Partial<Contrato>;

const LIST_COLUMNS = 'id,lead_id,tenant_id,nome_cliente,area_juridica,valor_causa,status,status_assinatura,link_assinatura_zapsign,zapsign_document_id,data_geracao_link,data_envio_whatsapp,responsavel,data_envio,data_assinatura,observacoes,created_at,updated_at';

function normalizeContrato(row: ContratoRow): Contrato { return { ...row }; }

/** @deprecated Use `queryKeys.contratos.list(tenantId)` from `@/lib/queryKeys` instead. */
export const contratosQueryKey = (tenantId: string | undefined) =>
  queryKeys.contratos.list(tenantId);

export interface UseContratosOptions {
  /** Page number (0-based). Defaults to 0. */
  page?: number;
  /** Items per page. Defaults to 50. */
  pageSize?: number;
  /** Server-side search on nome_cliente (ilike). */
  search?: string;
  /** Server-side status filter (exact match). */
  status?: string;
}

export const useContratos = (options?: UseContratosOptions) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 50;
  const search = options?.search;
  const status = options?.status;

  const qKey = queryKeys.contratos.list(tenantId, page, search, status);

  // ── Query ──────────────────────────────────────────────────────────────────
  type QueryData = { items: Contrato[]; total: number };

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<QueryData>({
    queryKey: qKey,
    queryFn: async () => {
      let query = supabase
        .from('contratos')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (search) query = query.ilike('nome_cliente', `%${search}%`);
      if (status) query = query.eq('status', status);

      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) { log.error('Erro ao buscar contratos', error); throw error; }
      log.debug(`${data?.length ?? 0} contratos encontrados (total: ${count})`);
      return { items: (data || []).map(normalizeContrato), total: count ?? 0 };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const contratos = queryData?.items ?? [];
  const total = queryData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = (page + 1) * pageSize < total;
  const error = queryError ? (queryError).message : null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: ContratoInput) => {
      const payload = { ...data, tenant_id: data.tenant_id ?? tenantId ?? null };
      const { data: row, error } = await supabase.from('contratos').insert([payload]).select().single();
      if (error) throw error;
      return normalizeContrato(row as ContratoRow);
    },
    onSuccess: (newContrato) => {
      addSentryBreadcrumb(`Contrato criado: ${newContrato.id}`, 'contratos', 'info');
      queryClient.setQueryData<QueryData>(qKey, prev => ({
        items: [newContrato, ...(prev?.items ?? [])],
        total: (prev?.total ?? 0) + 1,
      }));
      toast({ title: 'Sucesso', description: 'Contrato criado com sucesso!' });
      log.info('Contrato criado', { id: newContrato.id });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao criar contrato', 'contratos', 'error');
      log.error('Erro ao criar contrato', err);
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<ContratoInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: row, error } = await supabase
        .from('contratos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeContrato(row as ContratoRow);
    },
    onSuccess: (updated, { updateData }) => {
      addSentryBreadcrumb(`Contrato atualizado: ${updated.id}`, 'contratos', 'info');
      queryClient.setQueryData<QueryData>(qKey, prev => ({
        items: (prev?.items ?? []).map(c => c.id === updated.id ? { ...c, ...updated } : c),
        total: prev?.total ?? 0,
      }));
      toast({ title: 'Sucesso', description: 'Contrato atualizado com sucesso!' });
      if (updateData.status === 'assinado' && tenantId && user?.id) {
        void supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'sucesso',
          titulo: 'Contrato assinado',
          mensagem: `O contrato de ${updated.nome_cliente} foi assinado.`,
          created_by: user.id,
        });
      }
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao atualizar contrato', 'contratos', 'error');
      log.error('Erro ao atualizar contrato', err);
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  const { canUse: canUsePlan, limits: planLimits } = usePlanLimits();

  const createContrato = useCallback(async (data: ContratoInput): Promise<boolean> => {
    if (!user) { toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' }); return false; }
    if (!canUsePlan('leads')) {
      toast({ title: 'Limite atingido', description: `Seu plano permite ${planLimits.leads} clientes. Faça upgrade para criar mais contratos.`, variant: 'destructive' });
      return false;
    }
    try { await createMutation.mutateAsync(data); return true; } catch (err) { log.error('createContrato failed', err); return false; }
  }, [user, createMutation, toast, canUsePlan, planLimits.leads]);

  const updateContrato = useCallback(async (id: string, updateData: Partial<ContratoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch (err) { log.error('updateContrato failed', err); return false; }
  }, [user, tenantId, updateMutation]);

  const fetchContratos = useCallback(() => { void refetch(); }, [refetch]);

  return {
    contratos,
    loading,
    error,
    isEmpty: !loading && !error && contratos.length === 0,
    fetchContratos,
    createContrato,
    updateContrato,
    // Pagination metadata
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
};



