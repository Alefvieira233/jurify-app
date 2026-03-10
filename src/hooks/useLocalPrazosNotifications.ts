import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';

export function useLocalPrazosNotifications() {
  const { user } = useAuth();
  const { prazos } = usePrazosProcessuais();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !prazos?.length) return;

    void (async () => {
      try {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        const pending = await LocalNotifications.getPending();
        const prazoIds = pending.notifications
          .filter(n => n.id >= 9000 && n.id < 9999)
          .map(n => ({ id: n.id }));
        if (prazoIds.length > 0) {
          await LocalNotifications.cancel({ notifications: prazoIds });
        }

        const hoje = Date.now();
        const urgentes = prazos
          .filter(p => {
            if (p.status !== 'pendente') return false;
            const dias = Math.ceil((new Date(p.data_prazo).getTime() - hoje) / 86400000);
            return dias >= 0 && dias <= 7;
          })
          .slice(0, 10);

        if (urgentes.length === 0) return;

        const notifications = urgentes.map((prazo, idx) => {
          const dias = Math.ceil((new Date(prazo.data_prazo).getTime() - hoje) / 86400000);
          const emoji = dias === 0 ? '🚨' : dias <= 2 ? '⚠️' : '📅';
          const quando = dias === 0 ? 'HOJE' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
          return {
            id: 9000 + idx,
            title: `${emoji} Prazo vence ${quando}`,
            body: prazo.descricao ?? prazo.tipo ?? 'Prazo processual urgente',
            schedule: {
              at: new Date(Date.now() + 12 * 60 * 60 * 1000),
              allowWhileIdle: true,
            },
            extra: { route: '/prazos' },
            smallIcon: 'ic_stat_icon_config_sample',
          };
        });

        await LocalNotifications.schedule({ notifications });
      } catch {
        // LocalNotifications não disponível
      }
    })();
  }, [user, prazos]);
}
