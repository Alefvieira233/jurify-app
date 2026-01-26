export class SharedContext {
  private static instance: SharedContext;
  private contexts = new Map<string, any>();

  static getInstance(): SharedContext {
    if (!SharedContext.instance) {
      SharedContext.instance = new SharedContext();
    }
    return SharedContext.instance;
  }

  set(leadId: string, data: any): void {
    this.contexts.set(leadId, { ...this.contexts.get(leadId), ...data, updated_at: new Date() });
  }

  get(leadId: string): any {
    return this.contexts.get(leadId) || {};
  }

  clear(leadId: string): void {
    this.contexts.delete(leadId);
  }
}
