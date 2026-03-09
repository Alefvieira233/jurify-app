import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

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
    } catch {
      return false;
    }
  }, []);

  return { isAvailable, authenticate };
}
