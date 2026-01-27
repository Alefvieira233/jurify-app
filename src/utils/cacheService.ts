// ==========================================
// CACHE SERVICE - REDIS INTEGRATION
// ==========================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Memory cache fallback (when Redis not available)
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first (when available)
      if (typeof window === 'undefined' && process.env.REDIS_URL) {
        return await this.getFromRedis<T>(key);
      }
      
      // Fallback to memory cache
      return this.getFromMemory<T>(key);
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      // Try Redis first (when available)
      if (typeof window === 'undefined' && process.env.REDIS_URL) {
        await this.setToRedis(key, value, ttl);
        return;
      }
      
      // Fallback to memory cache
      this.setToMemory(key, value, ttl);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Try Redis first
      if (typeof window === 'undefined' && process.env.REDIS_URL) {
        await this.invalidateRedis(pattern);
        return;
      }
      
      // Fallback to memory cache
      this.invalidateMemory(pattern);
    } catch (error) {
      console.warn('Cache invalidate error:', error);
    }
  }

  // Memory cache methods
  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp + item.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.data;
  }

  private setToMemory<T>(key: string, value: T, ttl: number): void {
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
    
    // Cleanup expired items periodically
    if (this.memoryCache.size > 100) {
      this.cleanupMemoryCache();
    }
  }

  private invalidateMemory(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.timestamp + item.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Redis methods (server-side only)
  private async getFromRedis<T>(key: string): Promise<T | null> {
    // This would be implemented with actual Redis client
    // For now, return null to fallback to memory cache
    return null;
  }

  private async setToRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    // This would be implemented with actual Redis client
    // For now, fallback to memory cache
    this.setToMemory(key, value, ttl);
  }

  private async invalidateRedis(pattern: string): Promise<void> {
    // This would be implemented with actual Redis client
    // For now, fallback to memory cache
    this.invalidateMemory(pattern);
  }

  // Utility methods
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Cache strategies
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key generators
export const CacheKeys = {
  AGENTES_IA: (tenantId: string) => `agentes_ia:${tenantId}`,
  LEADS: (tenantId: string) => `leads:${tenantId}`,
  DASHBOARD_METRICS: (tenantId: string) => `dashboard:${tenantId}`,
  USER_PERMISSIONS: (userId: string) => `permissions:${userId}`,
  CONTRATOS: (tenantId: string) => `contratos:${tenantId}`,
  AGENDAMENTOS: (tenantId: string) => `agendamentos:${tenantId}`,
} as const;
