-- ============================================================================
-- email_failures queue table (Onda 1, Billing/Resilience)
--
-- Date:        2026-04-17
-- Context:     stripe-webhook used to swallow Postmark failures with a
--              console.warn. There was no audit trail, no replay surface, and
--              no way for operators to know that a customer never received
--              their billing-confirmation email. This table makes failures
--              durable and queryable.
--
-- Producers:   stripe-webhook/index.ts (sendEmail() helper)
-- Consumers:   manual review by ops (no automated retry yet — intentional;
--              automated replay belongs in a separate worker function with
--              proper deduplication, not in the webhook hot path).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_failures (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient          text NOT NULL,
  template           text NOT NULL,
  payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message      text NOT NULL,
  http_status        integer,
  source             text NOT NULL,
  -- Stripe-specific (nullable so other producers can use the table later):
  stripe_event_id    text,
  stripe_event_type  text,
  -- Operational:
  resolved_at        timestamptz,
  resolved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note    text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_failures_unresolved_idx
  ON public.email_failures (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS email_failures_stripe_event_idx
  ON public.email_failures (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_failures_source_idx
  ON public.email_failures (source, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS: service-role only. This table contains email addresses + failure
-- payloads (potentially PII like name/charge_id) and must NOT be readable by
-- tenants. All writes come from edge functions using the service role key,
-- which bypasses RLS. We still enable RLS so any accidental anon/auth client
-- access is denied by default.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.email_failures ENABLE ROW LEVEL SECURITY;

-- Explicit deny policies (defense-in-depth; service role bypasses all RLS).
DROP POLICY IF EXISTS "email_failures_no_select" ON public.email_failures;
CREATE POLICY "email_failures_no_select"
  ON public.email_failures
  FOR SELECT
  TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS "email_failures_no_write" ON public.email_failures;
CREATE POLICY "email_failures_no_write"
  ON public.email_failures
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.email_failures IS
  'Durable queue of failed transactional emails. Writes via service role from edge functions (stripe-webhook, etc). RLS denies all tenant access — review via Supabase Studio with service-role key.';
