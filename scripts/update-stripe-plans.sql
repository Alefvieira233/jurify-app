-- ============================================================================
-- Atualiza subscription_plans com price_ids reais do Stripe
-- ============================================================================
-- COMO USAR:
--   1. Crie os produtos Pro e Enterprise em https://dashboard.stripe.com/products
--      - Pro: recorrente mensal R$ 199,00 + anual (opcional) R$ 1999,00
--      - Enterprise: recorrente mensal R$ 999,90 + anual (opcional) R$ 9999,00
--   2. Copie os 4 price_ids gerados e substitua os placeholders abaixo
--   3. Cole este SQL em:
--      https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new
--   4. Run. Confirme via: SELECT name, stripe_price_id_monthly FROM subscription_plans;
-- ============================================================================

BEGIN;

-- PRO
UPDATE subscription_plans
   SET stripe_price_id_monthly = 'price_XXXXXXXXXXXX_PRO_MONTHLY',     -- ← substitua
       stripe_price_id_yearly  = 'price_XXXXXXXXXXXX_PRO_YEARLY',      -- ← substitua (ou NULL se não tiver)
       updated_at              = NOW()
 WHERE tier = 'pro';

-- ENTERPRISE
UPDATE subscription_plans
   SET stripe_price_id_monthly = 'price_XXXXXXXXXXXX_ENT_MONTHLY',     -- ← substitua
       stripe_price_id_yearly  = 'price_XXXXXXXXXXXX_ENT_YEARLY',      -- ← substitua
       updated_at              = NOW()
 WHERE tier = 'enterprise';

-- Validação: garante que ambos foram atualizados
DO $$
DECLARE
  pro_id    TEXT;
  ent_id    TEXT;
BEGIN
  SELECT stripe_price_id_monthly INTO pro_id FROM subscription_plans WHERE tier = 'pro';
  SELECT stripe_price_id_monthly INTO ent_id FROM subscription_plans WHERE tier = 'enterprise';

  IF pro_id LIKE 'price_PLACEHOLDER%' OR pro_id LIKE 'price_XXXX%' THEN
    RAISE EXCEPTION 'PRO price_id ainda é placeholder: %', pro_id;
  END IF;
  IF ent_id LIKE 'price_PLACEHOLDER%' OR ent_id LIKE 'price_XXXX%' THEN
    RAISE EXCEPTION 'ENTERPRISE price_id ainda é placeholder: %', ent_id;
  END IF;

  RAISE NOTICE 'Pro: %  ·  Enterprise: %', pro_id, ent_id;
END $$;

COMMIT;

-- Verificação final
SELECT name, tier, stripe_price_id_monthly, stripe_price_id_yearly, ativo
  FROM subscription_plans
 WHERE tier IN ('pro','enterprise')
 ORDER BY price_monthly;
