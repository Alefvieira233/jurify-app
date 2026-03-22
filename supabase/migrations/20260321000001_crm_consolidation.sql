-- ============================================
-- CRM Consolidation: FK constraints, tags unification, leads view
-- Fixes: departamento_id FK, responsavel legacy, crm_tags→tags merge
-- ============================================

-- ── 1. FK constraint: leads.departamento_id → departamentos.id ──

DO $$
BEGIN
  -- Add FK only if column exists and constraint doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'departamento_id')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_name = 'leads' AND tc.constraint_type = 'FOREIGN KEY'
         AND ccu.column_name = 'departamento_id'
     )
  THEN
    -- First, null out any orphan departamento_id values that don't reference valid departments
    UPDATE public.leads
    SET departamento_id = NULL
    WHERE departamento_id IS NOT NULL
      AND departamento_id::uuid NOT IN (SELECT id FROM public.departamentos);

    ALTER TABLE public.leads
      ADD CONSTRAINT fk_leads_departamento
      FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. FK constraint: leads.conexao_id → conexoes_whatsapp.id ──

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'conexao_id')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_name = 'leads' AND tc.constraint_type = 'FOREIGN KEY'
         AND ccu.column_name = 'conexao_id'
     )
  THEN
    UPDATE public.leads
    SET conexao_id = NULL
    WHERE conexao_id IS NOT NULL
      AND conexao_id::uuid NOT IN (SELECT id FROM public.conexoes_whatsapp);

    ALTER TABLE public.leads
      ADD CONSTRAINT fk_leads_conexao
      FOREIGN KEY (conexao_id) REFERENCES public.conexoes_whatsapp(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 3. Consolidate crm_tags → tags ──
-- Migrate any crm_tags data that doesn't already exist in tags

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tags' AND table_schema = 'public') THEN
    -- Insert crm_tags into tags (only if not duplicate by tenant+name)
    INSERT INTO public.tags (tenant_id, nome, cor, categoria, ordem, ativo)
    SELECT ct.tenant_id, ct.name, ct.color, 'operacional', 0, true
    FROM public.crm_tags ct
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.tenant_id = ct.tenant_id AND t.nome = ct.name
    );
  END IF;
END $$;

-- ── 4. Consolidate crm_lead_tags → lead_tags ──

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_lead_tags' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tags' AND table_schema = 'public')
  THEN
    -- Map crm_lead_tags to the new tags table and insert into lead_tags
    INSERT INTO public.lead_tags (lead_id, tag_id)
    SELECT clt.lead_id, t.id
    FROM public.crm_lead_tags clt
    JOIN public.crm_tags ct ON ct.id = clt.tag_id
    JOIN public.tags t ON t.tenant_id = ct.tenant_id AND t.nome = ct.name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_tags lt
      WHERE lt.lead_id = clt.lead_id AND lt.tag_id = t.id
    );
  END IF;
END $$;

-- ── 5. Create operational view for leads with JOINs ──

CREATE OR REPLACE VIEW public.v_leads_operacional AS
SELECT
  l.*,
  d.nome        AS departamento_nome,
  d.cor         AS departamento_cor,
  p.nome_completo AS responsavel_nome,
  p.email       AS responsavel_email,
  p.avatar_url  AS responsavel_avatar,
  c.nome        AS conexao_nome,
  c.telefone    AS conexao_telefone,
  ps.name       AS pipeline_stage_name,
  ps.color      AS pipeline_stage_color
FROM public.leads l
LEFT JOIN public.departamentos d ON d.id = l.departamento_id
LEFT JOIN public.profiles p ON p.id = l.responsavel_id
LEFT JOIN public.conexoes_whatsapp c ON c.id = l.conexao_id
LEFT JOIN public.crm_pipeline_stages ps ON ps.id = l.pipeline_stage_id;

-- ── 6. Indexes for the view's JOINs (idempotent) ──

CREATE INDEX IF NOT EXISTS idx_leads_responsavel_id ON public.leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_leads_conexao_id ON public.leads(conexao_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage_id ON public.leads(pipeline_stage_id);

-- ── 7. RLS for the view (inherits from leads table) ──
-- Views inherit RLS from their base tables in Supabase, no extra policy needed.

-- ── 8. Clean up legacy: remove responsavel_nome from metadata where responsavel_id is set ──

UPDATE public.leads
SET metadata = metadata - 'responsavel_nome'
WHERE metadata ? 'responsavel_nome'
  AND responsavel_id IS NOT NULL;
