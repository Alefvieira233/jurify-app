/**
 * useDocumentoFolders — hierarchical folder management for documentos_juridicos.
 *
 * Backed by the `documento_folders` table (migration 20260417000012). All
 * reads/writes are tenant-scoped via RLS (FORCED); we still filter client-side
 * by tenant_id for defense-in-depth.
 *
 * CRUD:
 *   - createFolder({ name, parentId? })
 *   - renameFolder(id, newName)
 *   - deleteFolder(id)            — ON DELETE CASCADE cascades children;
 *                                    documentos.folder_id is SET NULL.
 *   - moveDocumento(docId, folderId|null)
 *
 * The hook also exposes a precomputed `tree` (root nodes w/ children) for
 * easy rendering of a sidebar.
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('useDocumentoFolders');

export interface DocumentoFolder {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderNode extends DocumentoFolder {
  children: FolderNode[];
}

// Supabase type-gen may not yet include documento_folders. Narrow casts are
// used in the calls below, scoped to this file so the rest of the app stays
// typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromFolders = () => (supabase as any).from('documento_folders');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromDocumentos = () => (supabase as any).from('documentos_juridicos');

function buildTree(flat: DocumentoFolder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  flat.forEach((f) => byId.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  byId.forEach((node) => {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (arr: FolderNode[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function useDocumentoFolders() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const qKey = queryKeys.documentoFolders.list(tenantId);

  const { data: folders = [], isLoading, error, refetch } = useQuery<DocumentoFolder[]>({
    queryKey: qKey,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error: qErr } = await fromFolders()
        .select('id, tenant_id, name, parent_id, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (qErr) {
        log.error('Erro ao buscar folders', qErr);
        throw qErr;
      }
      return (data ?? []) as DocumentoFolder[];
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tree = useMemo(() => buildTree(folders), [folders]);

  const createMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const clean = name.trim();
      if (!clean) throw new Error('Nome obrigatório');
      const { data, error: mErr } = await fromFolders()
        .insert({ tenant_id: tenantId, name: clean, parent_id: parentId ?? null })
        .select()
        .single();
      if (mErr) throw mErr;
      return data as DocumentoFolder;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentoFolders.all });
      toast({ title: 'Pasta criada' });
    },
    onError: (err: unknown) => {
      log.error('createFolder failed', err);
      toast({ title: 'Erro ao criar pasta', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const clean = name.trim();
      if (!clean) throw new Error('Nome obrigatório');
      const { error: mErr } = await fromFolders()
        .update({ name: clean })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (mErr) throw mErr;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentoFolders.all });
      toast({ title: 'Pasta renomeada' });
    },
    onError: (err: unknown) => {
      log.error('renameFolder failed', err);
      toast({ title: 'Erro ao renomear', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error: mErr } = await fromFolders()
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (mErr) throw mErr;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentoFolders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentosJuridicos.all });
      toast({ title: 'Pasta excluída' });
    },
    onError: (err: unknown) => {
      log.error('deleteFolder failed', err);
      toast({ title: 'Erro ao excluir pasta', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const moveDocumentoMutation = useMutation({
    mutationFn: async ({ docId, folderId }: { docId: string; folderId: string | null }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error: mErr } = await fromDocumentos()
        .update({ folder_id: folderId })
        .eq('id', docId)
        .eq('tenant_id', tenantId);
      if (mErr) throw mErr;
      return docId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentosJuridicos.all });
      toast({ title: 'Documento movido' });
    },
    onError: (err: unknown) => {
      log.error('moveDocumento failed', err);
      toast({ title: 'Erro ao mover documento', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const createFolder = useCallback(
    async (name: string, parentId?: string | null) => {
      try { await createMutation.mutateAsync({ name, parentId }); return true; } catch { return false; }
    },
    [createMutation],
  );
  const renameFolder = useCallback(
    async (id: string, name: string) => {
      try { await renameMutation.mutateAsync({ id, name }); return true; } catch { return false; }
    },
    [renameMutation],
  );
  const deleteFolder = useCallback(
    async (id: string) => {
      try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
    },
    [deleteMutation],
  );
  const moveDocumento = useCallback(
    async (docId: string, folderId: string | null) => {
      try { await moveDocumentoMutation.mutateAsync({ docId, folderId }); return true; } catch { return false; }
    },
    [moveDocumentoMutation],
  );

  return {
    folders,
    tree,
    isLoading,
    error: error ? error.message : null,
    refetch,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocumento,
  };
}
