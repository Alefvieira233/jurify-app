import { useEffect } from 'react';

const APP_NAME = 'Jurify';

/**
 * Sets the browser tab title for a page.
 * Format: "Page Name — Jurify"
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
