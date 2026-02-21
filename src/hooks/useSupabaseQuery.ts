/**
 * @module useSupabaseQuery
 * @description Hook genérico para queries Supabase com cache, stale-time,
 * abort controller, refetch automático e deduplicação. Base para todos
 * os hooks de dados do sistema (useAgentesIA, useAgendamentos, etc.).
 *
 * @template T - Tipo dos registros retornados
 * @param queryKey - Identificador único para cache e logs
 * @param queryFn - Função que executa a query Supabase
 * @param options - Opções de cache e comportamento
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useSupabaseQuery<Lead>('leads', fetchLeads, { staleTime: 15000 });
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface QueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
}

export const useSupabaseQuery = <T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T[] | null; error: unknown }>,
  options: QueryOptions = {}
) => {
  const { enabled = true, refetchOnMount: _refetchOnMount = true, staleTime = 30000 } = options;

  const { user } = useAuth();
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true); // Start with true
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Refs mirror state values so the cache check inside executeQuery
  // always reads the latest values without needing them in the dep array.
  const dataRef = useRef<T[]>([]);
  const lastFetchRef = useRef<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const hasExecutedRef = useRef(false);

  const executeQuery = useCallback(async (force = false) => {
    // Only proceed if enabled and user exists
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    // Check cache validity using refs so we don't need data/lastFetch in deps
    if (!force && dataRef.current.length > 0) {
      const now = Date.now();
      if ((now - lastFetchRef.current) < staleTime) {
        console.log(`📋 [${queryKey}] Cache válido, usando dados em cache`);
        setLoading(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    hasExecutedRef.current = true;

    try {
      console.log(`🔄 [${queryKey}] Executando query...`);
      const startTime = Date.now();
      
      const result = await queryFn();
      
      if (!mountedRef.current) return;

      const duration = Date.now() - startTime;
      console.log(`✅ [${queryKey}] Query concluída em ${duration}ms`);

      if (result.error) {
        console.error(`❌ [${queryKey}] Erro na query:`, result.error);
        throw result.error instanceof Error ? result.error : new Error(typeof result.error === 'object' && result.error !== null && 'message' in result.error ? String((result.error as Record<string, unknown>).message) : 'Unknown query error');
      }

      const resultData = result.data || [];
      dataRef.current = resultData;
      lastFetchRef.current = Date.now();
      setData(resultData);
      setLastFetch(lastFetchRef.current);
      setError(null);
      
      console.log(`📊 [${queryKey}] ${resultData.length} registros carregados`);
      
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      
      console.error(`❌ [${queryKey}] Erro na query:`, error);
      
      const isAbort = error instanceof Error && error.name === 'AbortError';
      if (!isAbort) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
        setError(errorMessage);
        setData([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, enabled, queryKey, staleTime]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Always execute when user changes or on mount
    if (user && enabled) {
      void executeQuery();
    } else {
      setLoading(false);
    }

    const handleVisibility = () => {
      if (!document.hidden && user && enabled) {
        void executeQuery(true);
      }
    };

    const handleFocus = () => {
      if (user && enabled) {
        void executeQuery(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, enabled, queryKey]);

  const refetch = useCallback(() => {
    hasExecutedRef.current = false;
    void executeQuery(true);
  }, [executeQuery]);

  const mutate = useCallback((newData: T[] | ((prev: T[]) => T[])) => {
    setData((prev) => {
      const next = typeof newData === 'function' ? newData(prev) : newData;
      dataRef.current = next;
      return next;
    });
    const now = Date.now();
    lastFetchRef.current = now;
    setLastFetch(now);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    isEmpty: !loading && !error && data.length === 0,
    isStale: (Date.now() - lastFetch) > staleTime,
  };
};
