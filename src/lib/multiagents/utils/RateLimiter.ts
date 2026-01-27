export class RateLimiter {
  private calls = new Map<string, number[]>();
  private readonly maxCalls = 10;
  private readonly windowMs = 60000;

  async acquire(key: string): Promise<void> {
    const now = Date.now();
    const calls = this.calls.get(key) || [];
    const recentCalls = calls.filter(time => time > now - this.windowMs);
    
    if (recentCalls.length >= this.maxCalls) {
      const waitTime = recentCalls[0] + this.windowMs - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    recentCalls.push(now);
    this.calls.set(key, recentCalls);
  }
}
