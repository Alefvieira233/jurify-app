
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
}

export const useSupabaseQuery = <T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T[] | null; error: { message?: string; name?: string } | null | unknown }>,
  options: QueryOptions = {}
) => {
  const { enabled = true, refetchOnMount = true, staleTime = 30000 } = options;
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true); // Start with true
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const hasExecutedRef = useRef(false);

  const executeQuery = useCallback(async (force = false) => {
    // Only proceed if enabled and user exists
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    // Check cache validity (only skip if not forcing and data exists)
    if (!force && data.length > 0) {
      const now = Date.now();
      if ((now - lastFetch) < staleTime) {
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
        throw result.error;
      }

      const resultData = result.data || [];
      setData(resultData);
      setLastFetch(Date.now());
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
  }, [user, enabled, queryKey, staleTime, data.length, lastFetch]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Always execute when user changes or on mount
    if (user && enabled) {
      executeQuery();
    } else {
      setLoading(false);
    }

    const handleVisibility = () => {
      if (!document.hidden && user && enabled) {
        executeQuery(true);
      }
    };

    const handleFocus = () => {
      if (user && enabled) {
        executeQuery(true);
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
  }, [user, enabled, queryKey]); // Add queryKey to dependencies

  const refetch = useCallback(() => {
    hasExecutedRef.current = false;
    executeQuery(true);
  }, [executeQuery]);

  const mutate = useCallback((newData: T[] | ((prev: T[]) => T[])) => {
    setData((prev) => (typeof newData === 'function' ? newData(prev) : newData));
    setLastFetch(Date.now());
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
