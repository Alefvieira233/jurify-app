
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

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

export const contratosQueryKey = (tenantId: string | undefined) =>
  ['contratos', tenantId] as const;

export const useContratos = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const qKey = contratosQueryKey(tenantId);

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: contratos = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Contrato[]>({
    queryKey: qKey,
    queryFn: async () => {
      let query = supabase
        .from('contratos')
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(100);

      if (tenantId) query = query.eq('tenant_id', tenantId);

      const { data, error } = await query;
      if (error) { log.error('Erro ao buscar contratos', error); throw error; }
      log.debug(`${data?.length ?? 0} contratos encontrados`);
      return (data || []).map(normalizeContrato);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

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
      queryClient.setQueryData<Contrato[]>(qKey, prev => [newContrato, ...(prev ?? [])]);
      toast({ title: 'Sucesso', description: 'Contrato criado com sucesso!' });
      log.info('Contrato criado', { id: newContrato.id });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao criar contrato', 'contratos', 'error');
      log.error('Erro ao criar contrato', err);
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível criar o contrato.', variant: 'destructive' });
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
    onSuccess: (updated) => {
      addSentryBreadcrumb(`Contrato atualizado: ${updated.id}`, 'contratos', 'info');
      queryClient.setQueryData<Contrato[]>(qKey, prev =>
        (prev ?? []).map(c => c.id === updated.id ? { ...c, ...updated } : c)
      );
      toast({ title: 'Sucesso', description: 'Contrato atualizado com sucesso!' });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao atualizar contrato', 'contratos', 'error');
      log.error('Erro ao atualizar contrato', err);
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível atualizar o contrato.', variant: 'destructive' });
    },
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  const createContrato = useCallback(async (data: ContratoInput): Promise<boolean> => {
    if (!user) { toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' }); return false; }
    try { await createMutation.mutateAsync(data); return true; } catch { return false; }
  }, [user, createMutation, toast]);

  const updateContrato = useCallback(async (id: string, updateData: Partial<ContratoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch { return false; }
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
  };
};



