// ==========================================
// MONITORING & ANALYTICS SERVICE
// ==========================================

interface MetricEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  tenantId?: string;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private events: MetricEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private isProduction = process.env.NODE_ENV === 'production';

  // Business Metrics
  trackLeadConversion(leadId: string, fromStatus: string, toStatus: string, userId?: string, tenantId?: string) {
    this.trackEvent('Lead Status Changed', {
      leadId,
      fromStatus,
      toStatus,
      conversionType: this.getConversionType(fromStatus, toStatus)
    }, userId, tenantId);
  }

  trackContractSigned(contractId: string, value: number, userId?: string, tenantId?: string) {
    this.trackEvent('Contract Signed', {
      contractId,
      value,
      currency: 'BRL'
    }, userId, tenantId);
  }

  trackAIAgentExecution(agentId: string, success: boolean, duration: number, userId?: string, tenantId?: string) {
    this.trackEvent('AI Agent Executed', {
      agentId,
      success,
      duration,
      performance: duration < 3000 ? 'good' : duration < 10000 ? 'average' : 'slow'
    }, userId, tenantId);
  }

  trackUserAction(action: string, module: string, userId?: string, tenantId?: string, metadata?: Record<string, any>) {
    this.trackEvent('User Action', {
      action,
      module,
      ...metadata
    }, userId, tenantId);
  }

  trackError(error: Error, context: string, userId?: string, tenantId?: string) {
    this.trackEvent('Error Occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      severity: this.getErrorSeverity(error)
    }, userId, tenantId);

    // Send to external monitoring service in production
    if (this.isProduction) {
      this.sendToSentry(error, context, { userId, tenantId });
    }
  }

  // Performance Metrics
  startPerformanceTimer(name: string): () => void {
    const startTime = performance.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.trackPerformance(name, duration, metadata);
    };
  }

  trackPerformance(name: string, duration: number, metadata?: Record<string, any>) {
    this.performanceMetrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Log slow operations
    if (duration > 5000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }

    // Keep only last 100 metrics in memory
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  // Health Checks
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: string; latency?: number; error?: string }>;
  }> {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Database check
    try {
      const dbStart = performance.now();
      // This would be a simple query to test DB connectivity
      const dbLatency = performance.now() - dbStart;
      checks.database = { status: 'healthy', latency: dbLatency };
    } catch (error) {
      checks.database = { status: 'unhealthy', error: (error as Error).message };
    }

    // External APIs check
    checks.openai = await this.checkExternalAPI('OpenAI', 'https://api.openai.com/v1/models');
    checks.zapsign = await this.checkExternalAPI('ZapSign', process.env.VITE_ZAPSIGN_BASE_URL);

    // Determine overall status
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');
    const hasDegraded = Object.values(checks).some(check => check.status === 'degraded');
    
    const status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    return { status, checks };
  }

  // Private methods
  private trackEvent(name: string, properties: Record<string, any>, userId?: string, tenantId?: string) {
    const event: MetricEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId,
      tenantId
    };

    this.events.push(event);

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Send to analytics service in production
    if (this.isProduction) {
      this.sendToAnalytics(event);
    }

    // Log in development
    if (!this.isProduction) {
      console.log(`📊 [Analytics] ${name}:`, properties);
    }
  }

  private getConversionType(fromStatus: string, toStatus: string): string {
    const conversions: Record<string, string> = {
      'novo_lead->em_qualificacao': 'qualification',
      'em_qualificacao->proposta_enviada': 'proposal',
      'proposta_enviada->contrato_assinado': 'conversion',
      'contrato_assinado->em_atendimento': 'activation'
    };
    
    return conversions[`${fromStatus}->${toStatus}`] || 'other';
  }

  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout')) return 'medium';
    if (message.includes('permission') || message.includes('unauthorized')) return 'high';
    if (message.includes('database') || message.includes('critical')) return 'critical';
    
    return 'low';
  }

  private async checkExternalAPI(name: string, url?: string): Promise<{ status: string; latency?: number; error?: string }> {
    if (!url) return { status: 'degraded', error: 'URL not configured' };

    try {
      const start = performance.now();
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const latency = performance.now() - start;

      if (response.ok) {
        return { status: 'healthy', latency };
      } else {
        return { status: 'degraded', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }

  private sendToSentry(error: Error, context: string, metadata: Record<string, any>) {
    // This would integrate with Sentry SDK
    console.error('🚨 [Sentry]', error, { context, ...metadata });
  }

  private sendToAnalytics(event: MetricEvent) {
    // This would integrate with analytics service (Mixpanel, Amplitude, etc.)
    console.log('📈 [Analytics]', event);
  }

  // Public getters for debugging
  getRecentEvents(limit = 50): MetricEvent[] {
    return this.events.slice(-limit);
  }

  getPerformanceMetrics(limit = 50): PerformanceMetric[] {
    return this.performanceMetrics.slice(-limit);
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Convenience functions
export const trackUserAction = monitoring.trackUserAction.bind(monitoring);
export const trackError = monitoring.trackError.bind(monitoring);
export const startTimer = monitoring.startPerformanceTimer.bind(monitoring);
export const checkHealth = monitoring.checkSystemHealth.bind(monitoring);
