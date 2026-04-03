# System Architecture — Jurify Legal SaaS

**Version:** 1.0.0
**Date:** 2026-04-03
**Author:** @architect (Aria) — Brownfield Discovery Phase 1
**Status:** Complete

---

## Executive Summary

Jurify is a multi-tenant Legal SaaS platform built as a React 18 SPA with a Supabase backend (PostgreSQL + Edge Functions + Realtime + Auth). The application serves Brazilian law firms with CRM, case management, scheduling, document management, AI-powered legal assistants, and WhatsApp integration.

**Key metrics:**
- **30 feature modules** in `src/features/`
- **32 Edge Functions** in `supabase/functions/`
- **47 lazy-loaded routes** via `lazyWithRetry()`
- **106 database migrations** in `supabase/migrations/`
- **1220 tests passing** across 91 test files (95 test files total)
- **5796-line auto-generated Supabase type file**
- **0 TypeScript errors, 0 lint errors**
- **Build time: ~21s**

The architecture is mature (audit score 99/100) with strong security posture (RLS, CORS whitelist, CSP, prompt injection protection), comprehensive RBAC, and a well-structured CI/CD pipeline deploying to Vercel (frontend) and Supabase (backend).

---

## Stack Tecnologico

### Frontend Core

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.3.1 | UI framework |
| TypeScript | ^5.5.3 | Type safety (strict mode) |
| Vite | ^7.3.1 | Build tool + dev server |
| React Router | ^6.26.2 | Client-side routing (v6 with v7 compat flags) |
| TanStack React Query | ^5.56.2 | Server state management |

### UI Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | ^3.4.11 | Utility-first CSS |
| Radix UI | ^1.x-2.x | Headless accessible primitives (18 packages) |
| shadcn/ui | (vendored) | Pre-built component library on Radix |
| Lucide React | ^0.462.0 | Icon system |
| class-variance-authority | ^0.7.1 | Component variant management |
| tailwind-merge | ^2.5.2 | Class deduplication |
| Recharts | ^2.12.7 | Chart/data visualization |
| FullCalendar | ^6.1.20 | Calendar UI (6 packages) |
| @xyflow/react | ^12.10.1 | Flow/node diagram editor |
| @hello-pangea/dnd | ^16.6.0 | Drag and drop (Kanban) |
| Embla Carousel | ^8.3.0 | Carousel component |
| cmdk | ^1.0.0 | Command palette |
| Sonner | ^1.5.0 | Toast notifications |
| Vaul | ^0.9.3 | Drawer component |

### Backend (Supabase)

| Technology | Version | Purpose |
|------------|---------|---------|
| @supabase/supabase-js | ^2.50.0 | Client SDK (typed) |
| Supabase Auth | managed | Authentication + JWT |
| Supabase Database | PostgreSQL | Primary data store with RLS |
| Supabase Edge Functions | Deno runtime | Serverless API endpoints |
| Supabase Realtime | managed | WebSocket subscriptions |
| Supabase Storage | managed | File storage |

### Observability & Security

| Technology | Version | Purpose |
|------------|---------|---------|
| @sentry/react | ^10.32.0 | Error tracking + performance monitoring |
| @sentry/vite-plugin | ^4.6.1 | Source map upload |
| crypto-js | ^4.2.0 | Client-side encryption |
| isomorphic-dompurify | ^2.26.0 | HTML sanitization |
| Zod | ^3.25.76 | Schema validation (forms + API) |

### Mobile (Capacitor)

| Technology | Version | Purpose |
|------------|---------|---------|
| @capacitor/core | ^8.2.0 | Cross-platform native runtime |
| @capacitor/ios | ^8.2.0 | iOS shell |
| @capacitor/android | ^8.2.0 | Android shell |
| Capacitor plugins | ^8.x | Camera, filesystem, push notifications, biometrics, etc. (14 plugins) |

### Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| react-hook-form | ^7.53.0 | Form state management |
| @hookform/resolvers | ^3.9.0 | Zod integration |
| Zod | ^3.25.76 | 7 schema files in `src/schemas/` |

### i18n

| Technology | Version | Purpose |
|------------|---------|---------|
| i18next | ^26.0.3 | Internationalization framework |
| react-i18next | ^17.0.2 | React bindings |

Currently single-locale (`pt` only), with framework in place for future multi-language support.

### Dev & Test

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | ^4.0.17 | Unit/integration test runner |
| @testing-library/react | ^16.3.1 | Component testing |
| Playwright | ^1.58.2 | E2E testing (19 spec files) |
| ESLint | ^9.32.0 | Linting (strict, 0 warnings) |
| happy-dom | ^20.1.0 | Test environment DOM |

### Build Configuration

**Target:** ES2020
**TypeScript:** Strict mode with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
**Path alias:** `@/` -> `./src/`
**Production optimizations:**
- Console/debugger statements dropped
- Hidden source maps
- esbuild minification
- Manual chunk splitting (9 named chunks)

---

## Estrutura do Projeto

```
E:\Jurify\
├── .github/workflows/         # CI/CD pipelines (5 workflows)
├── docs/                       # Documentation
│   ├── adr/                   # 8 Architecture Decision Records
│   ├── architecture/          # This document
│   ├── guides/                # User/dev guides
│   ├── prd/                   # Product requirements
│   ├── runbooks/              # Operational runbooks
│   ├── security/              # Security documentation
│   └── stories/               # Development stories
├── e2e/                       # Playwright E2E tests (19 specs)
├── public/                    # Static assets (PWA manifest, SW, icons)
├── scripts/                   # Build/deploy/utility scripts
├── supabase/
│   ├── config.toml            # Function-level JWT config
│   ├── functions/             # 32 Edge Functions
│   │   ├── _shared/           # Shared utilities (14 files)
│   │   └── [function-name]/   # Individual functions
│   └── migrations/            # 106 SQL migrations
├── src/
│   ├── __tests__/             # Root-level tests
│   ├── components/            # 57 shared components
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Auth forms
│   │   ├── billing/           # Subscription UI
│   │   ├── configuracoes/     # Settings panels
│   │   └── forms/             # Shared form components
│   ├── constants/             # Centralized constants (timings, etc.)
│   ├── contexts/              # React contexts (AuthContext)
│   ├── features/              # 30 feature modules (see below)
│   ├── hooks/                 # 73 custom hooks
│   ├── i18n/                  # Internationalization (pt locale)
│   ├── integrations/          # Supabase client + types
│   ├── lib/                   # Shared libraries
│   │   ├── ai/                # AI utilities
│   │   ├── google/            # Google API integration
│   │   ├── legal/             # Legal domain helpers
│   │   ├── multiagents/       # Multi-agent AI system
│   │   ├── security/          # Security sanitizers
│   │   ├── sentry.ts          # Sentry configuration
│   │   ├── errorMessages.ts   # Error message sanitizer
│   │   ├── featureFlags.ts    # Feature flag system
│   │   ├── lazyWithRetry.ts   # Chunk retry loader
│   │   ├── logger.ts          # Structured logger
│   │   └── monitoring.ts      # Monitoring service
│   ├── pages/                 # Page-level components (Auth, NotFound, etc.)
│   ├── schemas/               # 7 Zod validation schemas
│   ├── services/              # Service layer (minimal)
│   ├── tests/                 # Integration tests (5 files)
│   ├── types/                 # TypeScript type definitions (3 files)
│   └── utils/                 # Utility functions (7 files)
├── capacitor.config.ts        # Mobile app configuration
├── package.json               # Dependencies (Node 20.x)
├── tsconfig.json              # TypeScript configuration
├── vercel.json                # Vercel deployment config
└── vite.config.ts             # Vite build configuration
```

### Feature Modules (30)

| Module | Directory | Domain |
|--------|-----------|--------|
| ai-agents | `features/ai-agents/` | AI agent management + knowledge base |
| audit | `features/audit/` | Audit trail viewer |
| automations | `features/automations/` | Workflow flows + business rules |
| billing | `features/billing/` | Subscription/billing UI |
| conexoes | `features/conexoes/` | WhatsApp connections (Kapso) |
| contatos | `features/contatos/` | Contact management (CRM) |
| contracts | `features/contracts/` | Contract management |
| crm | `features/crm/` | CRM dashboard + lead detail |
| dashboard | `features/dashboard/` | Main dashboard |
| departamentos | `features/departamentos/` | Department management |
| documentos | `features/documentos/` | Document management |
| equipe | `features/equipe/` | Team management |
| home | `features/home/` | Landing/home page |
| honorarios | `features/honorarios/` | Legal fee management |
| leads | `features/leads/` | Archived leads view |
| logs | `features/logs/` | System logs viewer |
| mission-control | `features/mission-control/` | Admin mission control |
| notifications | `features/notifications/` | Notification panel |
| pipeline | `features/pipeline/` | Kanban + classic pipeline |
| prazos | `features/prazos/` | Legal deadlines |
| processos | `features/processos/` | Case/process management |
| reports | `features/reports/` | Reports + operational metrics |
| scheduling | `features/scheduling/` | Appointment scheduling |
| settings | `features/settings/` | Settings + integrations config |
| suporte | `features/suporte/` | Support tickets |
| tags | `features/tags/` | Tag management |
| tarefas | `features/tarefas/` | Task management |
| timeline | `features/timeline/` | Timeline view (deprecated, redirects to CRM) |
| users | `features/users/` | User management |
| whatsapp | `features/whatsapp/` | WhatsApp AI chat |

---

## Padroes Arquiteturais

### 1. Authentication & Authorization Flow

```
User -> Auth Page -> Supabase Auth (email/password or Google OAuth)
                          |
                     JWT Token
                          |
                     AuthContext (React context)
                          |
              +-----------+-----------+
              |                       |
         ProtectedRoute          useAuth() hook
         (role gating)          (profile, session)
              |                       |
         useRBAC() hook          hasPermission()
         (resource/action)       (module/action)
              |
         canInDepartment()
         (department-scoped)
```

**Key patterns:**
- Roles are stored in a separate `user_roles` table (not in `profiles`) to prevent privilege escalation
- `ProtectedRoute` uses `useRef` to track prior authentication state, preventing form data loss during token refresh
- 30-minute inactivity logout via `useInactivityLogout` hook
- Client-side password strength validation (min 12 chars, 4/5 complexity score)
- Realtime subscription to profile changes (e.g., subscription tier updated by Stripe webhook)

### 2. RBAC System

**4 roles:** admin, manager, user, viewer
**18 resources** with 6 possible actions each (create, read, update, delete, execute, manage)

Permission matrix defined in `src/types/rbac.ts` with `ROLE_PERMISSIONS` constant. Department-scoped permissions add a second layer via `departamento_membros` table with 7 granular permissions per department membership.

Three visibility scopes: `own` | `department` | `all` (determined by role + department membership).

### 3. Server State Management

TanStack React Query v5 with centralized defaults:
- **Stale time:** 5 minutes
- **GC time:** 30 minutes
- **Retry:** 2 attempts with exponential backoff (max 15s delay)
- **refetchOnWindowFocus:** disabled

73 custom hooks abstract all Supabase queries. Notable pattern: hooks use `supabaseUntyped` for tables not yet in the auto-generated types, and `supabase` (typed) for standard CRUD.

### 4. Error Handling

Three-layer error architecture:
1. **ErrorBoundary** (class component) wraps every route + root app. Sends errors to Sentry with component stack.
2. **toUserMessage()** sanitizer maps raw backend errors to Portuguese user-friendly messages. 10 regex patterns cover common cases; unknown errors return a generic message.
3. **Sentry** captures all unhandled errors (window.error, unhandledrejection), with filtering for chrome extensions, network errors, and noise.

### 5. Lazy Loading

`lazyWithRetry()` wraps `React.lazy()` with 3 retry attempts (1.5s interval). After all retries fail, forces a page reload once (via sessionStorage guard) to pick up new asset manifests after deployments.

Priority routes are prefetched during browser idle via `requestIdleCallback`.

### 6. Feature Flags

Environment-variable-based feature flags via `src/lib/featureFlags.ts`:
- `whatsappAutoResponse` (enabled)
- `googleCalendarSync` (enabled)
- `advancedAnalytics` (enabled)
- `multiAgentSystem` (enabled)
- `zapSignIntegration` (disabled)

### 7. Structured Logging

`createLogger(module)` factory produces module-scoped loggers. Production suppresses debug/info; development shows all levels. Used across components and hooks for consistent log formatting.

### 8. Multi-Agent AI System

A client-side multi-agent orchestration system in `src/lib/multiagents/` with:
- Agent definitions and configurations
- Sanitizer engine for input/output validation
- Type system for agent interactions
- Validation layer

---

## Componentes Criticos

### AuthContext (`src/contexts/AuthContext.tsx`)

Central authentication provider. Manages:
- Supabase session lifecycle with 15s timeout for session check
- Profile fetching from `profiles` + `user_roles` tables
- Realtime profile update subscription
- Selective localStorage cleanup on auth failure (only Supabase keys)
- `signUp` with client-side password strength enforcement

### ProtectedRoute (`src/components/ProtectedRoute.tsx`)

Route guard with two key behaviors:
1. **Initial load:** Shows loading spinner until authentication resolves
2. **Token refresh:** Keeps children mounted (via `wasAuthed` ref) to prevent form data destruction
3. **Role gating:** Optional `requiredRoles` prop restricts access by role

### ErrorBoundary (`src/components/ErrorBoundary.tsx`)

React class component error boundary with:
- Sentry error reporting with component stack context
- i18n-aware error messages
- Development-mode error details panel
- Reset and reload recovery actions

### Supabase Client (`src/integrations/supabase/client.ts`)

Typed Supabase client with `Database` generic. Provides:
- `supabase` — fully typed client for standard CRUD
- `supabaseUntyped` — escape hatch for tables not in generated types
- Custom auth storage key (`jurify-auth`)
- Application name header (`x-application-name: jurify`)

### Layout (`src/components/Layout.tsx`)

Main application shell wrapping all authenticated routes. Provides navigation, sidebar, and common UI chrome.

---

## Integracoes Externas

### WhatsApp (Kapso API)

**Migration:** Evolved from Evolution API to Kapso API (2026-03-25).

| Component | Location |
|-----------|----------|
| Webhook receiver | `supabase/functions/whatsapp-webhook/` |
| Message sender | `supabase/functions/send-whatsapp-message/` |
| Connection manager | `supabase/functions/kapso-manager/` |
| Shared client | `supabase/functions/_shared/kapso-client.ts` |
| Frontend hooks | `src/hooks/useWhatsAppConversations.ts` |
| Frontend UI | `src/features/whatsapp/` |
| Feature module | `src/features/conexoes/` (connection management) |

**Security:** HMAC webhook signature validation, rate limiting, message deduplication (300s TTL).

### Stripe (Payments)

| Component | Location |
|-----------|----------|
| Webhook handler | `supabase/functions/stripe-webhook/` |
| Checkout creation | `supabase/functions/create-checkout-session/` |
| Portal session | `supabase/functions/create-portal-session/` |
| Frontend UI | `src/features/billing/`, `src/components/billing/` |
| E2E test | `e2e/stripe-payment.spec.ts` |

**Status:** Partially configured. `VITE_STRIPE_PRICE_PRO` and `VITE_STRIPE_PRICE_ENTERPRISE` are placeholders.

### ZapSign (Digital Signatures)

| Component | Location |
|-----------|----------|
| Integration function | `supabase/functions/zapsign-integration/` |
| Frontend hook | `src/hooks/useZapSignIntegration.ts` |
| UI component | `src/components/GerarAssinaturaZapSign.tsx` |

**Status:** Feature-flagged (disabled). Pending configuration.

### Google Calendar

| Component | Location |
|-----------|----------|
| Edge function | `supabase/functions/google-calendar/` |
| Drive folder | `supabase/functions/create-drive-folder/` |
| Frontend hooks | `src/hooks/useGoogleCalendar.ts`, `useGoogleCalendarConnection.ts` |
| Config UI | `src/components/GoogleCalendarConfig.tsx`, `GoogleCalendarSync.tsx` |

### OpenAI

| Component | Location |
|-----------|----------|
| AI agent processor | `supabase/functions/ai-agent-processor/` |
| Agent orchestrator | `supabase/functions/agent-orchestrator/` |
| Chat completion | `supabase/functions/chat-completion/` |
| Assistant | `supabase/functions/assistant/` |
| Embeddings | `supabase/functions/generate-embedding/` |
| Vector search | `supabase/functions/vector-search/` |
| Budget enforcement | `supabase/functions/_shared/ai-budget.ts` |
| Prompt security | `supabase/functions/_shared/security.ts` |
| Multi-agent system | `src/lib/multiagents/` |

**Budget system:** Per-tenant daily token limits with 80% threshold notifications. Tracks usage via `ai_usage` table with atomic RPC `increment_ai_usage`.

### Postmark (Email)

| Component | Location |
|-----------|----------|
| Send email function | `supabase/functions/send-email/` |

**Status:** Pending configuration.

---

## Edge Functions (Supabase)

### By Domain (32 functions)

**AI & Intelligence (7)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `ai-agent-processor` | Required | Process AI agent tasks |
| `agent-orchestrator` | Required | Multi-agent orchestration |
| `assistant` | Required | AI assistant conversations |
| `chat-completion` | Required | OpenAI chat completion wrapper |
| `generate-embedding` | Required | Generate text embeddings |
| `vector-search` | Required | Semantic search over documents |
| `cleanup-agent-memory` | Required | Prune old agent memory records |

**Communication (4)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `send-whatsapp-message` | Required | Send WhatsApp via Kapso |
| `whatsapp-webhook` | **Public** | Receive WhatsApp messages |
| `kapso-manager` | Required | Manage Kapso connections |
| `send-email` | Required | Send transactional email |

**Documents (4)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `generate-document` | Required | Generate legal documents |
| `extract-document-text` | Required | OCR/text extraction |
| `ingest-document` | Required | Document ingestion pipeline |
| `ingest-document-from-file` | Required | File-based document ingestion |

**Payments & Billing (3)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `stripe-webhook` | **Public** | Stripe webhook receiver |
| `create-checkout-session` | Required | Create Stripe checkout |
| `create-portal-session` | Required | Create Stripe customer portal |

**Security & Encryption (2)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `encrypt-data` | Required | Encrypt sensitive data |
| `decrypt-data` | Required | Decrypt sensitive data |

**Infrastructure (3)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `health-check` | **Public** | Edge function health probe |
| `health` | **Public** | Alternative health endpoint |
| `data-retention-cleanup` | Required | GDPR data retention cleanup |

**User & Admin (2)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `admin-create-user` | Required | Admin user creation |
| `send-push-notification` | Required | Push notification dispatch |

**Integrations (4)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `zapsign-integration` | **Public** | ZapSign webhook + API |
| `google-calendar` | Required | Google Calendar sync |
| `create-drive-folder` | Required | Google Drive folder creation |
| `media-processor` | Required | Media file processing |

**CRM & Operations (3)**

| Function | JWT | Purpose |
|----------|-----|---------|
| `process-followup-queue` | Required | CRM follow-up processing |
| `process-prazos-alerts` | Required | Legal deadline alerts |
| `agentes-ia-api` | Required | AI agents CRUD API |

### Shared Utilities (`supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| `cors.ts` | CORS whitelist with Vercel preview regex |
| `rate-limiter.ts` | Supabase-backed rate limiting with in-memory fallback |
| `security.ts` | Prompt injection detection, PII redaction, audit trail |
| `ai-budget.ts` | Per-tenant AI token budget enforcement |
| `ai-model.ts` | OpenAI model configuration |
| `agent-prompts.ts` | AI agent system prompts |
| `cache.ts` | In-memory cache for Edge Function isolates |
| `embeddings.ts` | Embedding generation utilities |
| `kapso-client.ts` | Kapso API client wrapper |
| `legal-context.ts` | Legal domain context for AI |
| `logger.ts` | Server-side structured logger |
| `media-utils.ts` | Media processing utilities |
| `sentry.ts` | Server-side Sentry integration |
| `supabase-client.ts` | Service-role Supabase client factory |

---

## Build & Deploy

### Build Pipeline (Vite)

**Dev server:** Port 8081, hot module replacement via SWC plugin
**Production build:**
- Target: ES2020
- Minifier: esbuild
- Source maps: hidden (uploaded to Sentry)
- Console/debugger drops in production
- Chunk size warning: 800KB

**Manual Chunks (9):**

| Chunk | Contents | Rationale |
|-------|----------|-----------|
| vendor | react, react-dom | Core framework |
| router | react-router-dom | Routing |
| supabase | @supabase/supabase-js | Backend client |
| query | @tanstack/react-query | State management |
| sentry | @sentry/react | Error tracking (445KB) |
| charts | recharts | Data visualization (457KB) |
| calendar | @fullcalendar/* (6 packages) | Calendar UI (268KB) |
| flow | @xyflow/react | Flow editor (164KB) |
| ui-dialog/ui-select/ui-tabs | Radix primitives | UI components |

**Bundle limit:** 4MB total JS enforced in CI.

### Deployment Architecture

```
GitHub (main branch)
        |
        ├── CI Pipeline (ci.yml)
        │   ├── Lint & Type Check
        │   ├── Unit Tests
        │   ├── Build + Bundle Size Check
        │   ├── Security Scan (TruffleHog + npm audit)
        │   └── E2E Tests (Playwright, PRs + main only)
        │
        └── Production Deploy (deploy-production.yml)
            ├── Pre-Deploy Gate (typecheck + tests + coverage + secrets validation)
            ├── Deploy Frontend → Vercel (--prod)
            ├── Deploy Edge Functions → Supabase (4 public, ~16 JWT-protected)
            ├── Run Database Migrations → Supabase (dry-run then push)
            ├── Smoke Tests (frontend + edge function health)
            └── Notify (GitHub Step Summary)
```

**Additional workflows:**
- `deploy-staging.yml` — Staging environment deployment
- `e2e.yml` — Standalone E2E test workflow
- `pre-commit-check.yml` — Pre-commit validation

### Vercel Configuration

- Framework: Vite
- SPA rewrite: `/(.*) -> /index.html`
- Security headers: 10 headers including CSP, HSTS (2-year), COOP, CORP
- Production URL: `https://jurify.com.br`

### Capacitor (Mobile)

- App ID: `com.jurify.app`
- Web dir: `dist`
- Android scheme: HTTPS
- Splash screen: Blue (#1e3a8a), 2s display
- Push notifications configured
- Biometric authentication plugin included

---

## Seguranca

### Content Security Policy (CSP)

Strict CSP configured in `vercel.json`:
- `script-src`: self + Sentry + Stripe.js (no `unsafe-inline`)
- `style-src`: self + Google Fonts (`unsafe-inline` for Tailwind)
- `connect-src`: self + Supabase + Sentry + Stripe API + ZapSign + Google
- `object-src`: none
- `frame-ancestors`: self
- `base-uri`: self
- `form-action`: self

### CORS (Edge Functions)

Whitelist-based CORS in `supabase/functions/_shared/cors.ts`:
- Explicit allowed origins: localhost ports (5173, 8080, 8081, 8082, 3000), jurify.vercel.app, jurify-app.vercel.app, jurify.com.br
- Dynamic Vercel preview deployments: regex pattern `jurify-[a-z0-9]+-alef-vieiras-projects\.vercel\.app`
- Unknown origins: denied (`Access-Control-Allow-Origin: null`)

### Row-Level Security (RLS)

All database tables have RLS policies enforcing `tenant_id` isolation. Previous `OR tenant_id IS NULL` bypass has been removed from all policies (migration `20260402000001_fix_rls_security.sql`). RLS applied to `profiles`, `user_roles`, `user_permissions`.

### Rate Limiting

Dual-layer rate limiting:
1. **Edge Function level:** `_shared/security.ts` — In-memory per-isolate burst protection (20 req/60s default)
2. **Database-backed:** `_shared/rate-limiter.ts` — Atomic RPC `check_rate_limit` with configurable windows. Falls back to in-memory with 50% reduced limits when DB is unavailable.

### Prompt Injection Protection

`_shared/security.ts` implements:
- 10 regex patterns for common injection vectors
- Unicode NFKD normalization to defeat homoglyph attacks
- Homoglyph map (0->o, 1->l, 3->e, etc.)
- Base64 payload detection and decoding
- Input length capping (2000 chars default)

### PII Redaction

Automatic redaction of:
- CPF (Brazilian tax ID)
- RG (Brazilian identity card)
- Credit card numbers (16-digit patterns)

### Authentication Security

- 12-character minimum password with 4/5 complexity score
- Session timeout: 15s for initial check
- 30-minute inactivity logout
- Separate `user_roles` table prevents role escalation via profile manipulation
- Token refresh does not unmount protected routes

### Secret Management

- TruffleHog secret detection in CI pipeline
- `.env` files blocked from git (CI check)
- Secrets validation script (`validate-secrets.cjs`) runs pre-deploy
- Edge Function secrets set via CI, not committed

---

## Performance

### Bundle Splitting Strategy

9 named manual chunks prevent monolithic bundles. Largest chunks:
- **Sentry:** ~445KB (error tracking SDK)
- **Charts:** ~457KB (Recharts)
- **Calendar:** ~268KB (FullCalendar)
- **Flow:** ~164KB (React Flow)

Total JS bundle limit: 4MB (enforced in CI).

### Lazy Loading

47 routes use `lazyWithRetry()` with:
- 3 retry attempts at 1.5s intervals
- One-time forced page reload on exhausted retries
- `requestIdleCallback` prefetch for 6 most-accessed routes

### React Optimizations

- `React.memo` applied to 7+ list-heavy components (ConversationItem, chart components, AgentesIACard)
- `@tanstack/react-virtual` for message list virtualization
- Inline styles extracted to constants

### Query Optimization

- React Query stale time: 5 minutes (avoids redundant refetches)
- N+1 queries consolidated: 4 -> 2 using `Promise.all`
- Lead re-fetching eliminated: 3 -> 1 fetch
- `refetchOnWindowFocus: false` prevents unnecessary background fetches

### PWA & Offline

- Service worker registered in production (`sw.js`)
- Web manifest for installability
- Offline banner via `useNetworkBanner` hook
- `useNetworkStatus` hook for connectivity detection

---

## Dependencias

### Dependency Count

- **Production:** 47 packages
- **Dev:** 20 packages
- **Capacitor plugins:** 14 packages (largest source of transitive vulnerabilities)

### Notable Dependency Decisions

1. **Vite ^7.3.1** — Latest major version. Built with SWC plugin for fast transforms.
2. **React 18** — Not yet migrated to React 19. v7 compat flags enabled on React Router.
3. **TanStack React Query v5** — Current latest. No migration debt.
4. **Sentry v10** — Latest major. Uses `startInactiveSpan` (v8+ API).
5. **Zod ^3.25.76** — Latest. Used for all form validation schemas.
6. **openai ^6.25.0** — Listed as devDependency (Edge Functions use Deno import).

### Known Vulnerabilities

- **12 transitive vulnerabilities** via `@capacitor/*` packages — no fix available upstream. CI uses `--audit-level=critical` to avoid false positives.

---

## Debitos Tecnicos Identificados

### DEB-SYS-001: Query Key Factory Pattern Missing

| Campo | Valor |
|-------|-------|
| Area | Server State |
| Severidade | MEDIUM |
| Impacto | Query keys are scattered across 73 hooks as inline arrays. Risk of key collision, stale cache after mutations, and difficulty tracing cache invalidation. |
| Esforco estimado | 8 horas |
| Prioridade | 2 |

**Recommendation:** Create centralized `src/lib/queryKeys.ts` factory with typed, hierarchical key builders. Reference: ADR-002 already documents React Query usage.

---

### DEB-SYS-002: Duplicated Normalize/Fetch Patterns in Hooks

| Campo | Valor |
|-------|-------|
| Area | Code Quality |
| Severidade | LOW |
| Impacto | Multiple hooks contain similar data normalization logic (default values, date parsing, status mapping). Leads to subtle inconsistencies and increased maintenance burden. |
| Esforco estimado | 6 horas |
| Prioridade | 3 |

**Recommendation:** Extract a `createSupabaseQueryHook` factory or shared normalizer utilities.

---

### DEB-SYS-003: Direct Supabase Calls in Components

| Campo | Valor |
|-------|-------|
| Area | Architecture |
| Severidade | MEDIUM |
| Impacto | Some components call `supabase.from()` directly instead of going through hooks. Bypasses React Query cache, creates inconsistent data flow, and makes testing harder. |
| Esforco estimado | 12 horas |
| Prioridade | 2 |

**Recommendation:** Audit all `supabase.from()` calls outside `src/hooks/` and `src/contexts/` and migrate to dedicated hooks.

---

### DEB-SYS-004: Sentry Bundle Size (445KB)

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | LOW |
| Impacto | Sentry SDK is the 2nd largest chunk. Adds ~445KB to initial download (gzipped ~120KB). Most users never trigger error reporting. |
| Esforco estimado | 4 horas |
| Prioridade | 4 |

**Recommendation:** Evaluate Sentry lazy loading (`@sentry/react/lazy`) or tree-shaking unused integrations (Replay, Feedback). Consider loading Sentry only after first paint.

---

### DEB-SYS-005: Recharts Bundle Size (457KB)

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | LOW |
| Impacto | Recharts is the largest chunk at ~457KB. Only used in dashboard/reports features. |
| Esforco estimado | 3 horas |
| Prioridade | 4 |

**Recommendation:** Already isolated in a manual chunk. Consider lazy-loading the chunk only when dashboard/reports routes are accessed (currently loaded as part of the chunk but route is lazy).

---

### DEB-SYS-006: `supabaseUntyped` Escape Hatch Usage

| Campo | Valor |
|-------|-------|
| Area | Type Safety |
| Severidade | MEDIUM |
| Impacto | `supabaseUntyped` bypasses the generated Database type for tables like `agent_memories`, `workflow_queue`, `departamento_membros`. Loses compile-time safety for queries on those tables. |
| Esforco estimado | 4 horas |
| Prioridade | 2 |

**Recommendation:** Regenerate Supabase types to include all tables, then eliminate `supabaseUntyped` usage. Currently 5796 lines in types file; should capture all current schema.

---

### DEB-SYS-007: Capacitor Transitive Vulnerabilities

| Campo | Valor |
|-------|-------|
| Area | Security |
| Severidade | LOW |
| Impacto | 12 transitive vulnerabilities from `@capacitor/*` packages. No fix available upstream. Mitigated by `--audit-level=critical` in CI. |
| Esforco estimado | 2 horas (monitoring) |
| Prioridade | 5 |

**Recommendation:** Monitor Capacitor releases for fixes. Consider vendoring if mobile app is not in active development.

---

### DEB-SYS-008: OpenAI API Key Rotation Pending

| Campo | Valor |
|-------|-------|
| Area | Security |
| Severidade | HIGH |
| Impacto | OpenAI API key needs rotation. If compromised, attackers could consume AI budget and access legal data through the assistant. |
| Esforco estimado | 1 hora |
| Prioridade | 1 |

**Recommendation:** Rotate key in OpenAI dashboard, update Supabase Edge Function secrets, verify all AI functions continue working.

---

### DEB-SYS-009: Missing Sentry/Monitoring Configuration in Vercel

| Campo | Valor |
|-------|-------|
| Area | Observability |
| Severidade | MEDIUM |
| Impacto | `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` are not configured in Vercel environment. Production errors may not be captured. Source maps not uploaded to Sentry for production builds. |
| Esforco estimado | 1 hora |
| Prioridade | 2 |

**Recommendation:** Configure Sentry environment variables in Vercel project settings.

---

### DEB-SYS-010: Single Locale (pt) Only

| Campo | Valor |
|-------|-------|
| Area | Internationalization |
| Severidade | LOW |
| Impacto | i18n framework (i18next + react-i18next) is in place but only Portuguese locale exists. Many strings are still hardcoded in Portuguese throughout components (not using translation keys). |
| Esforco estimado | 40+ horas (full migration) |
| Prioridade | 5 |

**Recommendation:** Not urgent for Brazilian market. When international expansion is planned, audit all hardcoded strings and extract to translation files.

---

### DEB-SYS-011: Edge Function Deployment Has Missing Functions

| Campo | Valor |
|-------|-------|
| Area | CI/CD |
| Severidade | MEDIUM |
| Impacto | `deploy-production.yml` deploys a fixed list of functions. Functions like `send-push-notification`, `process-prazos-alerts`, `process-followup-queue`, `extract-document-text`, `ingest-document-from-file`, `media-processor` are present in the repo but not in the deploy list. They may be deployed manually or not at all. |
| Esforco estimado | 2 horas |
| Prioridade | 2 |

**Recommendation:** Generate the function list dynamically from the filesystem, or maintain a manifest file that both CI and developers reference.

---

### DEB-SYS-012: Duplicate Rate Limiting Implementations

| Campo | Valor |
|-------|-------|
| Area | Code Quality |
| Severidade | LOW |
| Impacto | Two separate rate limiter implementations exist: `_shared/rate-limiter.ts` (Supabase-backed, 374 lines) and `_shared/security.ts` (in-memory, 48 lines). Functions may use either or both. |
| Esforco estimado | 4 horas |
| Prioridade | 3 |

**Recommendation:** Consolidate into single rate limiter with configurable backend (memory vs. DB). The `rate-limiter.ts` implementation is more robust; `security.ts` rate limiter should delegate to it.

---

### DEB-SYS-013: Services Directory is Empty

| Campo | Valor |
|-------|-------|
| Area | Architecture |
| Severidade | LOW |
| Impacto | `src/services/` contains only `__tests__/`. The service layer pattern was started but never developed. All data access goes through hooks directly. |
| Esforco estimado | 0 (decision only) |
| Prioridade | 5 |

**Recommendation:** Either remove the empty directory or decide if a service layer abstraction is needed between hooks and Supabase client. Current hook-based approach works well for the project size.

---

## Metricas e Scores

| Metric | Value |
|--------|-------|
| Overall audit score | 99/100 |
| Security score | 97/100 |
| Performance score | 90/100 |
| Database score | 97/100 |
| CI/CD score | 95/100 |
| Code quality score | 95/100 |
| Test count | 1220 passing, 2 skipped |
| Test files | 91/95 active |
| TypeScript errors | 0 |
| Lint warnings | 0 |
| E2E specs | 19 |
| Integration tests | 5 |
| Feature modules | 30 |
| Edge Functions | 32 |
| Custom hooks | 73 |
| Shared components | 57 |
| Database migrations | 106 |
| Supabase types | 5796 lines |
| ADRs documented | 8 |
| Zod schemas | 7 |

---

## Perguntas para Especialistas

### Para @data-engineer

1. **RLS Policy Audit:** With 106 migrations, can you verify that all tables have RLS enabled and that no policy still contains the `OR tenant_id IS NULL` bypass pattern? The v1.2 audit fixed known instances, but a full schema scan would confirm completeness.

2. **Index Coverage:** The audit added 5 composite indexes. Given 30 feature modules with various query patterns, are there missing indexes — particularly on `leads`, `agendamentos`, and `prazos` tables which are queried most frequently?

3. **Data Retention:** The `data-retention-cleanup` Edge Function exists but its implementation details and scheduling are unclear. Is it configured as a cron job? What is the retention policy per table?

4. **Migration Hygiene:** 106 migrations is a high count. The `SQUASH_REFERENCE.md` suggests a squash was considered. What is the recommended migration management strategy going forward?

5. **`supabaseUntyped` Tables:** Which tables are NOT captured in the auto-generated types? Can we regenerate to include `agent_memories`, `workflow_queue`, `departamento_membros`, and any others?

6. **Rate Limit Table:** The `check_rate_limit` RPC exists. Is the `rate_limits` table indexed appropriately for the lookup pattern (`namespace + identifier + window`)?

7. **AI Usage Tracking:** The `ai_usage` table uses `usage_date` + `tenant_id` for daily budget checks. Is there a cleanup/archival strategy for historical usage data?

### Para @ux-design-expert

1. **30 Feature Modules:** The application has 30 feature modules accessed via sidebar navigation. Is the information architecture appropriate, or should modules be consolidated/grouped to reduce cognitive load?

2. **Route Redirects:** There are 6 redirect routes (`/leads -> /pipeline`, `/timeline -> /crm`, `/planos -> /billing`, etc.) suggesting recent restructuring. Are users finding the new structure intuitive?

3. **Mobile Experience:** Capacitor is configured for iOS/Android with 14 plugins, but the primary development focus appears web-first. What is the current state of mobile UX? Are there responsive design gaps in the 30 feature modules?

4. **Error States:** `ErrorBoundary` provides a generic fallback. The `ErrorState` and `EmptyState` components exist. How consistently are these applied across features? Are there features that show raw errors or blank screens on failure?

5. **Loading States:** `LoadingSpinner` and `LoadingState` components exist. With 47 lazy-loaded routes, is the loading experience consistent? Are there perceived performance issues from chunk loading?

6. **Admin Section:** Three admin routes (`playground`, `mission-control`, `status`) exist at `/admin/*`. How do admin users discover these? Is the admin UX separate enough from the main application?

7. **Onboarding:** An `OnboardingFlow` component exists. What is the current onboarding completion rate, and are there steps where users drop off?

---

*Document generated by @architect (Aria) during Brownfield Discovery Phase 1.*
*Next phases: @data-engineer (Phase 2 - Database Assessment), @ux-design-expert (Phase 3 - Frontend Assessment).*
