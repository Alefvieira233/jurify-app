import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('SystemHealth');

type ServiceStatus = 'connected' | 'error' | 'not_configured' | 'unknown';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  version: string;
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    database: ServiceStatus;
    openai: ServiceStatus;
    whatsapp_evolution: ServiceStatus;
    stripe: ServiceStatus;
    zapsign: ServiceStatus;
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
  };
}

const DEFAULT_HEALTH: HealthStatus = {
  status: 'unknown',
  version: '',
  timestamp: '',
  services: {
    supabase: 'unknown',
    database: 'unknown',
    openai: 'unknown',
    whatsapp_evolution: 'unknown',
    stripe: 'unknown',
    zapsign: 'unknown',
  },
  performance: { responseTime: 0, memoryUsage: 0 },
};

interface UseSystemHealthOptions {
  /** Polling interval in ms (default 60_000) */
  pollInterval?: number;
  /** Whether to auto-poll (default false) */
  autoPoll?: boolean;
}

export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const { pollInterval = 60_000, autoPoll = false } = options;
  const { profile } = useAuth();
  const [health, setHealth] = useState<HealthStatus>(DEFAULT_HEALTH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('health-check', {
        method: 'GET',
      });

      if (fnError) throw fnError;

      if (data && typeof data === 'object') {
        setHealth(data as HealthStatus);
        setLastChecked(new Date());
        log.debug('Health check completed', { status: (data as HealthStatus).status });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao verificar saúde do sistema';
      setError(msg);
      log.error('Health check failed', err);
      setHealth(prev => ({ ...prev, status: 'error' }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-polling
  useEffect(() => {
    if (!autoPoll || !profile?.tenant_id) return;

    void fetchHealth();
    intervalRef.current = setInterval(() => void fetchHealth(), pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPoll, pollInterval, fetchHealth, profile?.tenant_id]);

  const serviceCount = Object.values(health.services);
  const connectedCount = serviceCount.filter(s => s === 'connected').length;
  const errorCount = serviceCount.filter(s => s === 'error').length;
  const totalConfigured = serviceCount.filter(s => s !== 'not_configured' && s !== 'unknown').length;

  return {
    health,
    loading,
    error,
    lastChecked,
    refresh: fetchHealth,
    summary: {
      connectedCount,
      errorCount,
      totalConfigured,
      healthPercent: totalConfigured > 0 ? Math.round((connectedCount / totalConfigured) * 100) : 0,
    },
  };
}
