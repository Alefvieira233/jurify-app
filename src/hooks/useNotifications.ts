/**
 * @module useNotifications
 * @description Hook para gerenciamento de notificacoes do sistema.
 * Carrega, cria, marca como lida e conta notificacoes nao lidas
 * por tenant, com suporte a tipos (info, alerta, sucesso, erro).
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead, createNotification } = useNotifications();
 * ```
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('Notifications');

type NotificationType = 'info' | 'alerta' | 'sucesso' | 'erro';

type Notification = {
  id: string;
  titulo: string | null;
  mensagem: string | null;
  tipo: NotificationType | null;
  lido_por: string[] | null;
  data_criacao: string | null;
  created_by: string | null;
  tenant_id: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string | null;
};

export const useNotifications = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ['notifications', tenantId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('ativo', true)
        .eq('tenant_id', tenantId!)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.id && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const unreadCount = user?.id
    ? notifications.filter((n) => !n.lido_por?.includes(user.id)).length
    : 0;

  const fetchNotifications = useCallback(async () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId, user?.id] });
  }, [queryClient, tenantId, user?.id]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('marcar_notificacao_lida', {
        notificacao_id: notificationId,
        user_id: user.id,
      });

      if (error) throw error;

      if (data) {
        // Optimistic update in cache
        queryClient.setQueryData<Notification[]>(
          ['notifications', tenantId, user.id],
          (prev) => (prev || []).map((n) =>
            n.id === notificationId
              ? { ...n, lido_por: [...(n.lido_por || []), user.id] }
              : n
          )
        );
      }
    } catch (error) {
      log.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('marcar_todas_lidas', { user_id: user.id });

      if (error) throw error;

      // Optimistic update in cache
      queryClient.setQueryData<Notification[]>(
        ['notifications', tenantId, user.id],
        (prev) => (prev || []).map((n) => ({
          ...n,
          lido_por: [...(n.lido_por || []), user.id],
        }))
      );

      toast({
        title: 'Sucesso',
        description: `${data} notificacao(oes) marcada(s) como lida(s).`,
      });
    } catch (error) {
      log.error('Failed to mark all as read', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel marcar todas como lidas.',
        variant: 'destructive',
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({ titulo, mensagem, tipo }: { titulo: string; mensagem: string; tipo: NotificationType }) => {
      if (!user?.id || !tenantId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notificacoes')
        .insert({
          titulo,
          mensagem,
          tipo,
          created_by: user.id,
          tenant_id: tenantId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId, user?.id] });
      toast({ title: 'Notificacao criada', description: 'A notificacao foi criada com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to create notification', error);
      toast({ title: 'Erro', description: 'Nao foi possivel criar a notificacao.', variant: 'destructive' });
    },
  });

  const createNotification = async (
    titulo: string,
    mensagem: string,
    tipo: NotificationType = 'info'
  ) => {
    if (!user?.id || !tenantId) return;
    await createMutation.mutateAsync({ titulo, mensagem, tipo });
  };

  const isRead = (notification: Notification): boolean => {
    return user?.id ? notification.lido_por?.includes(user.id) || false : false;
  };

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    isRead,
  };
};
