# Jurify MVP Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring Jurify to a production-ready MVP state where every screen works end-to-end, build passes, tests are green, no console errors, all validations work, and the app is deployable.

**Architecture:** React 18 + TypeScript (strict) + Vite frontend talking to Supabase (PostgreSQL + RLS + Edge Functions). Feature-based structure in `src/features/`, RBAC via `useRBAC()` hook, TanStack React Query for server state, shadcn/ui + Tailwind for UI. 60+ migrations, 23 Edge Functions, 7 AI agents in `src/lib/multiagents/`.

**Tech Stack:** React 18.3.1, TypeScript 5.5.3, Vite 7.3.1, Supabase JS v2.50.0, TanStack React Query 5.56.2, Zod 3.25.76, Vitest, Playwright, Sentry v10.32.0

---

## Definition of Done (DoD)

Every task must meet ALL of these criteria before being marked complete:

| Criterion | Command / Check |
|-----------|----------------|
| Build passes | `npm run build` exits 0, no warnings |
| Lint passes | `npm run lint` exits 0 (--max-warnings 0) |
| TypeScript passes | `npx tsc --noEmit` exits 0 |
| All tests green | `npm run test -- --run` → 0 failures |
| No console errors | Browser console clean on the affected page(s) |
| No broken endpoints | Supabase queries return data (not 401/403/500) |
| Validations work | Zod schemas reject invalid input, show user-friendly errors |
| Responsive | Screens work on mobile (375px) and desktop (1280px) |
| RBAC enforced | Protected routes redirect unauthorized users |

---

## MVP Screen Map

### Public Screens (no auth)
| # | Screen | Route | Status |
|---|--------|-------|--------|
| P1 | Login / Signup | `/auth` | ✅ Complete |
| P2 | Google OAuth Callback | `/auth/google/callback` | ✅ Complete |
| P3 | Pricing | `/precos` | ✅ Complete |
| P4 | Terms of Service | `/termos` | ✅ Complete |
| P5 | Privacy Policy | `/privacidade` | ✅ Complete |
| P6 | 404 Not Found | `*` | ✅ Complete |

### Protected Screens (auth required)
| # | Screen | Route | Status | Notes |
|---|--------|-------|--------|-------|
| S1 | Dashboard | `/` | ✅ Complete | KPIs, pipeline overview, quick actions |
| S2 | Pipeline Kanban | `/pipeline` | ✅ Complete | Drag-drop, filters, search |
| S3 | CRM Dashboard | `/crm` | ✅ Complete | Pipeline stages, follow-ups, tags |
| S4 | Lead Detail | `/crm/lead/:id` | ✅ Complete | Full lead info, timeline |
| S5 | Contracts | `/contratos` | ✅ Complete | CRUD, ZapSign, status tracking |
| S6 | Scheduling | `/agendamentos` | ✅ Complete | Calendar views, Google Calendar |
| S7 | AI Agents | `/agentes` | ✅ Complete | CRUD, personas, metrics, chat |
| S8 | WhatsApp | `/whatsapp` | ⚠️ Partial | Setup wizard incomplete, Evolution API setup partial |
| S9 | Reports | `/relatorios` | ✅ Complete | Charts, CSV export, KPIs |
| S10 | Notifications | `/notificacoes` | ✅ Complete | Filter, read/unread, types |
| S11 | Billing | `/billing` | ⚠️ Stub | Only shows plan name, no Stripe flow |
| S12 | Users (admin) | `/usuarios` | ✅ Complete | CRUD, roles, permissions |
| S13 | Logs (admin) | `/logs` | ✅ Complete | Agent logs, search, stats |
| S14 | Integrations (admin) | `/integracoes` | ✅ Complete | Config panels |
| S15 | Settings (admin) | `/configuracoes` | ✅ Complete | 7 tabs, RBAC-gated |
| S16 | Mission Control (admin) | `/admin/mission-control` | ✅ Complete | Real-time monitoring |
| S17 | Agent Playground (admin) | `/admin/playground` | ✅ Complete | Agent testing |
| S18 | Timeline | (modal/panel) | ✅ Complete | Multi-channel conversation |

---

## Current Health Check (2026-03-04)

```
Build:      ✅ PASS (48s)
Lint:       ✅ PASS (0 warnings)
TypeScript: ✅ PASS (0 errors)
Tests:      ⚠️ 23/24 suites pass, 1 FAIL (TrustEngine.test.ts)
            446 tests pass, 2 skipped
E2E:        ℹ️ Non-blocking in CI (continue-on-error: true)
Security:   ✅ No exposed secrets, RLS on all tables
```

---

## Task List (Priority Order)

### Phase 1: Fix Blocking Bugs (must-fix before any other work)

---

### Task 1: Fix TrustEngine test suite failing due to missing env vars

**Files:**
- Modify: `src/lib/legal/TrustEngine.ts:14` (supabase import at top level)
- Modify: `src/lib/legal/__tests__/TrustEngine.test.ts:2` (missing mock)

**Context:** TrustEngine.ts imports supabase client at module level (line 14). When tests run without VITE_SUPABASE_URL set, the import throws. The fix: mock supabase client in the test file before import.

**Step 1: Read the current test file**

Open `src/lib/legal/__tests__/TrustEngine.test.ts` and `src/lib/legal/TrustEngine.ts` to understand the import chain.

**Step 2: Add supabase client mock to the test**

Add at the top of `TrustEngine.test.ts`, before any imports:
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));
```

**Step 3: Run the test to verify it passes**

Run: `npm run test -- --run src/lib/legal/__tests__/TrustEngine.test.ts`
Expected: PASS (all test cases green)

**Step 4: Run full test suite to verify no regressions**

Run: `npm run test -- --run`
Expected: 24/24 suites pass, 0 failures

**Step 5: Commit**

```bash
git add src/lib/legal/__tests__/TrustEngine.test.ts
git commit -m "fix: mock supabase client in TrustEngine tests to fix env var failure"
```

---

### Task 2: Implement auto-logout on inactivity (security gap)

**Files:**
- Modify: `src/hooks/useInactivityLogout.ts` (verify implementation)
- Modify: `src/contexts/AuthContext.tsx` (integrate hook if not already)
- Modify: `src/contexts/__tests__/AuthContext.test.tsx:842` (unskip test)

**Context:** There's a TODO at `AuthContext.test.tsx:842` saying auto-logout is not implemented. The hook `useInactivityLogout.ts` exists but may not be integrated. This is a security requirement for legal SaaS (LGPD compliance).

**Step 1: Read the existing hook**

Open `src/hooks/useInactivityLogout.ts` to understand current implementation.

**Step 2: Read AuthContext to check if hook is used**

Open `src/contexts/AuthContext.tsx` and search for `useInactivityLogout` usage.

**Step 3: Write failing test first**

In `src/contexts/__tests__/AuthContext.test.tsx`, unskip the test at line 842 and verify it describes auto-logout behavior. If the test already exists but is skipped, just remove the `.skip`.

**Step 4: Integrate the hook if not already connected**

If `useInactivityLogout` is not called in the auth flow, add it to the `Layout.tsx` component (which wraps all protected routes):

```typescript
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
// Inside Layout component:
useInactivityLogout({ timeoutMinutes: 30 });
```

**Step 5: Run the test to verify**

Run: `npm run test -- --run src/contexts/__tests__/AuthContext.test.tsx`
Expected: Previously skipped test now passes

**Step 6: Run full suite + build**

Run: `npm run test -- --run && npm run build`
Expected: All green

**Step 7: Commit**

```bash
git add src/hooks/useInactivityLogout.ts src/contexts/AuthContext.tsx src/components/Layout.tsx src/contexts/__tests__/AuthContext.test.tsx
git commit -m "feat: integrate auto-logout on 30min inactivity (LGPD security requirement)"
```

---

### Phase 2: Fix Broken/Incomplete Features

---

### Task 3: Make Billing page functional with Stripe checkout

**Files:**
- Modify: `src/features/billing/SubscriptionStatus.tsx` (enhance from stub)
- Read: `src/components/billing/` (check existing SubscriptionManager)
- Read: `src/pages/Pricing.tsx` (reference for Stripe integration pattern)

**Context:** The billing page (`/billing`) currently only shows a plan name badge and an upgrade button that links to `/planos`. It needs to show: current plan details, usage stats, next billing date, and a working upgrade/downgrade flow using the existing `create-checkout-session` Edge Function.

**Step 1: Read existing billing components**

Read `src/features/billing/SubscriptionStatus.tsx`, `src/components/billing/SubscriptionManager.test.tsx`, and `src/pages/Pricing.tsx` to understand existing patterns.

**Step 2: Write tests for the enhanced billing page**

Create test file `src/features/billing/__tests__/SubscriptionStatus.test.tsx`:
```typescript
describe('SubscriptionStatus', () => {
  it('renders current plan name and status');
  it('shows upgrade button for free tier');
  it('shows manage button for paid tier');
  it('displays next billing date for active subscriptions');
  it('handles loading state');
  it('handles error state');
});
```

**Step 3: Run tests to verify they fail**

Run: `npm run test -- --run src/features/billing/__tests__/SubscriptionStatus.test.tsx`
Expected: FAIL (tests not passing yet)

**Step 4: Enhance SubscriptionStatus component**

Use the existing `useAuth()` hook to get `profile.subscription_tier` and `profile.subscription_status`. Add:
- Current plan card with tier name and features
- Subscription status badge (active/trialing/past_due/canceled)
- Usage stats from dashboard metrics
- Upgrade button that calls `create-checkout-session` Edge Function
- Manage subscription link (Stripe Customer Portal)

**Step 5: Run tests to verify they pass**

Run: `npm run test -- --run src/features/billing/__tests__/SubscriptionStatus.test.tsx`
Expected: PASS

**Step 6: Verify build and full tests**

Run: `npm run build && npm run test -- --run`
Expected: All green

**Step 7: Commit**

```bash
git add src/features/billing/
git commit -m "feat: enhance billing page with plan details, usage stats, and Stripe checkout"
```

---

### Task 4: Complete WhatsApp Evolution API setup flow

**Files:**
- Modify: `src/features/whatsapp/WhatsAppEvolutionSetup.tsx`
- Modify: `src/features/whatsapp/WhatsAppSetup.tsx`
- Read: `supabase/functions/evolution-manager/index.ts` (backend API)
- Read: `src/lib/integrations/EnterpriseWhatsApp.ts` (client-side integration)

**Context:** The WhatsApp setup wizard has a lazy-loaded QR code flow but the Evolution API integration is partially implemented. The Edge Function `evolution-manager` handles instance creation, QR generation, and status checking. The frontend needs to complete the flow: create instance → show QR → poll status → confirm connected.

**Step 1: Read the Evolution manager Edge Function**

Read `supabase/functions/evolution-manager/index.ts` to understand available endpoints (create instance, get QR, check status, disconnect).

**Step 2: Read current WhatsApp setup components**

Read `src/features/whatsapp/WhatsAppEvolutionSetup.tsx` and `WhatsAppSetup.tsx`.

**Step 3: Write tests for the setup flow**

Create `src/features/whatsapp/__tests__/WhatsAppSetup.test.tsx`:
```typescript
describe('WhatsAppSetup', () => {
  it('renders setup wizard with step indicators');
  it('creates Evolution instance on start');
  it('displays QR code when received');
  it('polls connection status');
  it('shows success when connected');
  it('handles connection errors gracefully');
});
```

**Step 4: Run tests to verify they fail**

Run: `npm run test -- --run src/features/whatsapp/__tests__/WhatsAppSetup.test.tsx`
Expected: FAIL

**Step 5: Implement the complete setup flow**

Complete the `WhatsAppEvolutionSetup.tsx` component with:
- Step 1: "Configure Instance" - instance name input
- Step 2: "Scan QR Code" - display QR from evolution-manager API, poll status every 5s
- Step 3: "Connected" - success state with phone number display
- Error handling with retry button
- Loading states for each step

**Step 6: Run tests to verify they pass**

Run: `npm run test -- --run src/features/whatsapp/__tests__/WhatsAppSetup.test.tsx`
Expected: PASS

**Step 7: Verify build and full tests**

Run: `npm run build && npm run test -- --run`
Expected: All green

**Step 8: Commit**

```bash
git add src/features/whatsapp/
git commit -m "feat: complete WhatsApp Evolution API setup wizard with QR flow"
```

---

### Phase 3: Remove Production Debug Code

---

### Task 5: Gate console.log statements in Edge Functions behind debug flag

**Files:**
- Modify: `supabase/functions/_shared/logger.ts` (create if not exists)
- Modify: `supabase/functions/agentes-ia-api/index.ts` (replace console.log)
- Modify: `supabase/functions/ai-agent-processor/index.ts` (replace console.log)
- Modify: `supabase/functions/evolution-manager/index.ts` (replace console.log)
- Modify: `supabase/functions/create-checkout-session/index.ts` (replace console.log)

**Context:** Multiple Edge Functions have excessive `console.log` with emojis and debug details that shouldn't appear in production. Create a shared logger that respects a `DEBUG` env var.

**Step 1: Create shared logger for Edge Functions**

Create `supabase/functions/_shared/logger.ts`:
```typescript
const DEBUG = Deno.env.get('DEBUG') === 'true';

export const logger = {
  debug: (...args: unknown[]) => { if (DEBUG) console.log(...args); },
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
```

**Step 2: Replace console.log calls in agentes-ia-api**

Open `supabase/functions/agentes-ia-api/index.ts` and replace all `console.log(...)` with `logger.debug(...)` and `console.error(...)` with `logger.error(...)`.

**Step 3: Repeat for ai-agent-processor**

Same pattern for `supabase/functions/ai-agent-processor/index.ts`.

**Step 4: Repeat for evolution-manager**

Same pattern for `supabase/functions/evolution-manager/index.ts`.

**Step 5: Repeat for create-checkout-session**

Same pattern for `supabase/functions/create-checkout-session/index.ts`.

**Step 6: Verify build**

Run: `npm run build`
Expected: PASS (Edge Functions aren't compiled by Vite, but verify no frontend breakage)

**Step 7: Commit**

```bash
git add supabase/functions/
git commit -m "refactor: gate Edge Function debug logs behind DEBUG env var"
```

---

### Task 6: Remove or gate mock/validation scripts from production bundle

**Files:**
- Read: `src/integrations/supabase/mock.ts` (check if tree-shaken)
- Read: `src/tests/validateEnterpriseSystem.js` (check if bundled)
- Modify: `vite.config.ts` (add explicit exclusion if needed)

**Context:** The mock Supabase client and validation script should never appear in production bundles. Verify they are properly excluded.

**Step 1: Check if mock.ts is imported in production code**

Search for imports of `supabase/mock` in non-test files:
```bash
grep -r "supabase/mock" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test."
```

**Step 2: Check if validateEnterpriseSystem.js is in the bundle**

```bash
grep -r "validateEnterpriseSystem" src/ --include="*.ts" --include="*.tsx"
```

**Step 3: If either is imported in production, add conditional import**

Use `import.meta.env.DEV` guard or move to dev-only entry.

**Step 4: Verify with build analysis**

Run: `npm run build`
Check output for mock.ts or validate in chunk names.

**Step 5: Commit if changes needed**

```bash
git add vite.config.ts src/integrations/supabase/mock.ts
git commit -m "fix: ensure mock client and validation script excluded from production bundle"
```

---

### Phase 4: Harden Error Handling

---

### Task 7: Add error handling to multi-agent Supabase queries

**Files:**
- Modify: `src/lib/multiagents/agents/AnalystAgent.ts:132-134`
- Modify: `src/lib/multiagents/core/WorkflowQueue.ts` (lines 90-112, 187-189, 235-238)

**Context:** Several Supabase queries in the multi-agent system don't check for errors after `.from().select()`. This can lead to silent failures where agents process null data.

**Step 1: Read AnalystAgent.ts**

Open `src/lib/multiagents/agents/AnalystAgent.ts` and find all Supabase queries.

**Step 2: Add error checking pattern**

For each query, add:
```typescript
const { data, error } = await supabase.from('leads').select('*').gte('created_at', ...);
if (error) {
  logger.error('AnalystAgent: failed to fetch leads', error);
  throw new AppError('Failed to fetch lead data for analysis', { cause: error });
}
```

**Step 3: Read WorkflowQueue.ts**

Open `src/lib/multiagents/core/WorkflowQueue.ts` and find all unguarded queries.

**Step 4: Add error checking to WorkflowQueue**

Same pattern: destructure `{ data, error }`, check error, throw or log.

**Step 5: Run tests and build**

Run: `npm run test -- --run && npm run build`
Expected: All green

**Step 6: Commit**

```bash
git add src/lib/multiagents/
git commit -m "fix: add error handling to multi-agent Supabase queries (prevent silent failures)"
```

---

### Task 8: Fix health-check Edge Function error responses

**Files:**
- Modify: `supabase/functions/health-check/index.ts:85-192`

**Context:** The health-check Edge Function logs errors but doesn't include them in the response body. Failing health checks should report which subsystem is down.

**Step 1: Read the health-check function**

Open `supabase/functions/health-check/index.ts`.

**Step 2: Add error details to response**

For each subsystem check (Supabase, OpenAI, Evolution, Stripe, ZapSign), capture the error message and include it in the response JSON:
```typescript
const results = {
  supabase: { status: 'ok' | 'error', error?: string },
  openai: { status: 'ok' | 'error', error?: string },
  // ...
};
```

**Step 3: Return appropriate HTTP status**

Return 200 if all checks pass, 503 if any critical check fails.

**Step 4: Commit**

```bash
git add supabase/functions/health-check/
git commit -m "fix: health-check returns error details in response body"
```

---

### Phase 5: Increase Test Coverage

---

### Task 9: Add component tests for Dashboard

**Files:**
- Create: `src/features/dashboard/__tests__/Dashboard.test.tsx`
- Read: `src/features/dashboard/Dashboard.tsx`

**Context:** The Dashboard is the main landing page but has zero component tests. Need to test: KPI rendering, loading states, empty states, quick action buttons.

**Step 1: Read Dashboard component**

Open `src/features/dashboard/Dashboard.tsx` to understand structure, hooks used, and conditional rendering.

**Step 2: Write the test file**

Create `src/features/dashboard/__tests__/Dashboard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useDashboardMetrics', () => ({
  useDashboardMetricsFast: () => ({
    data: { totalLeads: 10, totalContratos: 5, totalAgendamentos: 3, totalAgentes: 2 },
    isLoading: false,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'admin', subscription_tier: 'pro' }, user: { id: '1' } }),
}));

describe('Dashboard', () => {
  it('renders KPI cards with metric values');
  it('shows loading skeleton when data is loading');
  it('shows empty state guidance when no data');
  it('renders quick action buttons');
  it('displays pipeline stage distribution');
});
```

**Step 3: Run tests to verify they fail**

Run: `npm run test -- --run src/features/dashboard/__tests__/Dashboard.test.tsx`
Expected: FAIL (tests not implemented yet)

**Step 4: Implement test cases**

Fill in each test case with proper assertions using `screen.getByText`, `screen.getByRole`, etc.

**Step 5: Run tests to verify they pass**

Run: `npm run test -- --run src/features/dashboard/__tests__/Dashboard.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/dashboard/__tests__/
git commit -m "test: add component tests for Dashboard (KPIs, loading, empty states)"
```

---

### Task 10: Add component tests for ProtectedRoute

**Files:**
- Create: `src/components/__tests__/ProtectedRoute.test.tsx`
- Read: `src/components/ProtectedRoute.tsx`

**Context:** ProtectedRoute is a critical security component that gates all authenticated routes. No tests exist. Must verify it redirects unauthenticated users and respects RBAC.

**Step 1: Read ProtectedRoute**

Open `src/components/ProtectedRoute.tsx`.

**Step 2: Write tests**

```typescript
describe('ProtectedRoute', () => {
  it('redirects to /auth when not authenticated');
  it('renders children when authenticated');
  it('blocks access when user lacks required role');
  it('allows access when user has required role');
  it('shows loading spinner during auth check');
});
```

**Step 3: Implement and verify**

Run: `npm run test -- --run src/components/__tests__/ProtectedRoute.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/__tests__/ProtectedRoute.test.tsx
git commit -m "test: add ProtectedRoute tests (auth redirect, RBAC enforcement)"
```

---

### Task 11: Add tests for Pipeline kanban drag-drop

**Files:**
- Create: `src/features/pipeline/__tests__/PipelineJuridico.test.tsx`
- Read: `src/features/pipeline/PipelineJuridico.tsx`

**Context:** The pipeline kanban is the most complex UI component (130KB chunk). Needs tests for: rendering stages, card display, filter interactions.

**Step 1: Read PipelineJuridico**

Open `src/features/pipeline/PipelineJuridico.tsx`.

**Step 2: Write tests**

```typescript
describe('PipelineJuridico', () => {
  it('renders all pipeline stage columns');
  it('displays lead cards in correct stages');
  it('filters leads by search term');
  it('filters leads by legal area');
  it('shows total pipeline value');
  it('handles empty pipeline state');
});
```

**Step 3: Implement and verify**

Run: `npm run test -- --run src/features/pipeline/__tests__/PipelineJuridico.test.tsx`

**Step 4: Commit**

```bash
git add src/features/pipeline/__tests__/
git commit -m "test: add Pipeline kanban tests (stages, cards, filters, empty state)"
```

---

### Task 12: Add tests for CRM Dashboard

**Files:**
- Create: `src/features/crm/__tests__/CRMDashboard.test.tsx`
- Read: `src/features/crm/CRMDashboard.tsx`

**Step 1: Read CRMDashboard**

Open `src/features/crm/CRMDashboard.tsx`.

**Step 2: Write tests**

```typescript
describe('CRMDashboard', () => {
  it('renders KPI cards (pipeline value, lead count, follow-ups, hot leads)');
  it('displays pipeline stage visualization');
  it('shows follow-up panel with overdue indicators');
  it('handles loading state');
  it('handles empty state');
});
```

**Step 3: Implement and verify**

Run: `npm run test -- --run src/features/crm/__tests__/CRMDashboard.test.tsx`

**Step 4: Commit**

```bash
git add src/features/crm/__tests__/
git commit -m "test: add CRM Dashboard tests (KPIs, pipeline, follow-ups)"
```

---

### Task 13: Migrate legacy security.test.ts from Jest to Vitest

**Files:**
- Remove: `src/__tests__/security.test.ts` (legacy Jest)
- Read: `src/tests/security/rbac.test.tsx` (modern Vitest version)

**Context:** There's a legacy Jest security test file that should be migrated or removed if already covered by the Vitest version.

**Step 1: Read both files**

Compare `src/__tests__/security.test.ts` with `src/tests/security/rbac.test.tsx` to see if all test cases are covered.

**Step 2: Migrate any missing tests**

If any test cases from the Jest file aren't covered in the Vitest version, add them.

**Step 3: Remove the legacy file**

```bash
rm src/__tests__/security.test.ts
```

**Step 4: Run full test suite**

Run: `npm run test -- --run`
Expected: All green (no test files lost, coverage maintained)

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: migrate legacy Jest security test to Vitest, remove duplicate"
```

---

### Task 14: Increase coverage thresholds

**Files:**
- Modify: `vitest.config.ts` (thresholds section)

**Context:** Current thresholds are intentionally low (10% lines, 5% branches) as anti-regression baseline. After adding tests in Tasks 9-13, increase thresholds to match actual coverage.

**Step 1: Run coverage report**

Run: `npm run test:coverage`
Note the actual coverage numbers.

**Step 2: Set thresholds to 80% of actual**

In `vitest.config.ts`, update thresholds:
```typescript
thresholds: {
  lines: <80% of actual>,
  functions: <80% of actual>,
  branches: <80% of actual>,
  statements: <80% of actual>,
}
```

This provides a buffer for new code while preventing regression.

**Step 3: Verify coverage still passes**

Run: `npm run test:coverage`
Expected: PASS (above new thresholds)

**Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "ci: increase test coverage thresholds to prevent regression"
```

---

### Phase 6: Polish & Refinement

---

### Task 15: Fix dangerouslySetInnerHTML in chart component

**Files:**
- Modify: `src/components/ui/chart.tsx:79-96`

**Context:** The chart component uses `dangerouslySetInnerHTML` to inject CSS color variables via a `<style>` tag. While the content is auto-generated (not user input), this is not best practice and flags in security reviews.

**Step 1: Read chart.tsx**

Open `src/components/ui/chart.tsx` and understand the CSS injection pattern.

**Step 2: Replace with CSS custom properties via style attribute**

Instead of injecting a `<style>` tag, set CSS custom properties directly on the chart wrapper div via the `style` attribute:
```typescript
const chartStyle = useMemo(() => {
  const vars: Record<string, string> = {};
  Object.entries(config).forEach(([key, value]) => {
    vars[`--color-${key}`] = value.color || value.theme?.light || '';
  });
  return vars;
}, [config]);

return <div style={chartStyle}>{children}</div>;
```

**Step 3: Verify charts still render correctly**

Run dev server, navigate to `/relatorios`, verify all charts display with correct colors.

**Step 4: Run tests and build**

Run: `npm run test -- --run && npm run build`
Expected: All green

**Step 5: Commit**

```bash
git add src/components/ui/chart.tsx
git commit -m "fix: replace dangerouslySetInnerHTML with CSS custom properties in chart component"
```

---

### Task 16: Add missing ARIA labels to interactive icons

**Files:**
- Modify: `src/features/whatsapp/WhatsAppIA.tsx` (conversation icons)
- Modify: `src/features/scheduling/AgendamentosManager.tsx` (calendar view buttons)
- Modify: `src/components/Sidebar.tsx` (navigation icons)

**Context:** Some interactive icons lack `aria-label` attributes, reducing accessibility for screen readers.

**Step 1: Audit icon buttons**

Search for `<Button>` or clickable elements that only contain an icon (no text):
```bash
grep -n "variant.*ghost.*size.*icon" src/features/**/*.tsx src/components/*.tsx
```

**Step 2: Add aria-label to each**

For each icon-only button, add `aria-label` describing the action:
```typescript
<Button variant="ghost" size="icon" aria-label="Refresh conversations">
  <RefreshCw className="h-4 w-4" />
</Button>
```

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/ src/components/
git commit -m "a11y: add aria-label to icon-only buttons for screen reader support"
```

---

### Task 17: Fix E2E tests to use element waits instead of timeouts

**Files:**
- Modify: `e2e/golden-path.spec.ts`
- Modify: `e2e/leads.spec.ts`
- Modify: `e2e/billing.spec.ts`

**Context:** Several E2E tests use `page.waitForTimeout(1500)` which is flaky. Replace with proper element waits.

**Step 1: Find all waitForTimeout calls**

```bash
grep -rn "waitForTimeout" e2e/
```

**Step 2: Replace with element waits**

For each occurrence, replace with:
```typescript
// Before (flaky):
await page.waitForTimeout(1500);

// After (reliable):
await page.waitForSelector('[data-testid="dashboard-loaded"]', { timeout: 10000 });
// or
await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
```

**Step 3: Add data-testid attributes to key loading indicators if needed**

Add `data-testid="page-loaded"` to key page components after they finish loading.

**Step 4: Run E2E tests locally**

Run: `npx playwright test --project=chromium`
Expected: All passing without flaky timeouts

**Step 5: Commit**

```bash
git add e2e/ src/
git commit -m "test: replace flaky waitForTimeout with element waits in E2E tests"
```

---

### Phase 7: Final Validation

---

### Task 18: Run complete validation suite and fix any remaining issues

**Step 1: Run lint**

Run: `npm run lint`
Expected: 0 warnings, 0 errors

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Run all unit/integration tests**

Run: `npm run test -- --run`
Expected: All suites pass, 0 failures

**Step 4: Run build**

Run: `npm run build`
Expected: Clean build, no warnings

**Step 5: Run coverage**

Run: `npm run test:coverage`
Expected: Above configured thresholds

**Step 6: Start dev server and smoke test each screen**

Run: `npm run dev`
Visit each route from the MVP Screen Map and verify:
- Page loads without console errors
- Data loads from Supabase (or shows empty state)
- Forms validate input correctly
- Navigation between pages works
- RBAC blocks unauthorized access

**Step 7: Fix any remaining issues found**

Address each issue, run tests again, commit individually.

**Step 8: Final commit**

```bash
git commit -m "chore: final MVP validation - all checks passing"
```

---

### Task 19: Create pre-deploy checklist validation script

**Files:**
- Create: `scripts/validate-mvp.sh`

**Context:** Automate the Definition of Done checks into a single script that can run before any deploy.

**Step 1: Write the validation script**

```bash
#!/bin/bash
set -e
echo "=== Jurify MVP Validation ==="

echo "1/5 Lint..."
npm run lint

echo "2/5 TypeScript..."
npx tsc --noEmit

echo "3/5 Tests..."
npm run test -- --run

echo "4/5 Build..."
npm run build

echo "5/5 Coverage..."
npm run test:coverage

echo "=== ALL CHECKS PASSED ==="
```

**Step 2: Make executable and test**

```bash
chmod +x scripts/validate-mvp.sh
./scripts/validate-mvp.sh
```
Expected: All 5 checks pass

**Step 3: Commit**

```bash
git add scripts/validate-mvp.sh
git commit -m "ci: add MVP validation script (lint + types + tests + build + coverage)"
```

---

## Summary

| Phase | Tasks | Priority | Description |
|-------|-------|----------|-------------|
| 1 | 1-2 | BLOCKING | Fix failing test, implement auto-logout |
| 2 | 3-4 | HIGH | Complete billing page, WhatsApp setup |
| 3 | 5-6 | MEDIUM | Clean up debug logs, verify bundle exclusions |
| 4 | 7-8 | MEDIUM | Harden error handling in agents and health-check |
| 5 | 9-14 | MEDIUM | Add tests for Dashboard, ProtectedRoute, Pipeline, CRM; migrate legacy test; raise thresholds |
| 6 | 15-17 | LOW | Security/a11y polish, fix flaky E2E |
| 7 | 18-19 | FINAL | Full validation sweep, automation script |

**Total Tasks:** 19
**Estimated:** 19 tasks x 5 steps avg x ~3 min = ~4-5 hours of implementation

---

## Execution Notes

- Each task is independent within its phase but phases should be done in order
- Tasks within the same phase can be parallelized via subagents
- Always run `npm run test -- --run && npm run build` after each task
- Commit after each task (frequent small commits)
- If a task reveals new issues, create a new task rather than scope-creeping
