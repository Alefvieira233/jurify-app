import { lazy, ComponentType } from 'react';

/**
 * Wrapper around React.lazy that retries chunk loading up to 3 times
 * before giving up. Handles deploy-time chunk invalidation and flaky networks.
 *
 * On failure after all retries, forces a full page reload (once) to pick up
 * the new deployment's asset manifest.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1500,
): React.LazyExoticComponent<T> {
  return lazy(() => retryImport(factory, retries, interval));
}

async function retryImport<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries: number,
  interval: number,
): Promise<{ default: T }> {
  try {
    return await factory();
  } catch (error) {
    if (retries <= 0) {
      // If we haven't reloaded yet for this session, do a hard reload
      // to pick up the new chunk manifest after a deploy
      const reloadKey = 'jurify_chunk_reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
    return retryImport(factory, retries - 1, interval);
  }
}
