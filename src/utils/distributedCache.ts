interface CacheConfig {
  defaultTTL: number;
  enableFallback: boolean;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
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
  private cache: Map<string, CacheItem<unknown>>;
  private stats: CacheStats;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      enableFallback: true,
      ...config
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }

  async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++;

    const cached = this.cache.get(key);
    if (!cached) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return cached.data as T;
  }

  async set<T>(key: string, data: T, ttl: number = this.config.defaultTTL): Promise<boolean> {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      } as CacheItem<unknown>);

      this.cleanup();
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`[DistributedCache] Erro ao armazenar ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    this.cache.delete(key);
    return true;
  }

  async clear(): Promise<boolean> {
    this.cache.clear();
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0
      ? (this.stats.hits / this.stats.totalRequests) * 100
      : 0;
  }

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

  async invalidatePattern(pattern: string): Promise<number> {
    let invalidated = 0;
    const search = pattern.replace('*', '');

    for (const key of this.cache.keys()) {
      if (key.includes(search)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, unknown> } {
    const errorRate = this.stats.totalRequests > 0
      ? (this.stats.errors / this.stats.totalRequests) * 100
      : 0;

    const status = errorRate > 50 ? 'unhealthy' : errorRate > 10 ? 'degraded' : 'healthy';

    return {
      status,
      details: {
        errorRate,
        cacheSize: this.cache.size,
        stats: this.stats
      }
    };
  }
}

export const distributedCache = new DistributedCacheService({
  defaultTTL: 5 * 60 * 1000,
  enableFallback: true
});

export const cacheGet = distributedCache.get.bind(distributedCache);
export const cacheSet = distributedCache.set.bind(distributedCache);
export const cacheDelete = distributedCache.delete.bind(distributedCache);
export const cacheGetOrSet = distributedCache.getOrSet.bind(distributedCache);
export const cacheInvalidatePattern = distributedCache.invalidatePattern.bind(distributedCache);
export const cacheStats = distributedCache.getStats.bind(distributedCache);

export default distributedCache;
