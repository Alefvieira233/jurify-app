/**
 * useRealtimeSync — Supabase Realtime para colaboração multi-usuário
 * 
 * Escuta mudanças em tabelas core e atualiza cache React Query automaticamente.
 * Permite que múltiplos advogados do mesmo escritório vejam alterações em tempo real.
 */

import { useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('RealtimeSync');

type TableName = 'leads' | 'contratos' | 'agendamentos' | 'agent_executions' | 'whatsapp_messages';

interface RealtimeConfig {
  tables?: TableName[];
  enabled?: boolean;
}

const DEFAULT_TABLES: TableName[] = ['leads', 'contratos', 'agendamentos', 'agent_executions'];

// Map table names to their React Query cache keys
const TABLE_QUERY_KEY_MAP: Record<TableName, string[]> = {
  leads: ['leads', 'dashboard-metrics-fast'],
  contratos: ['contratos', 'dashboard-metrics-fast'],
  agendamentos: ['agendamentos', 'calendar-events', 'dashboard-metrics-fast'],
  agent_executions: ['agent-executions', 'dashboard-metrics-fast'],
  whatsapp_messages: ['whatsapp-messages'],
};

export function useRealtimeSync(config: RealtimeConfig = {}) {
  const { tables: tablesProp, enabled = true } = config;
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stabilize tables reference to prevent infinite re-renders from inline arrays
  const tablesKey = tablesProp ? tablesProp.join(',') : '';
  const tables = useMemo(
    () => tablesProp || DEFAULT_TABLES,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tablesKey]
  );

  useEffect(() => {
    if (!enabled || !tenantId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `realtime-${tenantId}-${tables.join('-')}`;
    let channel = supabase.channel(channelName);

    // Subscribe to each table
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const queryKeys = TABLE_QUERY_KEY_MAP[table] || [table];

          // Invalidate all related query keys
          for (const key of queryKeys) {
            void queryClient.invalidateQueries({ queryKey: [key] });
          }

          // For INSERT/UPDATE, optimistically update cache if possible
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as Record<string, unknown> | undefined;
            if (!record) return;

            // Only do optimistic update if record has an id field
            const recordId = record.id;
            queryClient.setQueriesData(
              { queryKey: [table] },
              (oldData: unknown) => {
                if (!Array.isArray(oldData)) return oldData;

                if (payload.eventType === 'INSERT') {
                  return [record, ...oldData];
                }

                // UPDATE: replace record in-place (only if we have a reliable id)
                if (!recordId) return oldData;
                return oldData.map((item: Record<string, unknown>) =>
                  item.id === recordId ? { ...item, ...record } : item
                );
              }
            );
          }

          // For DELETE, remove from cache
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              queryClient.setQueriesData(
                { queryKey: [table] },
                (oldData: unknown) => {
                  if (!Array.isArray(oldData)) return oldData;
                  return oldData.filter((item: Record<string, unknown>) => item.id !== deletedId);
                }
              );
            }
          }
        }
      );
    }

    channel.subscribe((status) => {
      if ((status as string) === 'SUBSCRIBED') {
        log.debug(`Subscribed to ${tables.join(', ')} for tenant ${tenantId}`);
      }
      if ((status as string) === 'CHANNEL_ERROR') {
        log.error(`Channel error for ${channelName}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, tenantId, tables, queryClient]);
}

/**
 * useRealtimePresence — Track who's online in the same tenant
 */
export function useRealtimePresence() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !tenantId) return;

    const channel = supabase.channel(`presence-${tenantId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        log.debug(`Online users: ${Object.keys(state).length}`);
      })
      .subscribe((status) => {
        if ((status as string) === 'SUBSCRIBED') {
          void channel.track({
            user_id: user.id,
            user_name: profile?.nome_completo || 'Unknown',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, tenantId, profile?.nome_completo]);
}
