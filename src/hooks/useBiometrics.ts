/** Provides biometric authentication (fingerprint/face) via Capacitor on native platforms. */

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { createLogger } from '@/lib/logger';

const log = createLogger('useBiometrics');

export interface BiometricsResult {
  isAvailable: boolean;
  authenticate: () => Promise<boolean>;
}

export function useBiometrics(): BiometricsResult {
  const [isAvailable] = useState(() => Capacitor.isNativePlatform());

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: 'Confirme sua identidade para acessar o Jurify',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Usar senha',
      });
      return true;
    } catch (err) {
      log.warn('authenticate failed', { error: String(err) });
      return false;
    }
  }, []);

  return { isAvailable, authenticate };
}
