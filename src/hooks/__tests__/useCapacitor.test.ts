import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

import { useCapacitor } from '../useCapacitor';

describe('useCapacitor', () => {
  it('returns web platform info in test environment', () => {
    const { result } = renderHook(() => useCapacitor());
    expect(result.current.isNative).toBe(false);
    expect(result.current.platform).toBe('web');
    expect(result.current.isIos).toBe(false);
    expect(result.current.isAndroid).toBe(false);
  });
});
