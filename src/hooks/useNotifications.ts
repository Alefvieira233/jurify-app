import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const tenantId = profile?.tenant_id ?? null;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !tenantId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('ativo', true)
        .eq('tenant_id', tenantId)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      const unread = (data || []).filter((n) => !n.lido_por?.includes(user.id)).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as notificacoes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, tenantId, toast]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('marcar_notificacao_lida', {
        notificacao_id: notificationId,
        user_id: user.id,
      });

      if (error) throw error;

      if (data) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, lido_por: [...(n.lido_por || []), user.id] }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('marcar_todas_lidas', { user_id: user.id });

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          lido_por: [...(n.lido_por || []), user.id],
        }))
      );
      setUnreadCount(0);

      toast({
        title: 'Sucesso',
        description: `${data} notificacao(oes) marcada(s) como lida(s).`,
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel marcar todas como lidas.',
        variant: 'destructive',
      });
    }
  };

  const createNotification = async (
    titulo: string,
    mensagem: string,
    tipo: NotificationType = 'info'
  ) => {
    if (!user?.id || !tenantId) return;

    try {
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

      toast({
        title: 'Notificacao criada',
        description: 'A notificacao foi criada com sucesso.',
      });

      await fetchNotifications();
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a notificacao.',
        variant: 'destructive',
      });
    }
  };

  const isRead = (notification: Notification): boolean => {
    return user?.id ? notification.lido_por?.includes(user.id) || false : false;
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id, tenantId]);

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
