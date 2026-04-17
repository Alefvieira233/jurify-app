-- ============================================================================
-- Seed subscription_plans catalog (Onda 1, Billing/Resilience)
--
-- Date:        2026-04-17
-- Context:     Live audit (2026-04-17) found subscription_plans = 0 rows in
--              production. Without seeded plans, the billing UI cannot list
--              upgrade options, and stripe-webhook's plan resolution has no
--              fallback when STRIPE_PRICE_* env vars are unset.
--
-- Idempotent:  ON CONFLICT (tier) DO NOTHING — safe to re-run. Operators MUST
--              replace `price_PLACEHOLDER_*` with real Stripe price IDs via:
--                UPDATE public.subscription_plans
--                SET stripe_price_id_monthly = 'price_xxx'
--                WHERE tier = 'pro';
--
-- Schema ref:  src/integrations/supabase/types.ts (subscription_plans).
--              Columns used: tier (PK-by-convention), name, description,
--              price_monthly, price_yearly, stripe_price_id_monthly,
--              stripe_price_id_yearly, features (jsonb), limits (jsonb), ativo.
-- ============================================================================

-- Ensure tier is unique so ON CONFLICT works deterministically. The base
-- migration declared tier as a regular column without a constraint; create
-- it idempotently here so the seed below is safely re-runnable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plans_tier_key'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_tier_key UNIQUE (tier);
  END IF;
END $$;

INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  features, limits, ativo
) VALUES
  (
    'free',
    'Gratuito',
    'Plano de entrada para conhecer a plataforma.',
    0, 0,
    NULL, NULL,
    '["50 chamadas IA/mês", "1 usuário", "Suporte comunitário"]'::jsonb,
    '{"ai_calls_per_month": 50, "users": 1, "leads": 100}'::jsonb,
    true
  ),
  (
    'pro',
    'Pro',
    'Para escritórios em crescimento que precisam de IA produtiva no WhatsApp.',
    19900, 199000,
    'price_PLACEHOLDER_PRO', 'price_PLACEHOLDER_PRO_YEARLY',
    '["500 chamadas IA/mês", "WhatsApp IA integrado", "5 usuários", "Suporte por email"]'::jsonb,
    '{"ai_calls_per_month": 500, "users": 5, "leads": 5000}'::jsonb,
    true
  ),
  (
    'enterprise',
    'Enterprise',
    'Para escritórios estabelecidos que precisam de capacidade ilimitada e SLA.',
    99900, 999000,
    'price_PLACEHOLDER_ENTERPRISE', 'price_PLACEHOLDER_ENTERPRISE_YEARLY',
    '["Ilimitado de chamadas IA", "Multi-canal", "Usuários ilimitados", "SLA + suporte dedicado"]'::jsonb,
    '{"ai_calls_per_month": -1, "users": -1, "leads": -1}'::jsonb,
    true
  )
ON CONFLICT (tier) DO NOTHING;

COMMENT ON CONSTRAINT subscription_plans_tier_key ON public.subscription_plans
  IS 'Unique tier slug — required for ON CONFLICT seeding in 20260417000004.';
