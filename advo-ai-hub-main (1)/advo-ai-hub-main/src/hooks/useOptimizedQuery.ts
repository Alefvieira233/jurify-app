
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { distributedCache } from '@/utils/distributedCache';

// 🚀 PADRÃO ELON MUSK: Hook otimizado com cache distribuído Tesla/SpaceX grade

interface QueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export const useOptimizedQuery = <T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T[] | null; error: any }>,
  options: QueryOptions = {}
) => {
  const { 
    enabled = true, 
    refetchOnMount = true, 
    staleTime = 30000,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;
  
  const { user } = useAuth();
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const cacheRef = useRef<Map<string, { data: T[]; timestamp: number }>>(new Map());

  const executeQuery = useCallback(async (force = false) => {
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    // 🚀 CACHE DISTRIBUÍDO - TESLA/SPACEX GRADE
    // Verificar cache distribuído primeiro (Redis/fallback)
    const distributedCached = await distributedCache.get<T[]>(`query:${queryKey}`);
    if (!force && distributedCached) {
      console.log(`🚀 [${queryKey}] Cache distribuído hit - dados globais`);
      setData(distributedCached);
      setLoading(false);
      return;
    }
    
    // Fallback para cache local (compatibilidade)
    const cached = cacheRef.current.get(queryKey);
    if (!force && cached && (Date.now() - cached.timestamp) < staleTime) {
      console.log(`📋 [${queryKey}] Cache local hit, usando dados em cache`);
      setData(cached.data);
      setLoading(false);
      return;
    }

    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const attemptQuery = async (attempt: number): Promise<void> => {
      try {
        console.log(`🔄 [${queryKey}] Executando query (tentativa ${attempt + 1})...`);
        const startTime = Date.now();
        
        const result = await queryFn();
        
        if (!mountedRef.current) return;

        const duration = Date.now() - startTime;
        console.log(`✅ [${queryKey}] Query concluída em ${duration}ms`);

        if (result.error) throw result.error;

        const resultData = result.data || [];
        setData(resultData);
        setLastFetch(Date.now());
        setError(null);
        setRetryCount(0);
        
        // 🚀 ATUALIZAR CACHE DISTRIBUÍDO - TESLA/SPACEX GRADE
        await distributedCache.set(`query:${queryKey}`, resultData, staleTime);
        
        // Manter cache local para compatibilidade
        cacheRef.current.set(queryKey, {
          data: resultData,
          timestamp: Date.now()
        });
        
        console.log(`📊 [${queryKey}] ${resultData.length} registros carregados`);
        
      } catch (error: any) {
        if (!mountedRef.current) return;
        
        console.error(`❌ [${queryKey}] Erro na query (tentativa ${attempt + 1}):`, error);
        
        if (error.name === 'AbortError') return;
        
        if (attempt < retryAttempts - 1) {
          setRetryCount(attempt + 1);
          setTimeout(() => attemptQuery(attempt + 1), retryDelay * (attempt + 1));
          return;
        }
        
        const errorMessage = error.message || 'Erro ao carregar dados';
        setError(errorMessage);
        setData([]);
        setRetryCount(0);
      }
    };

    await attemptQuery(0);
    
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [user, enabled, queryKey, queryFn, staleTime, retryAttempts, retryDelay]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (user && enabled) {
      executeQuery();
    } else {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, enabled, queryKey]);

  const refetch = useCallback(() => {
    executeQuery(true);
  }, [executeQuery]);

  const mutate = useCallback((newData: T[]) => {
    setData(newData);
    setLastFetch(Date.now());
    
    // Atualizar cache
    cacheRef.current.set(queryKey, {
      data: newData,
      timestamp: Date.now()
    });
  }, [queryKey]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    isEmpty: !loading && !error && data.length === 0,
    isStale: (Date.now() - lastFetch) > staleTime,
    retryCount,
  };
};
