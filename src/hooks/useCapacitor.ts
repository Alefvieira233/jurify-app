import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

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
