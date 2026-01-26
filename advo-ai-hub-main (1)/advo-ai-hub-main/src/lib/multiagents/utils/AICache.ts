export class AICache {
  private cache = new Map<string, { result: string; timestamp: number }>();
  private readonly ttl = 3600000; // 1 hora

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: string): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}
