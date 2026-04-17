-- ============================================================================
-- VACUUM ANALYZE — recuperar espaço de 8 tabelas com dead_tuples > 10
-- ============================================================================
-- Por que: pg_stat_user_tables mostrou tabelas com ratio dead/live alto:
--   whatsapp_conversations, conexoes_whatsapp (1 live / 24 dead = 96%)
--   rate_limits (13 live / 35 dead = 73%)
--   configuracoes_integracoes (3 live / 33 dead = 92%)
--   system_settings (2 live / 18 dead = 90%)
--   audit_log (233 dead), whatsapp_messages (130 dead), leads (53 dead)
--
-- VACUUM ANALYZE é safe em prod (não bloqueia writes). VACUUM FULL causaria
-- AccessExclusive lock e NÃO é usado aqui.
--
-- NOTA OPERACIONAL:
--   VACUUM NÃO pode rodar dentro de transação. Esta migration foi executada
--   com sucesso via Supabase Management API em 2026-04-17 (cada statement
--   roda autônomo). Resultado: tables_high_bloat caiu de 2 → 0.
--
--   Se precisar reexecutar via `supabase db push`, pode falhar com erro
--   "VACUUM cannot run inside a transaction block". Neste caso, rodar
--   manualmente via psql/supabase CLI ou via Management API:
--     curl -X POST https://api.supabase.com/v1/projects/$REF/database/query \
--       -H "Authorization: Bearer $TOKEN" \
--       -d '{"query":"VACUUM ANALYZE public.<table>;"}'
--
--   Alternativa: usar o script scripts/db-maintenance.cjs que lê DATABASE_URL
--   e roda VACUUM fora de transação.
-- ============================================================================

-- Nota: Este bloco é idempotente e documental. As VACUUMs já foram
-- executadas em 2026-04-17. Postgres autovacuum daqui pra frente mantém
-- as tabelas saudáveis.

-- Deixa os autovacuum thresholds mais agressivos pras 5 tabelas mais bloated,
-- pra evitar que voltem a acumular dead tuples desproporcionais ao volume.
-- ratio default é 0.2 (20%), abaixamos pra 0.05 em tabelas pequenas onde
-- poucos UPDATEs já representam alta proporção.
ALTER TABLE IF EXISTS public.whatsapp_conversations
  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE IF EXISTS public.conexoes_whatsapp
  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE IF EXISTS public.rate_limits
  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE IF EXISTS public.configuracoes_integracoes
  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE IF EXISTS public.system_settings
  SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);
