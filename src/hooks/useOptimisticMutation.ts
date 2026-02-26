/**
 * useOptimisticMutation — Generic optimistic update wrapper
 * 
 * Atualiza UI ANTES da resposta do servidor.
 * Rollback automático em caso de erro.
 * Perceived latency = 0ms
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticConfig<TData, TVariables> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate: (oldData: TData[] | undefined, variables: TVariables) => TData[];
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TData extends { id: string }, TVariables>(
  config: OptimisticConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: config.mutationFn,

    onMutate: async (variables: TVariables) => {
      // Cancel ongoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // Snapshot previous state for rollback
      const previousData = queryClient.getQueryData<TData[]>(config.queryKey);

      // Optimistically update cache
      queryClient.setQueryData<TData[]>(
        config.queryKey,
        (old) => config.optimisticUpdate(old, variables)
      );

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      // Rollback to previous state
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }

      toast({
        title: 'Erro',
        description: config.errorMessage || 'Operação falhou. Alterações revertidas.',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      if (config.successMessage) {
        toast({
          title: 'Sucesso',
          description: config.successMessage,
        });
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency with server
      void queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  return mutation;
}

/**
 * Optimistic helpers for common operations
 */
export function optimisticInsert<T extends { id: string }>(
  oldData: T[] | undefined,
  newItem: T
): T[] {
  return [newItem, ...(oldData || [])];
}

export function optimisticUpdate<T extends { id: string }>(
  oldData: T[] | undefined,
  id: string,
  updates: Partial<T>
): T[] {
  return (oldData || []).map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
}

export function optimisticDelete<T extends { id: string }>(
  oldData: T[] | undefined,
  id: string
): T[] {
  return (oldData || []).filter((item) => item.id !== id);
}

/**
 * Optimistic status change (common in Kanban)
 */
export function useOptimisticStatusChange<T extends { id: string; status: string | null }>(
  queryKey: QueryKey,
  updateFn: (id: string, status: string) => Promise<T>
) {
  return useOptimisticMutation<T, { id: string; status: string }>({
    queryKey,
    mutationFn: ({ id, status }) => updateFn(id, status),
    optimisticUpdate: (old, { id, status }) =>
      optimisticUpdate(old, id, { status } as Partial<T>),
    successMessage: 'Status atualizado',
  });
}
