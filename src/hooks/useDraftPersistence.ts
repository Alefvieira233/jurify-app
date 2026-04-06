import { useState, useCallback, useEffect, useRef } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('useDraftPersistence');

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
      log.warn('restoring draft failed', { error: String(err) });
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
      log.warn('persisting draft failed', { error: String(err) });
    }
  }, [state, storageKey]);

  const setDraft = useCallback(
    (update: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          log.warn('setDraft persist failed', { error: String(err) });
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
      log.warn('clearDraft failed', { error: String(err) });
    }
  }, [storageKey]);

  return [state, setDraft, clearDraft];
}

// ---------------------------------------------------------------------------
// useFormDraftPersistence — localStorage-based, tenant-scoped draft persistence
// ---------------------------------------------------------------------------

interface UseFormDraftPersistenceOptions {
  /** Unique form identifier (e.g. 'novo-lead', 'novo-contrato') */
  formName: string;
  /** Tenant ID for scoping drafts per tenant */
  tenantId?: string | null;
  /** Debounce interval in ms before writing to localStorage (default 1000) */
  debounceMs?: number;
}

/**
 * Persists form draft data in localStorage, scoped per tenant.
 *
 * Unlike `useDraftPersistence` (sessionStorage), this hook:
 * - Uses localStorage so drafts survive browser restarts
 * - Scopes drafts by tenant_id for multi-tenant isolation
 * - Exposes a `hasDraft` flag for showing recovery banners
 * - Provides explicit `saveDraft`, `loadDraft`, `clearDraft` methods
 *
 * Usage:
 *   const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormDraftPersistence({
 *     formName: 'novo-contrato',
 *     tenantId: profile?.tenant_id,
 *   });
 */
export function useFormDraftPersistence<T extends Record<string, unknown>>({
  formName,
  tenantId,
  debounceMs = 1000,
}: UseFormDraftPersistenceOptions) {
  const storageKey = `jurify_draft_${formName}_${tenantId ?? 'unknown'}`;
  const [hasDraft, setHasDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setHasDraft(true);
    } catch {
      // localStorage may be unavailable
    }
  }, [storageKey]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    (values: Partial<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(values));
          setHasDraft(true);
        } catch {
          // localStorage may be full or unavailable
        }
      }, debounceMs);
    },
    [storageKey, debounceMs],
  );

  const loadDraft = useCallback((): Partial<T> | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as Partial<T>;
    } catch {
      // parse error or localStorage unavailable
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch {
      // localStorage may be unavailable
    }
  }, [storageKey]);

  return { hasDraft, saveDraft, loadDraft, clearDraft };
}
