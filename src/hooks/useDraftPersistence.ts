import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Persists form draft state in sessionStorage so user input survives
 * component unmounts, tab switches, and browser minimizations.
 *
 * Usage:
 *   const [formData, setFormData, clearDraft] = useDraftPersistence('novo-agente', initialState);
 *
 * - `setFormData` updates both React state and sessionStorage
 * - `clearDraft()` removes the draft (call on successful save or explicit cancel)
 * - On mount, restores the draft if one exists
 */
export function useDraftPersistence<T>(
  key: string,
  initialValue: T,
): [T, (update: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `jurify_draft_${key}`;
  const initialized = useRef(false);

  const [state, setState] = useState<T>(() => {
    // Restore from sessionStorage on first mount
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        initialized.current = true;
        return parsed;
      }
    } catch {
      // Corrupt data — ignore
    }
    return initialValue;
  });

  // Persist to sessionStorage on every state change (after init)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — silent
    }
  }, [state, storageKey]);

  const setDraft = useCallback(
    (update: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // silent
        }
        return next;
      });
    },
    [storageKey],
  );

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // silent
    }
  }, [storageKey]);

  return [state, setDraft, clearDraft];
}
