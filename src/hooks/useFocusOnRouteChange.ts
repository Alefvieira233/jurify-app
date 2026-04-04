import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves focus to the main content area on route change.
 * Ensures screen readers announce the new page content (WCAG 2.4.3).
 */
export function useFocusOnRouteChange() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
}
