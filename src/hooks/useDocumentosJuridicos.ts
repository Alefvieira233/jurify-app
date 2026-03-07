/**
 * Hook para gerenciamento de Documentos Jurídicos.
 * Padrão: useProcessos.ts
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

const log = createLogger('Documentos');

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumentoJuridico = {
  id: string;
  tenant_id: string | null;
  processo_id: string | null;
  lead_id: string | null;
  nome_arquivo: string;
  nome_original: string;
  storage_path: string;
  url_publica: string | null;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  tipo_documento: string;
  content_hash: string | null;
  hash_algorithm: string | null;
  descricao: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type DocumentoInput = Partial<Omit<DocumentoJuridico, 'id' | 'created_at' | 'updated_at'>>;

export const documentosQueryKey = (tenantId: string | undefined) =>
  ['documentos_juridicos', tenantId] as const;

function normalizeDocumento(row: Record<string, unknown>): DocumentoJuridico {
  return { ...(row as DocumentoJuridico) };
}

const PAGE_SIZE = 25;

export type DocumentoWithSignedUrl = DocumentoJuridico & { signedUrl: string | null };

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useDocumentosJuridicos = (options?: { processoId?: string; leadId?: string; page?: number }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const qKey = documentosQueryKey(tenantId);
  const page = options?.page ?? 1;

  const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...qKey, options?.processoId, options?.leadId, page],
    queryFn: async () => {
      let query = supabase
        .from('documentos_juridicos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (options?.processoId) query = query.eq('processo_id', options.processoId);
      if (options?.leadId) query = query.eq('lead_id', options.leadId);

      const { data, error, count } = await query;
      if (error) { log.error('Erro ao buscar documentos', error); throw error; }

      const items = await Promise.all(
        (data || []).map(async (row) => {
          const doc = normalizeDocumento(row as Record<string, unknown>);
          const { data: signedData } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.storage_path, 3600);
          return { ...doc, signedUrl: signedData?.signedUrl ?? null } as DocumentoWithSignedUrl;
        })
      );

      return {
        items,
        totalCount: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const documentos = queryData?.items ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const error = queryError ? queryError.message : null;

  const createMutation = useMutation({
    mutationFn: async (data: DocumentoInput) => {
      const { data: created, error } = await supabase
        .from('documentos_juridicos')
        .insert([{ ...data, tenant_id: tenantId ?? null }])
        .select()
        .single();
      if (error) throw error;
      return normalizeDocumento(created as Record<string, unknown>);
    },
    onSuccess: (newItem) => {
      addSentryBreadcrumb(`Documento criado: ${newItem.id}`, 'documentos', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: [newItem, ...(prev?.items ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Documento salvo', description: 'Documento jurídico cadastrado com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao criar documento', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao salvar documento.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      // Remove do Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);
      if (storageError) log.warn('Erro ao remover arquivo do storage', { message: storageError.message });

      const { error } = await supabase
        .from('documentos_juridicos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).filter(i => i.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({ title: 'Documento removido', description: 'Documento excluído com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao deletar documento', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    },
  });

  const uploadDocumento = useCallback(async (
    file: File,
    metadata: DocumentoInput,
  ): Promise<boolean> => {
    if (!user || !tenantId) {
      toast({ title: 'Não autenticado', variant: 'destructive' });
      return false;
    }
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const processoId = metadata.processo_id ?? 'avulso';
      const storagePath = `${tenantId}/processos/${processoId}/${Date.now()}-${sanitizedName}`;

      // SHA-256 hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600);

      await createMutation.mutateAsync({
        ...metadata,
        nome_arquivo: sanitizedName,
        nome_original: file.name,
        storage_path: storagePath,
        url_publica: signedData?.signedUrl ?? null,
        content_hash: hashHex,
        hash_algorithm: 'SHA-256',
        tipo_mime: file.type,
        tamanho_bytes: file.size,
        uploaded_by: user.id,
      });
      return true;
    } catch (err) {
      log.error('Erro ao fazer upload', err);
      toast({
        title: 'Erro no upload',
        description: err instanceof Error ? err.message : 'Falha ao enviar o arquivo.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, tenantId, createMutation, toast]);

  const deleteDocumento = useCallback(async (id: string, storagePath: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await deleteMutation.mutateAsync({ id, storagePath }); return true; } catch { return false; }
  }, [user, tenantId, deleteMutation]);

  const fetchDocumentos = useCallback(() => { void refetch(); }, [refetch]);

  return {
    documentos,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    page,
    loading,
    error,
    isEmpty: !loading && !error && documentos.length === 0,
    fetchDocumentos,
    uploadDocumento,
    deleteDocumento,
  };
};
