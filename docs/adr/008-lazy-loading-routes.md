# ADR-008: Lazy loading with retry for all routes

**Status:** Accepted
**Date:** 2026-01

## Context

The application has 47+ routes across features. Loading all route components upfront would result in a massive initial bundle (3+ MB JS), causing slow first-load times especially on mobile connections used by lawyers in court.

## Decision

Implement **lazy loading for all feature routes** with a custom `lazyWithRetry()` utility that handles chunk loading failures gracefully.

### lazyWithRetry pattern:
```typescript
function lazyWithRetry(importFn, retries = 3) {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try { return await importFn(); }
      catch (error) {
        if (i === retries - 1) {
          window.location.reload(); // Last resort: full reload
          throw error;
        }
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
      }
    }
  });
}
```

### Additional optimizations:
- `requestIdleCallback` prefetches critical routes (Dashboard, Leads, Pipeline) during idle time
- Manual Vite chunks isolate large libraries: `sentry` (445KB), `charts` (457KB), `calendar` (268KB), `flow` (164KB)
- Chunk size warning at 800KB to catch unintended growth

## Consequences

**Positive:**
- Initial JS bundle under 300KB (just vendor + router + core UI)
- Feature code loaded on-demand when user navigates
- Chunk failures handled gracefully (retry + reload fallback)
- Critical routes prefetched during idle time for instant navigation
- Large libraries (FullCalendar, XyFlow) only loaded by users who need them

**Negative:**
- First navigation to a feature has ~100-200ms loading delay
- Chunk naming changes on every build (cache invalidation)
- 47 lazy imports in App.tsx is verbose (acceptable trade-off)
