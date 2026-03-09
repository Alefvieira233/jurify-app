import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    setTimeout(() => setWasOffline(false), 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Network plugin
      void Network.getStatus().then(s => setIsOnline(s.connected));

      const listenerPromise = Network.addListener('networkStatusChange', status => {
        if (status.connected) {
          handleOnline();
        } else {
          handleOffline();
        }
      });

      return () => { void listenerPromise.then(l => l.remove()); };
    } else {
      // Web: use browser events
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
