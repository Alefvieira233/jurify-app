-- ============================================================================
-- Trial 45 dias automático no signup + read-only graceful após expirar
-- ============================================================================
-- Estende handle_new_user() para criar subscription trialing por 45 dias.
-- Fornece RPC get_trial_status() consumida pelo frontend (banner + gate).
-- Backfill: tenants existentes ganham 45 dias a partir de HOJE (não created_at).
-- ============================================================================

SET LOCAL search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 1) Constantes de configuração do trial (centralizadas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trial_duration_days()
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT 45 $$;

COMMENT ON FUNCTION public.trial_duration_days() IS
  'Duração padrão do trial gratuito em dias. Centralizado para fácil ajuste.';

-- ----------------------------------------------------------------------------
-- 2) Função criadora de subscription trial (idempotente por tenant)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_trial_subscription(
  p_tenant_id uuid,
  p_start_at  timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id      uuid;
  v_duration    integer;
  v_end_at      timestamptz;
  v_trial_plan  uuid;
BEGIN
  -- Idempotência: se já existe subscription para o tenant, retorna o id
  SELECT id INTO v_existing_id
  FROM public.subscriptions
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  v_duration := public.trial_duration_days();
  v_end_at   := p_start_at + (v_duration || ' days')::interval;

  -- Tenta achar o plano "Free" para usar como referência
  SELECT id INTO v_trial_plan
  FROM public.subscription_plans
  WHERE tier = 'free' OR name ILIKE 'free%'
  LIMIT 1;

  INSERT INTO public.subscriptions (
    tenant_id, plan_id, plan_name, plan_tier, billing_type,
    amount, currency, status, is_trial,
    trial_start_date, trial_end_date,
    current_period_start, current_period_end,
    payment_provider, usage_limits, metadata
  )
  VALUES (
    p_tenant_id, v_trial_plan, 'Trial 45 dias', 'trial', 'monthly',
    0, 'BRL', 'trialing', true,
    p_start_at, v_end_at,
    p_start_at, v_end_at,
    'none',
    jsonb_build_object(
      'whatsapp_sessions', 1,
      'leads', 500,
      'users', 3,
      'agents', 5,
      'storage_mb', 1024
    ),
    jsonb_build_object('source', 'auto_signup', 'trial_days', v_duration)
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.create_trial_subscription(uuid, timestamptz) IS
  'Cria subscription trialing 45 dias para um tenant. Idempotente — só cria se ainda não existe.';

-- ----------------------------------------------------------------------------
-- 3) Estender handle_new_user para criar subscription trial automaticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  _tenant_id UUID;
  _has_admin BOOLEAN;
  _user_name TEXT;
  _user_email TEXT;
  _role TEXT;
  _slug TEXT;
  _is_new_tenant BOOLEAN := false;
BEGIN
  _user_email := COALESCE(NEW.email, '');
  _user_name := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    split_part(_user_email, '@', 1)
  );

  _slug := lower(regexp_replace(split_part(_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  IF _tenant_id IS NULL THEN
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_user_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;
    _is_new_tenant := true;
  END IF;

  INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
  VALUES (NEW.id, _user_name, _user_email, _tenant_id, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    email = EXCLUDED.email,
    tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'administrador')
      AND ur.ativo = true
      AND ur.user_id != NEW.id
  ) INTO _has_admin;

  _role := CASE WHEN _has_admin THEN 'viewer' ELSE 'admin' END;

  UPDATE public.profiles SET role = _role WHERE id = NEW.id;

  INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
  VALUES (NEW.id, _role, _tenant_id, true)
  ON CONFLICT DO NOTHING;

  -- Seed default AI agents — never block signup if this fails.
  BEGIN
    PERFORM public.seed_default_agents(_tenant_id, NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] seed_default_agents failed for tenant % user %: % — %',
      _tenant_id, NEW.id, SQLERRM, SQLSTATE;
  END;

  -- NOVO: cria subscription trialing 45d para tenants novos.
  -- Para usuários convidados (tenant_id veio em metadata), não cria — herda do tenant.
  IF _is_new_tenant THEN
    BEGIN
      PERFORM public.create_trial_subscription(_tenant_id, now());
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] create_trial_subscription failed for tenant %: % — %',
        _tenant_id, SQLERRM, SQLSTATE;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 4) RPC get_trial_status — consumida pelo frontend
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trial_status(p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
  v_sub       public.subscriptions%ROWTYPE;
  v_now       timestamptz := now();
  v_days_remaining integer;
  v_expired   boolean;
  v_status    text;
BEGIN
  -- Se não passar tenant_id, deriva do user logado
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
  ELSE
    v_tenant_id := p_tenant_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'is_trial', false,
      'expired', false,
      'status', 'no_tenant'
    );
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE tenant_id = v_tenant_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'is_trial', false,
      'expired', false,
      'status', 'no_subscription',
      'tenant_id', v_tenant_id
    );
  END IF;

  -- Calcula dias restantes (negativo se expirado)
  v_days_remaining := CASE
    WHEN v_sub.trial_end_date IS NULL THEN NULL
    ELSE GREATEST(0, EXTRACT(DAY FROM (v_sub.trial_end_date - v_now))::integer)
  END;

  v_expired := v_sub.is_trial = true
    AND v_sub.trial_end_date IS NOT NULL
    AND v_sub.trial_end_date < v_now;

  -- Status efetivo: 'trialing' | 'expired' | 'active' | 'canceled' | etc
  v_status := CASE
    WHEN v_expired THEN 'expired'
    WHEN v_sub.status IS NOT NULL THEN v_sub.status
    ELSE 'unknown'
  END;

  RETURN jsonb_build_object(
    'has_subscription', true,
    'subscription_id', v_sub.id,
    'tenant_id', v_tenant_id,
    'is_trial', COALESCE(v_sub.is_trial, false),
    'expired', v_expired,
    'status', v_status,
    'plan_tier', v_sub.plan_tier,
    'plan_name', v_sub.plan_name,
    'trial_start_date', v_sub.trial_start_date,
    'trial_end_date', v_sub.trial_end_date,
    'days_remaining', v_days_remaining,
    'usage_limits', v_sub.usage_limits,
    'restrictions', CASE
      WHEN v_expired THEN jsonb_build_object(
        'create_lead', false,
        'edit_lead', false,
        'create_processo', false,
        'edit_processo', false,
        'create_contrato', false,
        'edit_contrato', false,
        'send_whatsapp', false,
        'ai_responder', false,
        'create_agendamento', false,
        'create_documento', false,
        'view_data', true,
        'receive_whatsapp', true
      )
      ELSE jsonb_build_object(
        'create_lead', true,
        'edit_lead', true,
        'create_processo', true,
        'edit_processo', true,
        'create_contrato', true,
        'edit_contrato', true,
        'send_whatsapp', true,
        'ai_responder', true,
        'create_agendamento', true,
        'create_documento', true,
        'view_data', true,
        'receive_whatsapp', true
      )
    END
  );
END;
$$;

COMMENT ON FUNCTION public.get_trial_status(uuid) IS
  'Status do trial para o tenant. Frontend consome via supabase.rpc para banner + gate.';

GRANT EXECUTE ON FUNCTION public.get_trial_status(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5) Função expire_trials — para cron diário marcar trials expirados
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
  SET status = 'past_due',
      updated_at = now()
  WHERE is_trial = true
    AND status = 'trialing'
    AND trial_end_date IS NOT NULL
    AND trial_end_date < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_trials() IS
  'Marca subscriptions com trial expirado como past_due. Idempotente. Rodar diariamente.';

-- ----------------------------------------------------------------------------
-- 6) Backfill: 15 tenants existentes ganham 45 dias a partir de HOJE
-- ----------------------------------------------------------------------------
-- Isso evita expirar os 11 tenants criados antes de 2026-03-20 imediatamente.
-- Tenants 'enterprise' (Jurify Default) também recebem trial — não impacta porque
-- a coluna tenants.plano segue 'enterprise' e isso só vira fallback de subscription.
DO $backfill$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT t.id
    FROM public.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id
    )
  LOOP
    PERFORM public.create_trial_subscription(r.id, now());
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE '[trial backfill] criadas % subscriptions trialing', v_count;
END;
$backfill$;

-- ----------------------------------------------------------------------------
-- 7) RLS para subscriptions: usuários só veem subscription do próprio tenant
-- ----------------------------------------------------------------------------
DO $rls$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subs_select_own_tenant'
  ) THEN
    CREATE POLICY subs_select_own_tenant ON public.subscriptions
      FOR SELECT TO authenticated
      USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subs_service_role_all'
  ) THEN
    CREATE POLICY subs_service_role_all ON public.subscriptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $rls$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
