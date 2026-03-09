import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PushNotifications');

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const savePushToken = useCallback(async (token: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
    if (error) logger.error('Failed to save push token', { error });
  }, [user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    void (async () => {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;
      await PushNotifications.register();
    })();

    const tokenListener = PushNotifications.addListener('registration', (token) => {
      void savePushToken(token.value);
    });

    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data as { route?: string };
      if (data?.route) navigate(data.route);
    });

    return () => {
      void tokenListener.then(l => l.remove());
      void actionListener.then(l => l.remove());
    };
  }, [user, savePushToken, navigate]);
}
