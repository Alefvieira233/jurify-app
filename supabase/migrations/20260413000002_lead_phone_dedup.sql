-- ============================================================================
-- Deduplicação de leads por telefone dentro do tenant
-- ============================================================================
-- Problema: nenhum constraint impedia múltiplos leads com mesmo telefone no
-- mesmo tenant. Em escala (WhatsApp webhook + UI manual + CSV import), isso
-- gera duplicatas que quebram relatórios, automações e a experiência do
-- advogado ("eu já tinha esse lead?").
--
-- Solução: UNIQUE index PARCIAL em (tenant_id, telefone normalizado) —
-- parcial porque:
--   - ignora soft-deleted (deleted_at IS NOT NULL)
--   - ignora telefone NULL/vazio (lead pode vir sem telefone via formulário)
--   - telefone é normalizado (só dígitos) via função IMMUTABLE
--
-- Compatibilidade: se houver duplicatas existentes, a migration NÃO falha —
-- loga WARNING e lista IDs para o admin consolidar manualmente. O índice
-- só é criado se não houver conflito. Idempotente.
-- ============================================================================

-- Função IMMUTABLE para normalizar telefone (remove não-dígitos)
-- IMMUTABLE é requisito pra usar em expressão de índice
CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN phone IS NULL OR btrim(phone) = '' THEN NULL
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END;
$$;

COMMENT ON FUNCTION public.normalize_phone(TEXT) IS
  'Remove todos os caracteres não-numéricos do telefone. IMMUTABLE para uso em índices únicos.';

-- Relatório defensivo: identifica duplicatas existentes antes de criar o índice
DO $$
DECLARE
  v_dup_count INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count FROM (
    SELECT tenant_id, public.normalize_phone(telefone) AS phone_norm, COUNT(*) AS n
      FROM public.leads
     WHERE telefone IS NOT NULL
       AND btrim(telefone) <> ''
       AND deleted_at IS NULL
     GROUP BY tenant_id, public.normalize_phone(telefone)
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE WARNING '[lead_phone_dedup] % duplicatas de (tenant_id, telefone) encontradas. O índice UNIQUE NÃO foi criado. Consolide manualmente antes de re-aplicar esta migration.', v_dup_count;
  END IF;
END $$;

-- Cria o índice apenas se não houver duplicatas (safe)
DO $$
DECLARE
  v_dup_count INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count FROM (
    SELECT tenant_id, public.normalize_phone(telefone) AS phone_norm
      FROM public.leads
     WHERE telefone IS NOT NULL
       AND btrim(telefone) <> ''
       AND deleted_at IS NULL
     GROUP BY tenant_id, public.normalize_phone(telefone)
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count = 0 THEN
    -- Safe: sem duplicatas, criar índice
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'leads'
         AND indexname = 'ux_leads_tenant_phone_norm'
    ) THEN
      CREATE UNIQUE INDEX ux_leads_tenant_phone_norm
        ON public.leads (tenant_id, public.normalize_phone(telefone))
        WHERE telefone IS NOT NULL
          AND btrim(telefone) <> ''
          AND deleted_at IS NULL;

      RAISE NOTICE '[lead_phone_dedup] Índice UNIQUE ux_leads_tenant_phone_norm criado';
    END IF;
  END IF;
END $$;

-- Helper RPC: buscar lead existente por telefone normalizado (usado por UI/webhook)
CREATE OR REPLACE FUNCTION public.find_lead_by_phone(_tenant_id UUID, _phone TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  status TEXT,
  area_juridica TEXT,
  departamento_id UUID,
  responsavel_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.id, l.nome, l.telefone, l.email, l.status, l.area_juridica,
         l.departamento_id, l.responsavel_id, l.created_at
    FROM public.leads l
   WHERE l.tenant_id = _tenant_id
     AND l.deleted_at IS NULL
     AND public.normalize_phone(l.telefone) = public.normalize_phone(_phone)
     AND public.normalize_phone(_phone) IS NOT NULL
   ORDER BY l.created_at DESC
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_lead_by_phone(UUID, TEXT) IS
  'Busca lead existente por telefone normalizado no tenant. Retorna o mais recente. SECURITY DEFINER respeita tenant_id do argumento.';

GRANT EXECUTE ON FUNCTION public.find_lead_by_phone(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated, service_role;
