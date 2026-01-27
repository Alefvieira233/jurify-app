
import { useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutos

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Limpeza automática de itens expirados
    this.cleanup();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

const globalCache = new CacheManager();

export const useCacheManager = () => {
  const cacheRef = useRef(globalCache);

  const setCache = useCallback(<T>(key: string, data: T, ttl?: number) => {
    cacheRef.current.set(key, data, ttl);
  }, []);

  const getCache = useCallback(<T>(key: string): T | null => {
    return cacheRef.current.get<T>(key);
  }, []);

  const hasCache = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

  const invalidateCache = useCallback((key: string) => {
    cacheRef.current.invalidate(key);
  }, []);

  const invalidatePattern = useCallback((pattern: string) => {
    cacheRef.current.invalidatePattern(pattern);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  return {
    setCache,
    getCache,
    hasCache,
    invalidateCache,
    invalidatePattern,
    clearCache,
    getCacheStats,
  };
};
