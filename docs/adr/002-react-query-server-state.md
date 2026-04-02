# ADR-002: React Query for server state management

**Status:** Accepted
**Date:** 2026-01

## Context

The application had inconsistent data fetching patterns: some hooks used a custom `useSupabaseQuery` wrapper, others used raw `useState` + `useEffect`, and some used React Query. This caused:

- Inconsistent caching behavior across features
- No deduplication of identical requests
- Manual refetch logic scattered everywhere
- Stale data shown after mutations

## Decision

Standardize on **TanStack React Query v5** for all server state management.

Configuration (in `App.tsx`):
- `staleTime: 5 * 60 * 1000` (5 minutes) — avoid refetching recently fetched data
- `gcTime: 30 * 60 * 1000` (30 minutes) — keep unused data in cache
- `refetchOnWindowFocus: false` — prevent unexpected refetches
- `retry: 1` — single retry on failure

Patterns:
- Each domain has a dedicated hook (e.g., `useLeads`, `useContratos`, `useAgendamentos`)
- Mutations use `onSuccess` for cache invalidation and `onError` for user-friendly toasts
- Optimistic updates for instant UI feedback on mutations

## Consequences

**Positive:**
- Automatic request deduplication (same query key = single request)
- Built-in cache management with configurable staleness
- Optimistic updates provide instant feedback
- DevTools for debugging cache state
- Consistent patterns across all features

**Negative:**
- Learning curve for query keys and invalidation patterns
- Query key management can become complex (future: consider query key factory)
- Deprecated `useSupabaseQuery` wrapper removed in 2026-04
