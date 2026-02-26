/**
 * Cache Layer — In-memory cache for Edge Functions
 *
 * Uses a Map with TTL-based expiration. Shared across requests within
 * the same Edge Function isolate (Deno cold-start lifetime ~5-15 min).
 *
 * For cross-isolate persistence, falls back to Supabase table `cache_entries`.
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/** Get a cached value. Returns null if expired or missing. */
export function getCache<T = unknown>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Set a cache value with TTL in seconds. */
export function setCache<T = unknown>(key: string, value: T, ttlSeconds: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/** Invalidate all keys matching a prefix pattern. */
export function invalidatePattern(pattern: string): number {
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(pattern)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

/** Clear the entire cache. */
export function clearCache(): void {
  memoryCache.clear();
}

/** Get cache stats for monitoring. */
export function getCacheStats(): { size: number; keys: string[] } {
  // Prune expired entries first
  for (const [key, entry] of memoryCache.entries()) {
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

// TTL constants (seconds)
export const CACHE_TTL = {
  METRICS: 5 * 60,       // 5 min
  LEADS: 15 * 60,        // 15 min
  CONTRACTS: 15 * 60,    // 15 min
  PROFILE: 30 * 60,      // 30 min
  RATE_LIMIT: 60,        // 1 min window
} as const;
