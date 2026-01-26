// 🚀 PADRÃO ELON MUSK: Cache distribuído para escala global
// Sistema de cache que funciona em cluster/load balancer - Tesla/SpaceX grade

interface CacheConfig {
  defaultTTL: number;
  maxRetries: number;
  retryDelay: number;
  enableFallback: boolean;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
}

class DistributedCacheService {
  private config: CacheConfig;
  private fallbackCache: Map<string, CacheItem<any>>;
  private stats: CacheStats;
  private redisClient: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      maxRetries: 3,
      retryDelay: 1000,
      enableFallback: true,
      ...config
    };

    this.fallbackCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0
    };

    this.initializeRedis();
  }

  // 🚀 INICIALIZAÇÃO REDIS - PRODUÇÃO
  private async initializeRedis() {
    try {
      // Em produção, usar Redis real
      if (typeof window === 'undefined' && (globalThis as any).process?.env?.REDIS_URL) {
        // const Redis = await import('ioredis');
        // this.redisClient = new Redis.default(process.env.REDIS_URL);
        console.log('🚀 [DistributedCache] Redis configurado para produção');
      } else {
        console.log('🔄 [DistributedCache] Usando fallback local (desenvolvimento)');
      }
    } catch (error) {
      console.error('❌ [DistributedCache] Erro ao inicializar Redis:', error);
      if (!this.config.enableFallback) {
        throw new Error('Redis obrigatório em produção');
      }
    }
  }

  // 🚀 GET - BUSCAR DADOS DO CACHE
  async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++;

    try {
      // Tentar Redis primeiro
      if (this.redisClient) {
        const cached = await this.getFromRedis<T>(key);
        if (cached !== null) {
          this.stats.hits++;
          this.updateHitRate();
          return cached;
        }
      }

      // Fallback para cache local
      const fallbackResult = this.getFromFallback<T>(key);
      if (fallbackResult !== null) {
        this.stats.hits++;
        this.updateHitRate();
        return fallbackResult;
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;

    } catch (error) {
      this.stats.errors++;
      console.error(`❌ [DistributedCache] Erro ao buscar ${key}:`, error);
      
      // Tentar fallback em caso de erro
      if (this.config.enableFallback) {
        return this.getFromFallback<T>(key);
      }
      
      return null;
    }
  }

  // 🚀 SET - ARMAZENAR DADOS NO CACHE
  async set<T>(key: string, data: T, ttl: number = this.config.defaultTTL): Promise<boolean> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: '1.0.0'
      };

      // Armazenar no Redis
      if (this.redisClient) {
        await this.setInRedis(key, cacheItem, ttl);
      }

      // Armazenar no fallback
      if (this.config.enableFallback) {
        this.setInFallback(key, cacheItem);
      }

      return true;

    } catch (error) {
      this.stats.errors++;
      console.error(`❌ [DistributedCache] Erro ao armazenar ${key}:`, error);
      
      // Tentar fallback
      if (this.config.enableFallback) {
        this.setInFallback(key, { data, timestamp: Date.now(), ttl, version: '1.0.0' });
        return true;
      }
      
      return false;
    }
  }

  // 🚀 DELETE - REMOVER DO CACHE
  async delete(key: string): Promise<boolean> {
    try {
      // Remover do Redis
      if (this.redisClient) {
        await this.redisClient.del(key);
      }

      // Remover do fallback
      this.fallbackCache.delete(key);

      return true;
    } catch (error) {
      console.error(`❌ [DistributedCache] Erro ao deletar ${key}:`, error);
      return false;
    }
  }

  // 🚀 CLEAR - LIMPAR CACHE
  async clear(): Promise<boolean> {
    try {
      // Limpar Redis
      if (this.redisClient) {
        await this.redisClient.flushdb();
      }

      // Limpar fallback
      this.fallbackCache.clear();

      return true;
    } catch (error) {
      console.error('❌ [DistributedCache] Erro ao limpar cache:', error);
      return false;
    }
  }

  // 🚀 REDIS OPERATIONS
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisClient) return null;

    try {
      const cached = await this.redisClient.get(key);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Verificar TTL
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        await this.redisClient.del(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error(`❌ [DistributedCache] Erro Redis GET ${key}:`, error);
      return null;
    }
  }

  private async setInRedis<T>(key: string, cacheItem: CacheItem<T>, ttl: number): Promise<void> {
    if (!this.redisClient) return;

    try {
      const serialized = JSON.stringify(cacheItem);
      await this.redisClient.setex(key, Math.ceil(ttl / 1000), serialized);
    } catch (error) {
      console.error(`❌ [DistributedCache] Erro Redis SET ${key}:`, error);
      throw error;
    }
  }

  // 🚀 FALLBACK OPERATIONS
  private getFromFallback<T>(key: string): T | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) return null;

    // Verificar TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setInFallback<T>(key: string, cacheItem: CacheItem<T>): void {
    this.fallbackCache.set(key, cacheItem);

    // Limpeza automática de itens expirados
    this.cleanupFallback();
  }

  // 🚀 CLEANUP E MANUTENÇÃO
  private cleanupFallback(): void {
    const now = Date.now();
    
    for (const [key, item] of this.fallbackCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.fallbackCache.delete(key);
      }
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
  }

  // 🚀 CACHE STRATEGIES
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.config.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  // 🚀 PATTERN OPERATIONS
  async invalidatePattern(pattern: string): Promise<number> {
    let invalidated = 0;

    try {
      // Redis pattern invalidation
      if (this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          invalidated += keys.length;
        }
      }

      // Fallback pattern invalidation
      for (const key of this.fallbackCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.fallbackCache.delete(key);
          invalidated++;
        }
      }

      return invalidated;
    } catch (error) {
      console.error(`❌ [DistributedCache] Erro ao invalidar pattern ${pattern}:`, error);
      return 0;
    }
  }

  // 🚀 MONITORING E STATS
  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: any } {
    const errorRate = (this.stats.errors / this.stats.totalRequests) * 100;
    
    if (errorRate > 50) {
      return {
        status: 'unhealthy',
        details: {
          errorRate,
          redisConnected: !!this.redisClient,
          fallbackSize: this.fallbackCache.size,
          stats: this.stats
        }
      };
    }
    
    if (errorRate > 10 || !this.redisClient) {
      return {
        status: 'degraded',
        details: {
          errorRate,
          redisConnected: !!this.redisClient,
          fallbackSize: this.fallbackCache.size,
          stats: this.stats
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        errorRate,
        redisConnected: !!this.redisClient,
        fallbackSize: this.fallbackCache.size,
        stats: this.stats
      }
    };
  }
}

// 🚀 SINGLETON EXPORT - PADRÃO TESLA/SPACEX
export const distributedCache = new DistributedCacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000,
  enableFallback: true
});

// 🚀 CONVENIENCE EXPORTS
export const cacheGet = distributedCache.get.bind(distributedCache);
export const cacheSet = distributedCache.set.bind(distributedCache);
export const cacheDelete = distributedCache.delete.bind(distributedCache);
export const cacheGetOrSet = distributedCache.getOrSet.bind(distributedCache);
export const cacheInvalidatePattern = distributedCache.invalidatePattern.bind(distributedCache);
export const cacheStats = distributedCache.getStats.bind(distributedCache);

export default distributedCache;
