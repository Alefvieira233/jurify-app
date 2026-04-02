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
    } catch (err) {
      console.warn('[useDraftPersistence] restoring draft failed:', err);
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
    } catch (err) {
      console.warn('[useDraftPersistence] persisting draft failed:', err);
    }
  }, [state, storageKey]);

  const setDraft = useCallback(
    (update: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          console.warn('[useDraftPersistence] setDraft persist failed:', err);
        }
        return next;
      });
    },
    [storageKey],
  );

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('[useDraftPersistence] clearDraft failed:', err);
    }
  }, [storageKey]);

  return [state, setDraft, clearDraft];
}
