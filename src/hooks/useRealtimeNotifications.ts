/**
 * useRealtimeNotifications — Supabase Realtime for instant notification updates
 *
 * Subscribes to postgres_changes on `notificacoes` table and:
 * 1. Maintains a reactive `unreadCount` without polling
 * 2. Shows a sonner toast when a new notification arrives (created by someone else)
 * 3. Exposes the latest notification for the Bell badge
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('RealtimeNotifications');

const NOTIFICATION_ICONS: Record<string, string> = {
  info: 'ℹ️',
  alerta: '⚠️',
  sucesso: '✅',
  erro: '❌',
};

export function useRealtimeNotifications() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;
  const userId = user?.id;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('contar_nao_lidas', { user_id: userId });
      if (!error && data !== null) setUnreadCount(data as unknown as number);
    } catch (err) {
      log.warn('fetchUnreadCount failed', { error: String(err) });
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Realtime subscription
  useEffect(() => {
    if (!tenantId || !userId) return;

    // Clean up previous channel
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications-${tenantId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown> | undefined;
          if (!record) return;

          // Don't count notifications created by the current user
          const createdBy = record.created_by as string | null;
          const isOwnNotification = createdBy === userId;

          // Increment unread count (new notification is unread for everyone except creator)
          if (!isOwnNotification) {
            setUnreadCount((prev) => prev + 1);

            // Show sonner toast for the new notification
            const tipo = (record.tipo as string) || 'info';
            const titulo = (record.titulo as string) || 'Nova notificação';
            const mensagem = (record.mensagem as string) || '';
            const icon = NOTIFICATION_ICONS[tipo] || 'ℹ️';

            toast({
              title: `${icon} ${titulo}`,
              description: mensagem.length > 120 ? `${mensagem.slice(0, 120)}…` : mensagem,
            });
          }

          log.debug('New notification received', { id: record.id, tipo: record.tipo });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacoes',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown> | undefined;
          if (!record) return;

          // If the notification was just marked as read by this user, decrement count
          const lidoPor = record.lido_por as string[] | null;
          const oldLidoPor = (payload.old as Record<string, unknown>)?.lido_por as string[] | null;

          const wasUnread = !oldLidoPor?.includes(userId);
          const isNowRead = lidoPor?.includes(userId) ?? false;

          if (wasUnread && isNowRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      );

    try {
      channel.subscribe((status) => {
        if ((status as string) === 'SUBSCRIBED') {
          log.debug(`Subscribed to notifications for tenant ${tenantId}`);
        }
        if ((status as string) === 'CHANNEL_ERROR') {
          log.error('Notification channel error');
          void fetchUnreadCount();
        }
      });
    } catch (err) {
      log.error('Failed to subscribe to notifications channel', err);
    }

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, userId, fetchUnreadCount, toast]);

  const decrementUnread = useCallback((count = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    unreadCount,
    decrementUnread,
    resetUnread,
    refetchCount: fetchUnreadCount,
  };
}
