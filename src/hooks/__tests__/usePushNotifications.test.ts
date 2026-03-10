import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: () => ({
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

describe('usePushNotifications', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('não registra push em plataforma web', async () => {
    // @capacitor/core já mockado no setup.ts com isNativePlatform = false
    const { PushNotifications } = await import('@capacitor/push-notifications');
    renderHook(() => usePushNotifications());
    expect(PushNotifications.register).not.toHaveBeenCalled();
  });

  it('bloqueia rota não autorizada ao tocar notificação', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { PushNotifications } = await import('@capacitor/push-notifications');
    vi.mocked(PushNotifications.addListener).mockImplementation(
      async (event: string, cb: unknown) => {
        if (event === 'pushNotificationActionPerformed') {
          (cb as (a: unknown) => void)({
            notification: { data: { route: '/admin/evil-page' } },
          });
        }
        return { remove: vi.fn() };
      }
    );
    renderHook(() => usePushNotifications());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navega para rota autorizada ao tocar notificação', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { PushNotifications } = await import('@capacitor/push-notifications');
    vi.mocked(PushNotifications.addListener).mockImplementation(
      async (event: string, cb: unknown) => {
        if (event === 'pushNotificationActionPerformed') {
          (cb as (a: unknown) => void)({
            notification: { data: { route: '/pipeline' } },
          });
        }
        return { remove: vi.fn() };
      }
    );
    renderHook(() => usePushNotifications());
    expect(mockNavigate).toHaveBeenCalledWith('/pipeline');
  });

  it('ignora data.route que não é string', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { PushNotifications } = await import('@capacitor/push-notifications');
    vi.mocked(PushNotifications.addListener).mockImplementation(
      async (event: string, cb: unknown) => {
        if (event === 'pushNotificationActionPerformed') {
          (cb as (a: unknown) => void)({
            notification: { data: { route: 42 } },
          });
        }
        return { remove: vi.fn() };
      }
    );
    renderHook(() => usePushNotifications());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
