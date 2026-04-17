/**
 * useProcessoAndamentos — fetch tribunal movements (andamentos) for a processo.
 *
 * Data source: `processo_andamentos` table, populated by the `tribunal-sync`
 * edge function (Escavador/Codilo/Jusbrasil provider-agnostic). RLS scopes
 * results to the current tenant automatically.
 *
 * Also exposes a `syncNow` mutation that invokes the edge function to force
 * a refresh from the provider. Used by the "Sincronizar agora" button.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ProcessoAndamento = {
  id: string;
  tenant_id: string;
  processo_id: string;
  data_andamento: string;
  tipo: 'movimento' | 'decisao' | 'despacho' | 'audiencia' | 'sentenca' | 'other' | null;
  descricao: string;
  orgao: string | null;
  provider: string;
  external_id: string | null;
  created_at: string;
};

interface SyncResult {
  synced: number;
  inserted: number;
  errors: { processo_id: string; message: string }[];
}

const LIST_COLUMNS =
  'id,tenant_id,processo_id,data_andamento,tipo,descricao,orgao,provider,external_id,created_at';

export const useProcessoAndamentos = (processoId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.processos.andamentos(processoId),
    enabled: !!processoId,
    staleTime: 60 * 1000, // 1 min — andamentos update infrequently
    queryFn: async (): Promise<ProcessoAndamento[]> => {
      const { data, error } = await supabase
        .from('processo_andamentos')
        .select(LIST_COLUMNS)
        .eq('processo_id', processoId!)
        .order('data_andamento', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as ProcessoAndamento[];
    },
  });

  const syncNow = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      if (!processoId) throw new Error('processoId requerido');
      const { data, error } = await supabase.functions.invoke('tribunal-sync', {
        body: { processo_id: processoId },
      });
      if (error) throw error;
      return data as SyncResult;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.processos.andamentos(processoId),
      });
      if (result.errors.length > 0) {
        toast({
          title: 'Sincronização concluída com erros',
          description: result.errors[0]?.message ?? 'Verifique a configuração do provider.',
          variant: 'destructive',
        });
      } else if (result.inserted === 0) {
        toast({
          title: 'Nenhum andamento novo',
          description: 'O processo já está atualizado.',
        });
      } else {
        toast({
          title: 'Andamentos sincronizados',
          description: `${result.inserted} novo(s) andamento(s) adicionado(s).`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: 'Falha na sincronização',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    andamentos: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    syncNow: () => syncNow.mutate(),
    syncing: syncNow.isPending,
  };
};
