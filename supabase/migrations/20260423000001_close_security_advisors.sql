-- ============================================================================
-- Fechamento de security advisors WARN — 2026-04-23
-- ============================================================================
-- Remediações aplicadas:
--   1. function_search_path_mutable (70+ funções): SET search_path em todas as
--      funções do schema public que NÃO pertencem a extensões (pgvector/pg_net
--      ficam intocadas para não quebrar seus tipos/triggers).
--   2. public_bucket_allows_listing: remove a policy "Public Access" do bucket
--      `documents`. Bucket continua public=true, então URLs públicas
--      (/storage/v1/object/public/documents/...) seguem funcionando — só
--      bloqueia listObjects() anônimo.
--
-- Itens que NÃO são resolvíveis via SQL (fazer no Supabase Dashboard):
--   - auth_leaked_password_protection → Auth > Policies > toggle ON
--   - auth_otp_long_expiry → Auth > Email > OTP expiry = 3600
--   - vulnerable_postgres_version → Infrastructure > Upgrade Postgres
--   - extension_in_public (vector, pg_net) → NÃO mover; risk/reward ruim
--     (vector é tipo de coluna em várias tabelas; pg_net é chamado por
--     triggers/cron).
-- ============================================================================

-- 1. Fixa search_path em todas as funções da app (exclui funções de extensões)
DO $$
DECLARE
  r record;
  alter_count int := 0;
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    LEFT JOIN pg_depend d ON d.objid = p.oid
                          AND d.deptype = 'e'  -- extension dependency
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND d.objid IS NULL  -- exclude extension-owned functions
      AND (p.proconfig IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c
             WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_catalog',
      r.proname, r.args
    );
    alter_count := alter_count + 1;
  END LOOP;

  RAISE NOTICE 'Altered % functions with SET search_path', alter_count;
END $$;

-- 2. Remove policy que permite listing anônimo no bucket documents
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
