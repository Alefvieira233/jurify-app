interface ContextEntry {
  data: Record<string, unknown>;
  updated_at: number;
}

const MAX_ENTRIES = 10_000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export class SharedContext {
  private static instance: SharedContext;
  private contexts = new Map<string, ContextEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.cleanupTimer = setInterval(() => this.evictExpired(), CLEANUP_INTERVAL_MS);
  }

  static getInstance(): SharedContext {
    if (!SharedContext.instance) {
      SharedContext.instance = new SharedContext();
    }
    return SharedContext.instance;
  }

  set(leadId: string, data: Record<string, unknown>): void {
    if (this.contexts.size >= MAX_ENTRIES && !this.contexts.has(leadId)) {
      this.evictOldest();
    }
    const existing = this.contexts.get(leadId);
    this.contexts.set(leadId, {
      data: { ...(existing?.data ?? {}), ...data },
      updated_at: Date.now(),
    });
  }

  get(leadId: string): Record<string, unknown> {
    const entry = this.contexts.get(leadId);
    if (!entry) return {};
    if (Date.now() - entry.updated_at > TTL_MS) {
      this.contexts.delete(leadId);
      return {};
    }
    return entry.data;
  }

  clear(leadId: string): void {
    this.contexts.delete(leadId);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.contexts) {
      if (now - entry.updated_at > TTL_MS) {
        this.contexts.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.contexts) {
      if (entry.updated_at < oldestTime) {
        oldestTime = entry.updated_at;
        oldestKey = key;
      }
    }
    if (oldestKey) this.contexts.delete(oldestKey);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.contexts.clear();
  }
}
