-- ============================================================================
-- DEB-013: Unify Tag System
-- ============================================================================
-- Problem: 3 parallel tag systems exist:
--   1. tags + lead_tags (junction) — canonical, Portuguese columns
--   2. crm_tags + crm_lead_tags — CRM-specific, English columns
--   3. leads.tags[] — text array column on leads
--
-- Solution:
--   - Migrate remaining crm_tags data → tags (idempotent, skips duplicates)
--   - Migrate crm_lead_tags → lead_tags (idempotent, skips duplicates)
--   - Backfill leads.tags[] text array into lead_tags junction entries
--   - Make crm_tags and crm_lead_tags read-only via RLS (deny mutations)
--   - NOTE: crm_tags and crm_lead_tags can be DROPPED in v1.4 after verification
-- ============================================================================

-- ── 1. Migrate crm_tags → tags (idempotent) ──
-- Previous migration 20260321000001 already did this, but we re-run
-- to catch any data added after that migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_tags' AND table_schema = 'public'
  ) THEN
    INSERT INTO public.tags (tenant_id, nome, cor, categoria, ordem, ativo)
    SELECT ct.tenant_id, ct.name, COALESCE(ct.color, '#6B7280'), 'crm', 0, true
    FROM public.crm_tags ct
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.tenant_id = ct.tenant_id AND t.nome = ct.name
    );
    RAISE NOTICE 'DEB-013: crm_tags → tags migration complete';
  END IF;
END $$;

-- ── 2. Migrate crm_lead_tags → lead_tags (idempotent) ──

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_lead_tags' AND table_schema = 'public'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_tags' AND table_schema = 'public'
  )
  THEN
    INSERT INTO public.lead_tags (lead_id, tag_id)
    SELECT clt.lead_id, t.id
    FROM public.crm_lead_tags clt
    JOIN public.crm_tags ct ON ct.id = clt.tag_id
    JOIN public.tags t ON t.tenant_id = ct.tenant_id AND t.nome = ct.name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_tags lt
      WHERE lt.lead_id = clt.lead_id AND lt.tag_id = t.id
    );
    RAISE NOTICE 'DEB-013: crm_lead_tags → lead_tags migration complete';
  END IF;
END $$;

-- ── 3. Backfill leads.tags[] text array into lead_tags junction ──
-- For each lead that has tags in the text array, find or skip matching
-- tag entries in the tags table and create lead_tags entries.

DO $$
BEGIN
  INSERT INTO public.lead_tags (lead_id, tag_id)
  SELECT l.id, t.id
  FROM public.leads l
  CROSS JOIN LATERAL unnest(l.tags) AS tag_name
  JOIN public.tags t ON t.tenant_id = l.tenant_id AND t.nome = tag_name
  WHERE l.tags IS NOT NULL
    AND array_length(l.tags, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_tags lt
      WHERE lt.lead_id = l.id AND lt.tag_id = t.id
    );

  -- Also create any tags from leads.tags[] that don't exist yet in the tags table
  INSERT INTO public.tags (tenant_id, nome, cor, categoria, ordem, ativo)
  SELECT DISTINCT l.tenant_id, tag_name, '#6B7280', 'lead', 0, true
  FROM public.leads l
  CROSS JOIN LATERAL unnest(l.tags) AS tag_name
  WHERE l.tags IS NOT NULL
    AND array_length(l.tags, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.tenant_id = l.tenant_id AND t.nome = tag_name
    );

  -- Now backfill the newly-created tags into lead_tags
  INSERT INTO public.lead_tags (lead_id, tag_id)
  SELECT l.id, t.id
  FROM public.leads l
  CROSS JOIN LATERAL unnest(l.tags) AS tag_name
  JOIN public.tags t ON t.tenant_id = l.tenant_id AND t.nome = tag_name
  WHERE l.tags IS NOT NULL
    AND array_length(l.tags, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_tags lt
      WHERE lt.lead_id = l.id AND lt.tag_id = t.id
    );

  RAISE NOTICE 'DEB-013: leads.tags[] → lead_tags backfill complete';
END $$;

-- ── 4. Make crm_tags read-only via RLS ──
-- Drop existing mutation policies and create DENY policies.
-- SELECT policies are preserved so existing reads don't break.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_tags' AND table_schema = 'public'
  ) THEN
    -- Drop existing mutation policies
    DROP POLICY IF EXISTS "crm_tags_insert" ON public.crm_tags;
    DROP POLICY IF EXISTS "crm_tags_update" ON public.crm_tags;
    DROP POLICY IF EXISTS "crm_tags_delete" ON public.crm_tags;

    -- Create deny-all mutation policies
    -- DEPRECATED: This table is read-only. Use 'tags' table instead.
    -- Can be dropped in v1.4 after verification.
    CREATE POLICY "crm_tags_insert_denied" ON public.crm_tags
      FOR INSERT WITH CHECK (false);

    CREATE POLICY "crm_tags_update_denied" ON public.crm_tags
      FOR UPDATE USING (false);

    CREATE POLICY "crm_tags_delete_denied" ON public.crm_tags
      FOR DELETE USING (false);

    COMMENT ON TABLE public.crm_tags IS
      'DEPRECATED (DEB-013): Read-only. Data migrated to public.tags. Drop in v1.4 after verification.';

    RAISE NOTICE 'DEB-013: crm_tags made read-only';
  END IF;
END $$;

-- ── 5. Make crm_lead_tags read-only via RLS ──

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_lead_tags' AND table_schema = 'public'
  ) THEN
    -- Drop existing mutation policies
    DROP POLICY IF EXISTS "crm_lead_tags_insert" ON public.crm_lead_tags;
    DROP POLICY IF EXISTS "crm_lead_tags_update" ON public.crm_lead_tags;
    DROP POLICY IF EXISTS "crm_lead_tags_delete" ON public.crm_lead_tags;

    -- Create deny-all mutation policies
    -- DEPRECATED: This table is read-only. Use 'lead_tags' table instead.
    -- Can be dropped in v1.4 after verification.
    CREATE POLICY "crm_lead_tags_insert_denied" ON public.crm_lead_tags
      FOR INSERT WITH CHECK (false);

    CREATE POLICY "crm_lead_tags_update_denied" ON public.crm_lead_tags
      FOR UPDATE USING (false);

    CREATE POLICY "crm_lead_tags_delete_denied" ON public.crm_lead_tags
      FOR DELETE USING (false);

    COMMENT ON TABLE public.crm_lead_tags IS
      'DEPRECATED (DEB-013): Read-only. Data migrated to public.lead_tags. Drop in v1.4 after verification.';

    RAISE NOTICE 'DEB-013: crm_lead_tags made read-only';
  END IF;
END $$;

-- ── 6. Add comment on leads.tags column ──
COMMENT ON COLUMN public.leads.tags IS
  'DEPRECATED (DEB-013): Use lead_tags junction table instead. This column will be removed in v1.4.';
