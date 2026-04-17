import { lazy, ComponentType } from 'react';

/**
 * Wrapper around React.lazy that retries chunk loading up to 3 times
 * before giving up. Handles deploy-time chunk invalidation and flaky networks.
 *
 * On failure after all retries, forces a full page reload (once) to pick up
 * the new deployment's asset manifest.
 *
 * The generic constraint mirrors React.lazy (`ComponentType<any>`) so that
 * components with typed props remain assignable to the returned LazyExoticComponent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1500,
): React.LazyExoticComponent<T> {
  return lazy(() => retryImport(factory, retries, interval));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function retryImport<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries: number,
  interval: number,
): Promise<{ default: T }> {
  try {
    return await factory();
  } catch (error) {
    if (retries <= 0) {
      // Only force reload if tab is visible (browser throttles fetches
      // on hidden tabs, causing false chunk-load failures)
      const reloadKey = 'jurify_chunk_reload';
      if (!document.hidden && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
    return retryImport(factory, retries - 1, interval);
  }
}
