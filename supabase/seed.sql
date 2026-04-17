-- ============================================================================
-- Jurify — Canonical seed for local dev (`supabase db reset`)
-- ============================================================================
-- Supabase CLI loads this after migrations. Prod NÃO deve rodar este arquivo —
-- seeds equivalentes já foram aplicados via migrations (00004, 00008, 00014,
-- 00021) e não devem ser re-executados contra dados reais.
--
-- O que este arquivo faz:
--   1. Catálogo de subscription_plans (free/pro/enterprise)
--   2. Feature flags base (incluindo automation_engine, agendado off)
--   3. Slash commands globais (templates de IA)
--
-- Todos são ON CONFLICT DO NOTHING — seguro re-executar.
-- ============================================================================

-- ── Subscription plans ────────────────────────────────────────────────────
-- Garante UNIQUE em tier (migrations produção criam isso em 00004)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_tier_key') THEN
    ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_tier_key UNIQUE (tier);
  END IF;
END $$;

INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  features, limits, ativo
) VALUES
  ('free', 'Gratuito', 'Plano de entrada para conhecer a plataforma.',
    0, 0, NULL, NULL,
    '["50 chamadas IA/mês", "1 usuário", "Suporte comunitário"]'::jsonb,
    '{"ai_calls_per_month": 50, "users": 1, "leads": 100}'::jsonb, true),
  ('pro', 'Pro', 'Para escritórios em crescimento que precisam de IA produtiva no WhatsApp.',
    19900, 199000, 'price_PLACEHOLDER_PRO', 'price_PLACEHOLDER_PRO_YEARLY',
    '["500 chamadas IA/mês", "WhatsApp IA integrado", "5 usuários", "Suporte por email"]'::jsonb,
    '{"ai_calls_per_month": 500, "users": 5, "leads": 5000}'::jsonb, true),
  ('enterprise', 'Enterprise', 'Para escritórios estabelecidos que precisam de capacidade ilimitada e SLA.',
    99900, 999000, 'price_PLACEHOLDER_ENTERPRISE', 'price_PLACEHOLDER_ENTERPRISE_YEARLY',
    '["Ilimitado de chamadas IA", "Multi-canal", "Usuários ilimitados", "SLA + suporte dedicado"]'::jsonb,
    '{"ai_calls_per_month": -1, "users": -1, "leads": -1}'::jsonb, true)
ON CONFLICT (tier) DO NOTHING;

-- ── Feature flags ─────────────────────────────────────────────────────────
INSERT INTO public.features (name, descricao, enabled, rollout_pct) VALUES
  ('whatsapp_ai_autonomous_scheduling', 'Agente IA agenda reuniões autonomamente via WhatsApp', true, 100),
  ('lead_auto_qualify_on_agendamento', 'Trigger de auto-qualificação pós agendamento', true, 100),
  ('dynamic_department_routing', 'Re-roteia depto do lead conforme área detectada na conversa', true, 100),
  ('whatsapp_auto_followup', 'Follow-up automático para leads inativos', false, 0),
  ('dashboard_materialized_views', 'Dashboard servido por MVs (mais rápido, menos fresh)', false, 0),
  ('automation_engine', 'Motor visual de automações — fluxos e regras. Off até primeiro tenant ativar.', false, 0)
ON CONFLICT (name) DO NOTHING;

-- ── Slash commands globais ────────────────────────────────────────────────
-- Templates globais (tenant_id IS NULL). Tenants podem criar os próprios que
-- sobrescrevem via RLS. Schema definido em 20260417000008_slash_commands_table.sql.
-- Se sua migration já seeda globals, este INSERT é no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='slash_commands'
  ) THEN
    INSERT INTO public.slash_commands (tenant_id, slug, label, prompt_template, enabled)
    VALUES
      (NULL, 'resumir', 'Resumir',
       'Resuma a conversa abaixo em até 3 frases objetivas, focando em pedido do cliente, status atual e próximo passo.', true),
      (NULL, 'extrair-dados', 'Extrair Dados',
       'Extraia nome, CPF, telefone, email e área jurídica mencionados. Retorne JSON.', true),
      (NULL, 'sugerir-resposta', 'Sugerir Resposta',
       'Sugira uma resposta profissional e empática para continuar a conversa em português brasileiro.', true)
    ON CONFLICT (tenant_id, slug) DO NOTHING;
  END IF;
END $$;
