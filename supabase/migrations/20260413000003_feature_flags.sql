-- ============================================================================
-- Feature Flags — desbloqueia canary rollout e A/B testing
-- ============================================================================
-- Por que: hoje todo deploy afeta 100% dos tenants simultaneamente. Sem
-- feature flags, não há como testar uma nova funcionalidade com 5% dos
-- tenants antes de liberar pra todos — toda mudança é tudo-ou-nada.
--
-- Modelo:
--   features                — catálogo global de flags disponíveis
--   feature_overrides       — override por tenant (sobrescreve rollout_pct)
--
-- Resolução:
--   - override existe pro tenant → usa override.enabled
--   - sem override → calcula hash(tenant_id + name) % 100 < rollout_pct
--     (determinístico: mesmo tenant sempre cai no mesmo bucket pra uma flag)
-- ============================================================================

-- Catálogo de features
CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  descricao TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_pct INTEGER NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.features IS
  'Catálogo global de feature flags. enabled=true + rollout_pct=100 → todos. enabled=true + rollout_pct=5 → 5% determinístico.';

-- Overrides por tenant (admin pode forçar on/off pra tenants específicos)
CREATE TABLE IF NOT EXISTS public.feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL REFERENCES public.features(name) ON UPDATE CASCADE,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE (tenant_id, feature_name)
);

-- Index para lookup rápido no hook useFeatureFlag
CREATE INDEX IF NOT EXISTS idx_feature_overrides_tenant_feature
  ON public.feature_overrides (tenant_id, feature_name);

-- RLS
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_overrides ENABLE ROW LEVEL SECURITY;

-- Features: lê todo mundo autenticado, escreve só service_role (gerenciado off-band)
DROP POLICY IF EXISTS features_read ON public.features;
CREATE POLICY features_read ON public.features
  FOR SELECT TO authenticated
  USING (true);

-- Overrides: lê/escreve só no próprio tenant (admins via RPC)
DROP POLICY IF EXISTS feature_overrides_tenant_isolation ON public.feature_overrides;
CREATE POLICY feature_overrides_tenant_isolation ON public.feature_overrides
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- RPC: resolve flag pra um tenant com hash determinístico
-- Usa hashtext (Postgres built-in) para gerar bucket 0-99 consistente
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_tenant_id UUID, _feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_override BOOLEAN;
  v_enabled BOOLEAN;
  v_rollout INT;
  v_bucket INT;
BEGIN
  -- 1. Override do tenant vence tudo
  SELECT enabled INTO v_override
    FROM public.feature_overrides
   WHERE tenant_id = _tenant_id
     AND feature_name = _feature_name
   LIMIT 1;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  -- 2. Sem override: consulta catálogo global
  SELECT enabled, rollout_pct INTO v_enabled, v_rollout
    FROM public.features
   WHERE name = _feature_name
   LIMIT 1;

  IF NOT FOUND OR NOT v_enabled THEN
    RETURN false;
  END IF;

  IF v_rollout >= 100 THEN
    RETURN true;
  END IF;

  IF v_rollout <= 0 THEN
    RETURN false;
  END IF;

  -- 3. Hash determinístico: mesmo tenant sempre cai no mesmo bucket pra uma flag
  -- Uso abs(hashtext) % 100 — colisões aceitáveis pro rollout gradual
  v_bucket := abs(hashtext(_tenant_id::TEXT || ':' || _feature_name)) % 100;

  RETURN v_bucket < v_rollout;
END;
$$;

COMMENT ON FUNCTION public.is_feature_enabled(UUID, TEXT) IS
  'Resolve feature flag pro tenant. Ordem: override > rollout_pct hash. Determinístico.';

GRANT EXECUTE ON FUNCTION public.is_feature_enabled(UUID, TEXT) TO authenticated, service_role;

-- Seed de flags úteis (todas off por default — você liga quando precisar)
INSERT INTO public.features (name, descricao, enabled, rollout_pct) VALUES
  ('whatsapp_ai_autonomous_scheduling', 'Agente IA agenda reuniões autonomamente via WhatsApp', true, 100),
  ('lead_auto_qualify_on_agendamento', 'Trigger de auto-qualificação pós agendamento', true, 100),
  ('dynamic_department_routing', 'Re-roteia depto do lead conforme área detectada na conversa', true, 100),
  ('whatsapp_auto_followup', 'Follow-up automático para leads inativos', false, 0),
  ('dashboard_materialized_views', 'Dashboard servido por MVs (mais rápido, menos fresh)', false, 0)
ON CONFLICT (name) DO NOTHING;
