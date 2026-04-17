-- ============================================================================
-- Reconcile subscription_plans + cleanup legal_knowledge legacy policies
--
-- Date:        2026-04-17
-- Context:     Validation of Onda 1 (commit 396546f) found:
--                (P1) subscription_plans seed in 20260417000004 used
--                ON CONFLICT DO NOTHING, so pre-existing legacy rows
--                (basic, professional, enterprise from 2025-10-29) were
--                left with stripe_price_id_monthly = NULL. Also, the 'pro'
--                seed used 19900 / 99900 which became R$ 19.900,00 and
--                R$ 99.900,00 (field is numeric in BRL, not cents). Both
--                break the billing UI checkout flow.
--                (P2) legal_knowledge has 3 legacy policies (_select,
--                _update, _delete) with role=public still present,
--                duplicating the new tenant_scoped policy. Not a security
--                leak (they all check auth.uid() IS NOT NULL), but
--                pollutes the policy model.
--
-- Idempotent:  UPDATE with WHERE guards; DROP POLICY IF EXISTS.
-- Reversible:  Policies can be recreated from 20260225100000 history.
-- ============================================================================


-- ============================================================
-- SECTION 1 — subscription_plans price correction + enterprise stripe id
-- ============================================================

-- 1a. Fix 'pro' price (19900 → 199.00 BRL, yearly 1990.00)
UPDATE public.subscription_plans
  SET price_monthly = 199.00,
      price_yearly  = 1990.00
  WHERE tier = 'pro'
    AND price_monthly = 19900.00;

-- 1b. Deactivate legacy 'basic' and 'professional' (superseded by 'pro')
--     These were seeded on 2025-10-29 with NULL stripe_price_id and no
--     upgrade path. Keep rows for referential integrity (existing
--     subscriptions might still point here); just hide from UI.
UPDATE public.subscription_plans
  SET ativo = false
  WHERE tier IN ('basic', 'professional');

-- 1c. Backfill 'enterprise' stripe placeholder + correct price
--     Legacy row exists since 2025-10-29 with price_monthly=999.90 (BRL).
--     Keep that price (reasonable) but add stripe placeholders so checkout
--     doesn't silently fail.
UPDATE public.subscription_plans
  SET stripe_price_id_monthly = 'price_PLACEHOLDER_ENTERPRISE',
      stripe_price_id_yearly  = 'price_PLACEHOLDER_ENTERPRISE_YEARLY'
  WHERE tier = 'enterprise'
    AND stripe_price_id_monthly IS NULL;

-- 1d. Drop accidental 2nd 'enterprise' row if 20260417000004 inserted one
--     It wouldn't have, because ON CONFLICT (tier) DO NOTHING. But if some
--     other seed path created it, keep the legacy row (older created_at).
DELETE FROM public.subscription_plans
  WHERE tier = 'enterprise'
    AND stripe_price_id_monthly = 'price_PLACEHOLDER_ENTERPRISE'
    AND created_at > '2026-01-01'
    AND EXISTS (
      SELECT 1 FROM public.subscription_plans b
      WHERE b.tier = 'enterprise' AND b.created_at < '2026-01-01'
    );


-- ============================================================
-- SECTION 2 — legal_knowledge policy cleanup
-- ============================================================

-- Drop legacy policies that predate the Onda 1 tenant-scoped rewrite.
-- These were created with role=public (meaning ALL roles including
-- authenticated) and check auth.uid() IS NOT NULL + tenant_id match —
-- same semantic as legal_knowledge_tenant_scoped but without the
-- TO authenticated restriction and without WITH CHECK on writes.
DROP POLICY IF EXISTS legal_knowledge_select ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_update ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_delete ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_insert ON public.legal_knowledge;
DROP POLICY IF EXISTS "Service role manages legal knowledge" ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_service_role ON public.legal_knowledge;

-- Ensure the new canonical policies exist (idempotent recreate)
DROP POLICY IF EXISTS legal_knowledge_tenant_scoped   ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_service_role_all ON public.legal_knowledge;

CREATE POLICY legal_knowledge_tenant_scoped ON public.legal_knowledge
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY legal_knowledge_tenant_write ON public.legal_knowledge
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY legal_knowledge_service_role_all ON public.legal_knowledge
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
DECLARE
  v_pro_price NUMERIC;
  v_ent_stripe TEXT;
  v_active_count INTEGER;
  v_lk_policies INTEGER;
BEGIN
  SELECT price_monthly INTO v_pro_price FROM public.subscription_plans WHERE tier='pro';
  SELECT stripe_price_id_monthly INTO v_ent_stripe FROM public.subscription_plans WHERE tier='enterprise';
  SELECT COUNT(*) INTO v_active_count FROM public.subscription_plans WHERE ativo = true;
  SELECT COUNT(*) INTO v_lk_policies FROM pg_policies WHERE tablename='legal_knowledge' AND schemaname='public';

  RAISE NOTICE 'subscription_plans: pro price_monthly=%, enterprise stripe=%, active_count=%', v_pro_price, v_ent_stripe, v_active_count;
  RAISE NOTICE 'legal_knowledge policies: %', v_lk_policies;

  IF v_pro_price <> 199.00 THEN
    RAISE WARNING 'pro price_monthly should be 199.00 but got %', v_pro_price;
  END IF;
  IF v_ent_stripe IS NULL THEN
    RAISE WARNING 'enterprise stripe_price_id_monthly should be placeholder but is NULL';
  END IF;
END $$;
