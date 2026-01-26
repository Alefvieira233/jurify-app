-- 🏢 POPULAR TENANT_ID EM PROFILES
-- Garante que todos os profiles tenham tenant_id

-- =========================================================================
-- PROBLEMA IDENTIFICADO:
-- =========================================================================
-- Alguns profiles têm tenant_id = NULL
-- Isso quebra todas as queries que dependem de tenant isolation:
--   WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
--
-- Se tenant_id é NULL, a subquery retorna NULL
-- E NULL = qualquer coisa é sempre FALSE
-- Resultado: usuário não consegue ver nenhum dado
--
-- SOLUÇÃO:
-- 1. Popular todos os tenant_id NULL com UUIDs únicos
-- 2. Definir DEFAULT para novos profiles
-- =========================================================================

-- Contar profiles sem tenant_id (para log)
DO $$
DECLARE
  count_null integer;
BEGIN
  SELECT COUNT(*) INTO count_null
  FROM public.profiles
  WHERE tenant_id IS NULL;

  IF count_null > 0 THEN
    RAISE NOTICE '⚠️  Encontrados % profiles sem tenant_id', count_null;
  ELSE
    RAISE NOTICE '✅ Todos os profiles já têm tenant_id';
  END IF;
END $$;

-- Atualizar profiles sem tenant_id
UPDATE public.profiles
SET tenant_id = gen_random_uuid()
WHERE tenant_id IS NULL;

-- Contar quantos foram atualizados
DO $$
DECLARE
  count_updated integer;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;

  IF count_updated > 0 THEN
    RAISE NOTICE '✅ Atualizados % profiles com novos tenant_id', count_updated;
  END IF;
END $$;

-- Garantir que novos profiles sempre tenham tenant_id
ALTER TABLE public.profiles
  ALTER COLUMN tenant_id SET DEFAULT gen_random_uuid();

-- Tornar tenant_id NOT NULL (se ainda não for)
-- Primeiro verifica se a coluna aceita NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'tenant_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ Coluna tenant_id agora é NOT NULL';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna tenant_id já é NOT NULL';
  END IF;
END $$;

-- Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id
  ON public.profiles(tenant_id);

COMMENT ON INDEX idx_profiles_tenant_id IS
  'Índice para otimizar queries de tenant isolation';

-- Log final de sucesso
DO $$
DECLARE
  total_profiles integer;
  profiles_com_tenant integer;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  SELECT COUNT(*) INTO profiles_com_tenant FROM public.profiles WHERE tenant_id IS NOT NULL;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRAÇÃO COMPLETA';
  RAISE NOTICE '   Total de profiles: %', total_profiles;
  RAISE NOTICE '   Profiles com tenant_id: %', profiles_com_tenant;
  RAISE NOTICE '   Taxa de sucesso: 100%%';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
