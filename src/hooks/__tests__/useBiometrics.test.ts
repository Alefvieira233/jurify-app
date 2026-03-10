import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBiometrics } from '../useBiometrics';

describe('useBiometrics', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('isAvailable é false em plataforma web', () => {
    // setup.ts mocka isNativePlatform = false por padrão
    const { result } = renderHook(() => useBiometrics());
    expect(result.current.isAvailable).toBe(false);
  });

  it('authenticate retorna false em plataforma web', async () => {
    const { result } = renderHook(() => useBiometrics());
    let success!: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success).toBe(false);
  });

  it('authenticate retorna true em native com sucesso', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    // BiometricAuth.authenticate mockado no setup.ts para resolver com undefined (sucesso)
    const { result } = renderHook(() => useBiometrics());
    let success!: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success).toBe(true);
  });

  it('authenticate retorna false quando usuário cancela (exception)', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    vi.mocked(BiometricAuth.authenticate).mockRejectedValueOnce(new Error('User cancelled'));
    const { result } = renderHook(() => useBiometrics());
    let success!: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success).toBe(false);
  });
});
