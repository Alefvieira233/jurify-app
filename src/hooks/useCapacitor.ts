import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface CapacitorInfo {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isIos: boolean;
  isAndroid: boolean;
}

export function useCapacitor(): CapacitorInfo {
  const [info] = useState<CapacitorInfo>(() => {
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    return {
      isNative: Capacitor.isNativePlatform(),
      platform,
      isIos: platform === 'ios',
      isAndroid: platform === 'android',
    };
  });

  return info;
}

export async function triggerHaptic(
  style: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection' = 'medium'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (style === 'selection') {
      await Haptics.selectionChanged();
    } else {
      const impactMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: impactMap[style] });
    }
  } catch {
    // Haptics não disponível, ignorar
  }
}
