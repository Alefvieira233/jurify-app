# Jurify - Legal SaaS Platform

## Quick Start
- `npm run dev` - Start dev server on port 8080
- `npm run build` - Production build
- `npm run test` - Run tests
- `npm run lint` - Lint check

## Architecture
- React 18 + TypeScript (strict mode) + Vite
- Supabase (Auth, Database, Edge Functions, Realtime)
- TanStack React Query for server state
- shadcn/ui + Radix UI + Tailwind CSS
- Sentry for error monitoring

## Key Patterns
- Feature-based structure in src/features/
- RBAC via useRBAC() hook and ProtectedRoute
- Zod schemas for all form validation
- ErrorBoundary + errorService for error handling
- Lazy loading for all feature routes

## Testing
- Vitest + React Testing Library
- Integration tests in src/tests/integration/
- E2E tests with Playwright in e2e/

## Database
- Supabase PostgreSQL with RLS
- Migrations in supabase/migrations/
- Edge Functions in supabase/functions/
