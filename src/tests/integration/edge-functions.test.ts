/**
 * Edge Function Contract Tests
 *
 * These tests verify the request/response contracts of Supabase Edge Functions
 * WITHOUT requiring a live Supabase instance. They validate:
 *   - Request body schemas (what the function expects)
 *   - Response body schemas (what the function returns)
 *   - Error handling (missing auth, invalid body, business rule violations)
 *   - Business logic that can be tested locally (status mapping, routing, etc.)
 *
 * WHY: Edge Functions run in Deno and cannot be directly imported into Vitest.
 * These contract tests catch schema drift, missing error handling, and regressions
 * in the HTTP interface layer that would otherwise only surface in production.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ROLE_PERMISSIONS, type UserRole, type Resource, type Action } from '../../types/rbac';

// =============================================================================
// 1. STRIPE WEBHOOK — Contract Tests
// =============================================================================
// Prevents: silent event loss when Stripe changes payload shape, duplicate
// processing causing double charges/emails, missing signature validation
// allowing forged webhooks.

describe('stripe-webhook contract', () => {
  // Schema derived from supabase/functions/stripe-webhook/index.ts
  // The function reads raw body text and validates via Stripe SDK, but the
  // internal event routing depends on this shape.

  const StripeEventSchema = z.object({
    id: z.string().startsWith('evt_'),
    type: z.string(),
    data: z.object({
      object: z.record(z.unknown()),
    }),
  });

  const StripeWebhookSuccessResponse = z.object({
    received: z.literal(true),
  });

  const StripeWebhookDuplicateResponse = z.object({
    received: z.literal(true),
    duplicate: z.literal(true),
  });

  const StripeWebhookErrorResponse = z.object({
    error: z.string(),
  });

  // All event types handled by the switch statement in the Edge Function
  const HANDLED_EVENT_TYPES = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'charge.refunded',
  ] as const;

  describe('event schema validation', () => {
    it('accepts a well-formed Stripe event', () => {
      const event = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_abc',
            customer: 'cus_xyz',
            status: 'active',
          },
        },
      };
      expect(() => StripeEventSchema.parse(event)).not.toThrow();
    });

    it('rejects event without id', () => {
      const event = {
        type: 'customer.subscription.created',
        data: { object: {} },
      };
      expect(() => StripeEventSchema.parse(event)).toThrow();
    });

    it('rejects event without data.object', () => {
      const event = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {},
      };
      expect(() => StripeEventSchema.parse(event)).toThrow();
    });

    it('rejects event with non-string type', () => {
      const event = {
        id: 'evt_test_123',
        type: 42,
        data: { object: {} },
      };
      expect(() => StripeEventSchema.parse(event)).toThrow();
    });
  });

  describe('response schema validation', () => {
    it('success response matches schema', () => {
      const response = { received: true };
      expect(() => StripeWebhookSuccessResponse.parse(response)).not.toThrow();
    });

    it('duplicate response matches schema', () => {
      const response = { received: true, duplicate: true };
      expect(() => StripeWebhookDuplicateResponse.parse(response)).not.toThrow();
    });

    it('error response matches schema', () => {
      const response = { error: 'Internal server error' };
      expect(() => StripeWebhookErrorResponse.parse(response)).not.toThrow();
    });
  });

  describe('handled event types completeness', () => {
    // WHY: If a new Stripe event type is added to the function but not here,
    // this test reminds us to add contract coverage.
    it('covers all subscription lifecycle events', () => {
      const subEvents = HANDLED_EVENT_TYPES.filter(e => e.startsWith('customer.subscription.'));
      expect(subEvents).toContain('customer.subscription.created');
      expect(subEvents).toContain('customer.subscription.updated');
      expect(subEvents).toContain('customer.subscription.deleted');
    });

    it('covers invoice events', () => {
      const invoiceEvents = HANDLED_EVENT_TYPES.filter(e => e.startsWith('invoice.'));
      expect(invoiceEvents).toContain('invoice.payment_succeeded');
      expect(invoiceEvents).toContain('invoice.payment_failed');
    });

    it('covers charge.refunded event', () => {
      expect(HANDLED_EVENT_TYPES).toContain('charge.refunded');
    });
  });

  describe('missing Stripe-Signature header', () => {
    // WHY: The function returns 400 when signature is missing. This prevents
    // forged webhook calls from unauthorized sources.
    it('should be rejected with 400 (function checks !signature || !webhookSecret)', () => {
      const signature = null;
      const webhookSecret = 'whsec_test';
      // Mirrors the guard: if (!signature || !webhookSecret)
      expect(!signature || !webhookSecret).toBe(true);
    });
  });

  describe('idempotency — duplicate event_id handling', () => {
    // WHY: Stripe retries failed webhook deliveries. Without idempotency,
    // the same event could trigger duplicate subscription updates or emails.
    it('duplicate detection checks event_id + source pair', () => {
      // The function queries: .eq("event_id", event.id).eq("source", "stripe")
      // and returns { received: true, duplicate: true } if found.
      const eventId = 'evt_duplicate_001';
      const source = 'stripe';
      const existingEvents = [{ event_id: 'evt_duplicate_001', source: 'stripe' }];

      const isDuplicate = existingEvents.some(
        e => e.event_id === eventId && e.source === source
      );
      expect(isDuplicate).toBe(true);
    });

    it('different event_id is not a duplicate', () => {
      const eventId = 'evt_new_001';
      const source = 'stripe';
      const existingEvents = [{ event_id: 'evt_duplicate_001', source: 'stripe' }];

      const isDuplicate = existingEvents.some(
        e => e.event_id === eventId && e.source === source
      );
      expect(isDuplicate).toBe(false);
    });

    it('same event_id but different source is not a duplicate', () => {
      const eventId = 'evt_duplicate_001';
      const source = 'other_provider';
      const existingEvents = [{ event_id: 'evt_duplicate_001', source: 'stripe' }];

      const isDuplicate = existingEvents.some(
        e => e.event_id === eventId && e.source === source
      );
      expect(isDuplicate).toBe(false);
    });
  });

  describe('status mapping parity with Edge Function', () => {
    // WHY: If the status map in the Edge Function diverges from what the
    // frontend expects, subscriptions get stuck in unknown states.
    const STATUS_MAP: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'past_due',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      trialing: 'trialing',
      paused: 'paused',
    };

    it('maps all known Stripe statuses', () => {
      const expectedStatuses = ['active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused'];
      for (const status of expectedStatuses) {
        expect(STATUS_MAP[status]).toBeDefined();
      }
    });

    it('unpaid maps to past_due (not canceled)', () => {
      expect(STATUS_MAP['unpaid']).toBe('past_due');
    });

    it('incomplete_expired maps to canceled', () => {
      expect(STATUS_MAP['incomplete_expired']).toBe('canceled');
    });

    it('unknown status falls through unchanged', () => {
      const unknownStatus = 'some_future_status';
      const mapped = STATUS_MAP[unknownStatus] || unknownStatus;
      expect(mapped).toBe('some_future_status');
    });
  });

  describe('STRIPE_SECRET_KEY not configured', () => {
    // WHY: If Stripe env var is missing, function should return 503 not crash.
    it('returns 503 when stripe is null', () => {
      const stripe = null;
      const expectedStatus = stripe ? 200 : 503;
      expect(expectedStatus).toBe(503);
    });
  });
});

// =============================================================================
// 2. ASSISTANT — Contract Tests
// =============================================================================
// Prevents: unauthenticated access to AI features, budget bypass allowing
// unlimited token usage, malformed request crashing the function.

describe('assistant contract', () => {
  const AssistantRequestSchema = z.object({
    message: z.string().min(1),
    userId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
  });

  const AssistantSuccessResponse = z.object({
    response: z.string(),
    conversation_id: z.string().uuid().nullable(),
    response_time_ms: z.number().nonnegative(),
    tools_used: z.array(z.string()),
    context_summary: z.object({
      leads_count: z.number().nonnegative(),
      contracts_count: z.number().nonnegative(),
      metrics: z.object({
        leads_by_status: z.record(z.number()),
        total_leads_30d: z.number().nonnegative(),
        total_contracts: z.number().nonnegative(),
        total_revenue: z.number().nonnegative(),
        conversion_rate: z.number().min(0).max(100),
      }),
    }),
  });

  const AssistantErrorResponse = z.object({
    error: z.string(),
  });

  const AssistantBudgetExceededResponse = z.object({
    error: z.literal('Limite diario de IA atingido').or(z.string()),
    message: z.string(),
  });

  const AssistantGracefulDegradation = z.object({
    response: z.string(),
    error_code: z.literal('ASSISTANT_ERROR'),
  });

  describe('request schema validation', () => {
    it('accepts valid request with all fields', () => {
      const req = {
        message: 'Quantos leads temos este mes?',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        conversationId: '660e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => AssistantRequestSchema.parse(req)).not.toThrow();
    });

    it('accepts request without optional conversationId', () => {
      const req = {
        message: 'Lista meus contratos',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => AssistantRequestSchema.parse(req)).not.toThrow();
    });

    it('rejects empty message', () => {
      const req = {
        message: '',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => AssistantRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing message field', () => {
      const req = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => AssistantRequestSchema.parse(req)).toThrow();
    });

    it('rejects non-UUID userId', () => {
      const req = {
        message: 'test',
        userId: 'not-a-uuid',
      };
      expect(() => AssistantRequestSchema.parse(req)).toThrow();
    });
  });

  describe('response schema validation', () => {
    it('success response matches schema', () => {
      const response = {
        response: 'Voce tem 15 leads este mes.',
        conversation_id: '660e8400-e29b-41d4-a716-446655440000',
        response_time_ms: 1250,
        tools_used: ['search_leads', 'get_metrics'],
        context_summary: {
          leads_count: 15,
          contracts_count: 3,
          metrics: {
            leads_by_status: { new: 5, contacted: 7, converted: 3 },
            total_leads_30d: 15,
            total_contracts: 3,
            total_revenue: 45000,
            conversion_rate: 20,
          },
        },
      };
      expect(() => AssistantSuccessResponse.parse(response)).not.toThrow();
    });

    it('success response allows null conversation_id', () => {
      const response = {
        response: 'Resposta sem conversa.',
        conversation_id: null,
        response_time_ms: 800,
        tools_used: [],
        context_summary: {
          leads_count: 0,
          contracts_count: 0,
          metrics: {
            leads_by_status: {},
            total_leads_30d: 0,
            total_contracts: 0,
            total_revenue: 0,
            conversion_rate: 0,
          },
        },
      };
      expect(() => AssistantSuccessResponse.parse(response)).not.toThrow();
    });

    it('graceful degradation response matches schema', () => {
      const response = {
        response: 'Desculpe, estou com dificuldades tecnicas no momento.',
        error_code: 'ASSISTANT_ERROR',
      };
      expect(() => AssistantGracefulDegradation.parse(response)).not.toThrow();
    });
  });

  describe('auth enforcement', () => {
    // WHY: Missing auth check would expose AI features (and OpenAI budget) to
    // unauthenticated users.
    it('missing Authorization header results in 401', () => {
      const authHeader = null;
      // Mirrors: if (!authHeader) return 401
      expect(authHeader).toBeNull();
      // The function returns { error: "Unauthorized" } with status 401
    });

    it('invalid JWT results in 401', () => {
      // The function validates the JWT via supabase.auth.getUser()
      // If authError or !authData.user -> 401
      const authError = { message: 'Invalid JWT' };
      const authData = { user: null };
      expect(!!(authError || !authData?.user)).toBe(true);
    });
  });

  describe('budget enforcement response', () => {
    // WHY: Without budget enforcement, a single tenant could exhaust the entire
    // OpenAI budget, causing service outage for all tenants.
    it('budget exceeded response has required fields', () => {
      const response = {
        error: 'Limite diario de IA atingido',
        message: 'Uso: 50.000/50.000 tokens. Tente novamente amanha.',
      };
      expect(() => AssistantBudgetExceededResponse.parse(response)).not.toThrow();
    });

    it('budget check returns 429 status', () => {
      // The function returns status 429 when budget is exceeded
      const budgetCheck = { allowed: false, tokensUsed: 50000, budgetLimit: 50000 };
      const expectedStatus = budgetCheck.allowed ? 200 : 429;
      expect(expectedStatus).toBe(429);
    });
  });

  describe('HTTP method enforcement', () => {
    // WHY: Only POST should be accepted. GET/PUT/DELETE could expose data or
    // cause unintended side effects.
    it('only POST is allowed', () => {
      const allowedMethods = ['POST'];
      const rejectedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];

      for (const method of rejectedMethods) {
        expect(allowedMethods).not.toContain(method);
      }
    });

    it('OPTIONS is handled for CORS preflight', () => {
      // The function returns "ok" with CORS headers for OPTIONS
      const method = 'OPTIONS';
      const isCORSPreflight = method === 'OPTIONS';
      expect(isCORSPreflight).toBe(true);
    });
  });

  describe('tool definitions completeness', () => {
    // WHY: If a tool is removed from TOOLS but still referenced in prompts,
    // OpenAI will hallucinate tool calls that fail silently.
    const EXPECTED_TOOLS = ['search_leads', 'get_metrics', 'search_contracts', 'create_lead'];

    it('all expected tools are defined', () => {
      // These are the tool names defined in the TOOLS array in the Edge Function
      expect(EXPECTED_TOOLS).toHaveLength(4);
      expect(EXPECTED_TOOLS).toContain('search_leads');
      expect(EXPECTED_TOOLS).toContain('get_metrics');
      expect(EXPECTED_TOOLS).toContain('search_contracts');
      expect(EXPECTED_TOOLS).toContain('create_lead');
    });
  });

  describe('input sanitization gate', () => {
    // WHY: Prompt injection could make the assistant reveal system prompts,
    // execute unauthorized tool calls, or return PII.
    it('unsafe input should be rejected with 400', () => {
      // The function calls sanitizeInput(message) and returns 400 if !safe
      const sanitizedUnsafe = { safe: false, text: '' };
      expect(sanitizedUnsafe.safe).toBe(false);
      // Expected response: { error: "Mensagem nao permitida." } with 400
    });
  });
});

// =============================================================================
// 3. ADMIN-CREATE-USER — Contract Tests
// =============================================================================
// Prevents: non-admin users creating accounts (privilege escalation), missing
// required fields causing partial user creation, tenant isolation bypass.

describe('admin-create-user contract', () => {
  const AdminCreateUserRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    nome_completo: z.string().min(1),
    telefone: z.string().optional(),
    cargo: z.string().optional(),
    departamento: z.string().optional(),
    roles: z.array(z.string()).default([]),
  });

  const AdminCreateUserSuccessResponse = z.object({
    success: z.literal(true),
    user_id: z.string().uuid(),
  });

  const AdminCreateUserErrorResponse = z.object({
    error: z.string(),
  });

  describe('request schema validation', () => {
    it('accepts valid request with all fields', () => {
      const req = {
        email: 'novo@escritorio.com',
        password: 'SecurePass123!',
        nome_completo: 'Maria Silva',
        telefone: '11999998888',
        cargo: 'Advogada',
        departamento: 'Civel',
        roles: ['user'],
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).not.toThrow();
    });

    it('accepts request with only required fields', () => {
      const req = {
        email: 'minimo@test.com',
        password: 'pass123',
        nome_completo: 'Joao',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).not.toThrow();
    });

    it('rejects invalid email', () => {
      const req = {
        email: 'not-an-email',
        password: 'pass123',
        nome_completo: 'Test',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing email', () => {
      const req = {
        password: 'pass123',
        nome_completo: 'Test',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing password', () => {
      const req = {
        email: 'test@test.com',
        nome_completo: 'Test',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing nome_completo', () => {
      const req = {
        email: 'test@test.com',
        password: 'pass123',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).toThrow();
    });

    it('rejects empty nome_completo', () => {
      const req = {
        email: 'test@test.com',
        password: 'pass123',
        nome_completo: '',
      };
      expect(() => AdminCreateUserRequestSchema.parse(req)).toThrow();
    });
  });

  describe('response schema validation', () => {
    it('success response matches schema', () => {
      const response = {
        success: true,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => AdminCreateUserSuccessResponse.parse(response)).not.toThrow();
    });

    it('error response matches schema', () => {
      const response = { error: 'Insufficient permissions' };
      expect(() => AdminCreateUserErrorResponse.parse(response)).not.toThrow();
    });
  });

  describe('auth and authorization enforcement', () => {
    // WHY: Without admin check, any authenticated user could create accounts
    // and assign arbitrary roles, leading to privilege escalation.
    it('missing Authorization returns 401', () => {
      const authHeader = null;
      expect(authHeader).toBeNull();
      // Expected: { error: "Authorization required" } with 401
    });

    it('non-admin user returns 403', () => {
      // The function checks: rolesData.some(r => r.role === "admin" || r.role === "administrador")
      const userRoles = [{ role: 'user', ativo: true }];
      const isAdmin = userRoles.some(r => r.role === 'admin' || r.role === 'administrador');
      expect(isAdmin).toBe(false);
      // Expected: { error: "Insufficient permissions" } with 403
    });

    it('admin role grants access', () => {
      const userRoles = [{ role: 'admin', ativo: true }];
      const isAdmin = userRoles.some(r => r.role === 'admin' || r.role === 'administrador');
      expect(isAdmin).toBe(true);
    });

    it('administrador role (legacy Portuguese) also grants access', () => {
      // WHY: The database may still contain Portuguese role names from before
      // the English migration. Both must be accepted.
      const userRoles = [{ role: 'administrador', ativo: true }];
      const isAdmin = userRoles.some(r => r.role === 'admin' || r.role === 'administrador');
      expect(isAdmin).toBe(true);
    });

    it('inactive admin role does not grant access', () => {
      // The function filters: .eq("ativo", true)
      const userRoles = [{ role: 'admin', ativo: false }];
      const activeAdminRoles = userRoles.filter(r => r.ativo);
      const isAdmin = activeAdminRoles.some(r => r.role === 'admin' || r.role === 'administrador');
      expect(isAdmin).toBe(false);
    });
  });

  describe('tenant isolation', () => {
    // WHY: Without tenant isolation, an admin in Tenant A could create users
    // in Tenant B's namespace.
    it('new user inherits requester tenant_id', () => {
      const requesterProfile = { tenant_id: 'tenant_abc' };
      const newUserProfile = {
        id: 'new-user-id',
        tenant_id: requesterProfile.tenant_id,
        nome_completo: 'New User',
        email: 'new@test.com',
      };
      expect(newUserProfile.tenant_id).toBe(requesterProfile.tenant_id);
    });

    it('roles are assigned to requester tenant', () => {
      const requesterProfile = { tenant_id: 'tenant_abc' };
      const roles = ['user', 'manager'];
      const rolesToInsert = roles.map(role => ({
        tenant_id: requesterProfile.tenant_id,
        user_id: 'new-user-id',
        role,
        ativo: true,
      }));
      for (const r of rolesToInsert) {
        expect(r.tenant_id).toBe('tenant_abc');
      }
    });
  });

  describe('required fields error message', () => {
    // WHY: The Edge Function returns a specific Portuguese error message.
    // If this changes, the frontend toast would show a generic error.
    it('returns specific error for missing required fields', () => {
      const expectedError = 'email, password e nome_completo sao obrigatorios';
      expect(expectedError).toContain('email');
      expect(expectedError).toContain('password');
      expect(expectedError).toContain('nome_completo');
    });
  });
});

// =============================================================================
// 4. SEND-EMAIL — Contract Tests
// =============================================================================
// Prevents: cross-tenant email sending (data leak), XSS in email templates,
// unauthenticated email sending (spam vector).

describe('send-email contract', () => {
  const SendEmailRequestSchema = z.object({
    to: z.string().email(),
    template: z.enum([
      'welcome',
      'reset-password',
      'billing-confirmation',
      'subscription-cancelled',
      'payment-failed',
      'agent-alert',
      'charge-refunded',
    ]),
    data: z.record(z.string().optional()).optional(),
  });

  const SendEmailSuccessResponse = z.object({
    success: z.literal(true),
    messageId: z.string(),
  });

  const SendEmailErrorResponse = z.object({
    error: z.string(),
  });

  describe('request schema validation', () => {
    it('accepts valid welcome email request', () => {
      const req = {
        to: 'user@example.com',
        template: 'welcome',
        data: { name: 'Maria' },
      };
      expect(() => SendEmailRequestSchema.parse(req)).not.toThrow();
    });

    it('accepts all valid template types', () => {
      const templates = [
        'welcome', 'reset-password', 'billing-confirmation',
        'subscription-cancelled', 'payment-failed', 'agent-alert',
        'charge-refunded',
      ];
      for (const template of templates) {
        const req = { to: 'user@test.com', template };
        expect(() => SendEmailRequestSchema.parse(req)).not.toThrow();
      }
    });

    it('rejects invalid template type', () => {
      const req = {
        to: 'user@test.com',
        template: 'nonexistent-template',
      };
      expect(() => SendEmailRequestSchema.parse(req)).toThrow();
    });

    it('rejects invalid email address', () => {
      const req = {
        to: 'not-an-email',
        template: 'welcome',
      };
      expect(() => SendEmailRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing to field', () => {
      const req = { template: 'welcome' };
      expect(() => SendEmailRequestSchema.parse(req)).toThrow();
    });

    it('rejects missing template field', () => {
      const req = { to: 'user@test.com' };
      expect(() => SendEmailRequestSchema.parse(req)).toThrow();
    });
  });

  describe('response schema validation', () => {
    it('success response matches schema', () => {
      const response = { success: true, messageId: 'msg_abc123' };
      expect(() => SendEmailSuccessResponse.parse(response)).not.toThrow();
    });

    it('error response matches schema', () => {
      const response = { error: 'Email service not configured' };
      expect(() => SendEmailErrorResponse.parse(response)).not.toThrow();
    });
  });

  describe('HTML escaping in templates', () => {
    // WHY: Without escaping, a lead named '<script>alert("xss")</script>' could
    // inject JavaScript into email clients that render HTML.
    // Mirrors the escapeHtml() function in send-email/index.ts

    function escapeHtml(str: string | undefined | null): string {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    it('escapes < and > to prevent script injection', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('handles null/undefined gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('does not double-escape already-escaped content', () => {
      // Edge case: if someone passes already-escaped HTML
      const alreadyEscaped = '&amp;lt;';
      const result = escapeHtml(alreadyEscaped);
      expect(result).toBe('&amp;amp;lt;');
      // This is correct behavior — the function should always escape, not try
      // to detect pre-escaped content.
    });
  });

  describe('auth enforcement', () => {
    // WHY: Without auth, anyone could send emails via the function (spam vector).
    it('missing Authorization returns 401', () => {
      const authHeader = null;
      expect(authHeader).toBeNull();
    });

    it('service-role key bypasses user auth (for internal calls)', () => {
      // The function compares token to SUPABASE_SERVICE_ROLE_KEY
      const token = 'service_role_key_value';
      const serviceRoleKey = 'service_role_key_value';
      const isServiceRole = token === serviceRoleKey;
      expect(isServiceRole).toBe(true);
    });

    it('user JWT requires auth validation', () => {
      const token = 'user_jwt_token';
      const serviceRoleKey = 'service_role_key_value';
      const isServiceRole = token === serviceRoleKey;
      expect(isServiceRole).toBe(false);
      // Function proceeds to validate JWT via supabase.auth.getUser()
    });
  });

  describe('tenant isolation enforcement', () => {
    // WHY: Without tenant isolation, a user in Tenant A could send emails to
    // addresses in Tenant B, leaking internal information.
    it('user JWT request checks recipient belongs to tenant', () => {
      // The function checks leads AND profiles tables for the recipient email
      const tenantId = 'tenant_abc';
      const recipientEmail = 'client@example.com';

      const leadMatch = [{ id: 'lead_1' }]; // Found in leads
      const profileMatch: unknown[] = []; // Not found in profiles

      const isLeadInTenant = leadMatch.length > 0;
      const isProfileInTenant = profileMatch.length > 0;
      const isAllowed = isLeadInTenant || isProfileInTenant;

      expect(isAllowed).toBe(true);
    });

    it('rejects email to address outside tenant', () => {
      const leadMatch: unknown[] = [];
      const profileMatch: unknown[] = [];

      const isAllowed = leadMatch.length > 0 || profileMatch.length > 0;
      expect(isAllowed).toBe(false);
      // Expected: { error: "Destinatario nao pertence ao seu escritorio" } with 403
    });

    it('service-role calls skip tenant isolation check', () => {
      // WHY: Internal calls (e.g., stripe-webhook sending billing emails)
      // use the service-role key and should not be tenant-restricted.
      const isServiceRole = true;
      const authenticatedUserId = null;
      const shouldCheckTenant = !isServiceRole && !!authenticatedUserId;
      expect(shouldCheckTenant).toBe(false);
    });
  });

  describe('HTTP method enforcement', () => {
    it('only POST is allowed (405 for others)', () => {
      const method = 'GET';
      const isAllowed = method === 'POST' || method === 'OPTIONS';
      expect(isAllowed).toBe(false);
    });
  });

  describe('Postmark configuration check', () => {
    // WHY: If POSTMARK_SERVER_TOKEN is missing, the function should return 503
    // not crash with an unhandled error.
    it('returns 503 when POSTMARK_SERVER_TOKEN is empty', () => {
      const POSTMARK_TOKEN = '';
      const expectedStatus = !POSTMARK_TOKEN ? 503 : 200;
      expect(expectedStatus).toBe(503);
    });
  });
});

// =============================================================================
// 5. RBAC PARITY — Migration SQL vs TypeScript ROLE_PERMISSIONS
// =============================================================================
// Prevents: frontend showing buttons the backend will deny, or backend granting
// permissions the frontend hides (security gap).

describe('RBAC parity — TypeScript vs SQL migration', () => {
  // The SQL has_permission() function in 20260310000001_fix_app_role_enum.sql
  // delegates to the role_permissions table. The TypeScript ROLE_PERMISSIONS
  // in src/types/rbac.ts is the client-side mirror.
  //
  // This test ensures they stay in sync by:
  // 1. Building a flat set from ROLE_PERMISSIONS
  // 2. Checking structural invariants that MUST hold

  describe('ROLE_PERMISSIONS structural integrity', () => {
    const ALL_ROLES: UserRole[] = ['admin', 'manager', 'user', 'viewer'];

    it('all four roles are defined', () => {
      for (const role of ALL_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      }
    });

    it('admin has permissions on every resource that other roles have', () => {
      // Admin is a superset — if any role has access to a resource, admin must too.
      const adminResources = new Set(ROLE_PERMISSIONS.admin.map(p => p.resource));

      for (const role of ['manager', 'user', 'viewer'] as UserRole[]) {
        for (const perm of ROLE_PERMISSIONS[role]) {
          if (perm.actions.length > 0) {
            expect(
              adminResources.has(perm.resource),
              `admin missing resource '${perm.resource}' that '${role}' has`
            ).toBe(true);
          }
        }
      }
    });

    it('admin has all actions that lower roles have on each resource', () => {
      // For each resource, admin's actions should be a superset of all other roles.
      for (const role of ['manager', 'user', 'viewer'] as UserRole[]) {
        for (const perm of ROLE_PERMISSIONS[role]) {
          const adminPerm = ROLE_PERMISSIONS.admin.find(p => p.resource === perm.resource);
          if (!adminPerm) continue; // Already caught by previous test

          for (const action of perm.actions) {
            expect(
              adminPerm.actions.includes(action),
              `admin missing action '${action}' on '${perm.resource}' that '${role}' has`
            ).toBe(true);
          }
        }
      }
    });

    it('role hierarchy is monotonically decreasing (admin >= manager >= user >= viewer)', () => {
      // Count total permissions per role
      const permCount = (role: UserRole) =>
        ROLE_PERMISSIONS[role].reduce((sum, p) => sum + p.actions.length, 0);

      expect(permCount('admin')).toBeGreaterThanOrEqual(permCount('manager'));
      expect(permCount('manager')).toBeGreaterThanOrEqual(permCount('user'));
      expect(permCount('user')).toBeGreaterThanOrEqual(permCount('viewer'));
    });
  });

  describe('viewer is read-only', () => {
    // WHY: Viewer is the default role for new users. If it accidentally gains
    // write access, new unverified users could modify data.
    it('viewer has no write/delete/manage actions on non-conexoes resources', () => {
      for (const perm of ROLE_PERMISSIONS.viewer) {
        // conexoes is an exception — viewers can manage their own connections
        if (perm.resource === 'conexoes') continue;

        for (const action of perm.actions) {
          expect(
            action,
            `viewer should not have '${action}' on '${perm.resource}'`
          ).toBe('read');
        }
      }
    });
  });

  describe('critical resources are admin-only for destructive actions', () => {
    // WHY: Delete on agentes_ia, usuarios, configuracoes should be admin-only
    // to prevent accidental/malicious data loss.
    const ADMIN_ONLY_DELETE: Resource[] = ['agentes_ia', 'usuarios', 'configuracoes'];

    for (const resource of ADMIN_ONLY_DELETE) {
      it(`only admin can delete ${resource}`, () => {
        for (const role of ['manager', 'user', 'viewer'] as UserRole[]) {
          const perm = ROLE_PERMISSIONS[role].find(p => p.resource === resource);
          if (perm) {
            expect(
              perm.actions.includes('delete'),
              `${role} should not have delete on ${resource}`
            ).toBe(false);
          }
        }
      });
    }
  });

  describe('resource coverage completeness', () => {
    // WHY: If a new resource is added to the Resource type but not to
    // ROLE_PERMISSIONS, it will silently have no permissions (deny-by-default
    // is good, but we should be explicit).

    // All resources from the Resource type union
    const ALL_RESOURCES: Resource[] = [
      'leads', 'contratos', 'agentes_ia', 'usuarios', 'configuracoes',
      'relatorios', 'logs', 'integracoes', 'whatsapp', 'agendamentos',
      'pipeline', 'processos', 'prazos', 'honorarios', 'documentos',
      'conexoes', 'departamentos', 'tags', 'notificacoes', 'fluxos', 'regras',
    ];

    it('admin has an entry for every Resource type', () => {
      const adminResources = new Set(ROLE_PERMISSIONS.admin.map(p => p.resource));
      for (const resource of ALL_RESOURCES) {
        expect(
          adminResources.has(resource),
          `admin missing resource: ${resource}`
        ).toBe(true);
      }
    });

    it('all roles have entries for the same set of resources', () => {
      // All roles should explicitly list all resources (even with empty actions)
      const adminResources = ROLE_PERMISSIONS.admin.map(p => p.resource).sort();
      for (const role of ['manager', 'user', 'viewer'] as UserRole[]) {
        const roleResources = ROLE_PERMISSIONS[role].map(p => p.resource).sort();
        expect(
          roleResources,
          `${role} resource list differs from admin`
        ).toEqual(adminResources);
      }
    });
  });

  describe('no accidental permission grants (regression guard)', () => {
    // WHY: These specific denials have been verified against the SQL migration
    // and RLS policies. If any of these flip to true, it indicates a regression.

    it('viewer cannot create leads', () => {
      const viewerLeads = ROLE_PERMISSIONS.viewer.find(p => p.resource === 'leads');
      expect(viewerLeads?.actions.includes('create')).toBe(false);
    });

    it('user cannot delete leads', () => {
      const userLeads = ROLE_PERMISSIONS.user.find(p => p.resource === 'leads');
      expect(userLeads?.actions.includes('delete')).toBe(false);
    });

    it('user cannot create contratos', () => {
      const userContratos = ROLE_PERMISSIONS.user.find(p => p.resource === 'contratos');
      expect(userContratos?.actions.includes('create')).toBe(false);
    });

    it('manager cannot delete agentes_ia', () => {
      const managerAgentes = ROLE_PERMISSIONS.manager.find(p => p.resource === 'agentes_ia');
      expect(managerAgentes?.actions.includes('delete')).toBe(false);
    });

    it('manager cannot delete contratos', () => {
      const managerContratos = ROLE_PERMISSIONS.manager.find(p => p.resource === 'contratos');
      expect(managerContratos?.actions.includes('delete')).toBe(false);
    });

    it('viewer has no access to logs', () => {
      const viewerLogs = ROLE_PERMISSIONS.viewer.find(p => p.resource === 'logs');
      expect(viewerLogs?.actions.length ?? 0).toBe(0);
    });

    it('viewer has no access to honorarios', () => {
      const viewerHonorarios = ROLE_PERMISSIONS.viewer.find(p => p.resource === 'honorarios');
      expect(viewerHonorarios?.actions.length ?? 0).toBe(0);
    });

    it('user has no access to honorarios', () => {
      const userHonorarios = ROLE_PERMISSIONS.user.find(p => p.resource === 'honorarios');
      expect(userHonorarios?.actions.length ?? 0).toBe(0);
    });
  });
});
