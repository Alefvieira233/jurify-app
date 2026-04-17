-- ============================================================================
-- Feature flag: automation_engine (motor visual de fluxos/regras)
-- ============================================================================
-- Por que: as 9 tabelas automation_* (flows, nodes, edges, rules, conditions,
-- actions, executions, tasks + workflow_jobs) estão com 0 rows há meses. A
-- feature foi construída mas nenhum tenant a usou ainda.
--
-- Em vez de dropar (destrutivo, custo irreversível), escondemos por feature
-- flag. Tenants interessados podem ativar via feature_overrides. O custo de
-- manter 9 tabelas vazias é marginal (~50KB de catálogo).
--
-- UI: FluxosManager.tsx e RegrasManager.tsx checam useFeatureFlag('automation_engine')
-- e mostram EmptyState "Feature não ativada" se off. Nenhuma query dispara —
-- poupa roundtrip e evita propagar o vazio pra tenants sem uso.
--
-- Schema de features (migration 20260413000003):
--   features(name UNIQUE, descricao, enabled, rollout_pct)
-- Note: campo é `name` (não `key`) e `descricao` (não `description`). Verificado
-- via information_schema em 2026-04-17.
-- ============================================================================

INSERT INTO public.features (name, descricao, enabled, rollout_pct)
VALUES (
  'automation_engine',
  'Motor visual de automações — fluxos (FluxosManager) e regras (RegrasManager). Desligado por default até primeiro tenant pedir ativação.',
  false,
  0
)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.automation_flows IS
  'Motor de automação — gated por feature flag automation_engine (off por default). Tabela preservada pra quando primeiro tenant ativar.';
