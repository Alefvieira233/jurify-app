-- =============================================================================
-- CRM Professional Migration
-- Transforms the basic leads system into a full-featured CRM
-- =============================================================================

-- =============================================================================
-- 1. crm_pipeline_stages - Custom pipeline stages per tenant
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  auto_followup_days INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- =============================================================================
-- 2. crm_tags - Tags for leads
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  UNIQUE(tenant_id, name)
);

-- =============================================================================
-- 3. crm_lead_tags - Many-to-many leads <> tags
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_lead_tags (
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY(lead_id, tag_id)
);

-- =============================================================================
-- 4. crm_activities - Activity log for leads
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'call', 'email', 'meeting', 'note', 'whatsapp', 'task',
    'status_change', 'followup_scheduled', 'followup_completed',
    'document_sent', 'proposal_sent'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. crm_followups - Professional follow-up system
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  followup_type TEXT NOT NULL CHECK (followup_type IN (
    'call', 'email', 'whatsapp', 'meeting', 'task', 'auto'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'cancelled', 'overdue', 'snoozed'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  reminder_minutes INTEGER DEFAULT 30,
  recurrence_rule TEXT,
  recurrence_end_at TIMESTAMPTZ,
  auto_message_template TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. crm_lead_scores - Lead scoring history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_lead_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_factors JSONB NOT NULL DEFAULT '{}',
  scored_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 7. crm_custom_fields - Custom fields definition per tenant
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'number', 'date', 'select', 'multiselect',
    'boolean', 'url', 'email', 'phone'
  )),
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  UNIQUE(tenant_id, field_name)
);

-- =============================================================================
-- 8. crm_lead_custom_values - Custom field values
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_lead_custom_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(lead_id, field_id)
);

-- =============================================================================
-- 9. Add CRM columns to existing leads table
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_score'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN lead_score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'pipeline_stage_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN pipeline_stage_id UUID REFERENCES public.crm_pipeline_stages(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'temperature'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN temperature TEXT DEFAULT 'warm' CHECK (temperature IN ('cold', 'warm', 'hot'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'expected_value'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN expected_value NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'probability'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN lost_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'won_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN won_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN lost_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN last_activity_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'next_followup_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN next_followup_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'followup_count'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN followup_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN company_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'cpf_cnpj'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN cpf_cnpj TEXT;
  END IF;
END $$;

-- =============================================================================
-- 10. Indexes
-- =============================================================================

-- crm_pipeline_stages indexes
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_tenant
  ON public.crm_pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_tenant_position
  ON public.crm_pipeline_stages(tenant_id, position);

-- crm_tags indexes
CREATE INDEX IF NOT EXISTS idx_crm_tags_tenant
  ON public.crm_tags(tenant_id);

-- crm_lead_tags indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_lead
  ON public.crm_lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_tag
  ON public.crm_lead_tags(tag_id);

-- crm_activities indexes
CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant
  ON public.crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead
  ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_user
  ON public.crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type
  ON public.crm_activities(tenant_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_created
  ON public.crm_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scheduled
  ON public.crm_activities(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND completed_at IS NULL;

-- crm_followups indexes
CREATE INDEX IF NOT EXISTS idx_crm_followups_tenant
  ON public.crm_followups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_lead
  ON public.crm_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_assigned
  ON public.crm_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_followups_status
  ON public.crm_followups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_followups_pending_scheduled
  ON public.crm_followups(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_crm_followups_overdue_candidates
  ON public.crm_followups(tenant_id, scheduled_at)
  WHERE status = 'pending';

-- crm_lead_scores indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_tenant
  ON public.crm_lead_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_lead
  ON public.crm_lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_lead_latest
  ON public.crm_lead_scores(lead_id, created_at DESC);

-- crm_custom_fields indexes
CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_tenant
  ON public.crm_custom_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_tenant_position
  ON public.crm_custom_fields(tenant_id, position);

-- crm_lead_custom_values indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_custom_values_lead
  ON public.crm_lead_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_custom_values_field
  ON public.crm_lead_custom_values(field_id);

-- leads table new column indexes
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage
  ON public.leads(pipeline_stage_id)
  WHERE pipeline_stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_temperature
  ON public.leads(tenant_id, temperature)
  WHERE temperature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lead_score
  ON public.leads(tenant_id, lead_score DESC)
  WHERE lead_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_followup
  ON public.leads(next_followup_at)
  WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_activity
  ON public.leads(tenant_id, last_activity_at DESC)
  WHERE last_activity_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company_name
  ON public.leads(tenant_id, company_name)
  WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_cpf_cnpj
  ON public.leads(cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

-- =============================================================================
-- 11. Enable RLS on all new tables
-- =============================================================================

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_custom_values ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 12. RLS Policies - using has_permission() and tenant isolation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- crm_pipeline_stages policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_pipeline_stages_select" ON public.crm_pipeline_stages
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_pipeline_stages_insert" ON public.crm_pipeline_stages
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'pipeline', 'update')
);

CREATE POLICY "crm_pipeline_stages_update" ON public.crm_pipeline_stages
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'pipeline', 'update')
);

CREATE POLICY "crm_pipeline_stages_delete" ON public.crm_pipeline_stages
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'pipeline', 'update')
);

-- ---------------------------------------------------------------------------
-- crm_tags policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_tags_select" ON public.crm_tags
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_tags_insert" ON public.crm_tags
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_tags_update" ON public.crm_tags
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_tags_delete" ON public.crm_tags
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- crm_lead_tags policies (join table - uses lead's tenant via lead_id)
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_lead_tags_select" ON public.crm_lead_tags
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "crm_lead_tags_insert" ON public.crm_lead_tags
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_lead_tags_delete" ON public.crm_lead_tags
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

-- ---------------------------------------------------------------------------
-- crm_activities policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_activities_select" ON public.crm_activities
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_activities_insert" ON public.crm_activities
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_activities_update" ON public.crm_activities
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_activities_delete" ON public.crm_activities
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- crm_followups policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_followups_select" ON public.crm_followups
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_followups_insert" ON public.crm_followups
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_followups_update" ON public.crm_followups
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_followups_delete" ON public.crm_followups
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- crm_lead_scores policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_lead_scores_select" ON public.crm_lead_scores
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_lead_scores_insert" ON public.crm_lead_scores
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_lead_scores_delete" ON public.crm_lead_scores
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- crm_custom_fields policies
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_custom_fields_select" ON public.crm_custom_fields
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "crm_custom_fields_insert" ON public.crm_custom_fields
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'configuracoes', 'update')
);

CREATE POLICY "crm_custom_fields_update" ON public.crm_custom_fields
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'configuracoes', 'update')
);

CREATE POLICY "crm_custom_fields_delete" ON public.crm_custom_fields
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'configuracoes', 'update')
);

-- ---------------------------------------------------------------------------
-- crm_lead_custom_values policies (uses lead's tenant via lead_id)
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_lead_custom_values_select" ON public.crm_lead_custom_values
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "crm_lead_custom_values_insert" ON public.crm_lead_custom_values
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_lead_custom_values_update" ON public.crm_lead_custom_values
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "crm_lead_custom_values_delete" ON public.crm_lead_custom_values
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

-- =============================================================================
-- 13. Auto-set tenant_id triggers for new CRM tables
-- =============================================================================

DROP TRIGGER IF EXISTS set_tenant_id_crm_pipeline_stages ON public.crm_pipeline_stages;
CREATE TRIGGER set_tenant_id_crm_pipeline_stages
  BEFORE INSERT ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_crm_tags ON public.crm_tags;
CREATE TRIGGER set_tenant_id_crm_tags
  BEFORE INSERT ON public.crm_tags
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_crm_activities ON public.crm_activities;
CREATE TRIGGER set_tenant_id_crm_activities
  BEFORE INSERT ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_crm_followups ON public.crm_followups;
CREATE TRIGGER set_tenant_id_crm_followups
  BEFORE INSERT ON public.crm_followups
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_crm_lead_scores ON public.crm_lead_scores;
CREATE TRIGGER set_tenant_id_crm_lead_scores
  BEFORE INSERT ON public.crm_lead_scores
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_crm_custom_fields ON public.crm_custom_fields;
CREATE TRIGGER set_tenant_id_crm_custom_fields
  BEFORE INSERT ON public.crm_custom_fields
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- =============================================================================
-- 14. Seed default pipeline stages for all existing tenants
-- =============================================================================

INSERT INTO public.crm_pipeline_stages (tenant_id, name, slug, color, position, is_won, is_lost, auto_followup_days)
SELECT t.id, s.name, s.slug, s.color, s.position, s.is_won, s.is_lost, s.auto_followup_days
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('Novo Lead',           'novo_lead',          '#3B82F6', 0, false, false, 3),
    ('Em Qualificacao',     'em_qualificacao',     '#F59E0B', 1, false, false, 2),
    ('Analise Juridica',    'analise_juridica',    '#8B5CF6', 2, false, false, 5),
    ('Proposta Enviada',    'proposta_enviada',    '#A855F7', 3, false, false, 3),
    ('Negociacao',          'negociacao',          '#EC4899', 4, false, false, 2),
    ('Contrato Assinado',   'contrato_assinado',   '#10B981', 5, true,  false, NULL::INTEGER),
    ('Em Atendimento',      'em_atendimento',      '#06B6D4', 6, false, false, 7),
    ('Perdido',             'perdido',             '#EF4444', 7, false, true,  NULL::INTEGER)
) AS s(name, slug, color, position, is_won, is_lost, auto_followup_days)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- =============================================================================
-- 15. Helper functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- update_lead_last_activity() - Trigger function for crm_activities
-- Updates leads.last_activity_at whenever a new activity is inserted
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_lead_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET last_activity_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_lead_last_activity IS
  'Trigger function: updates leads.last_activity_at when a crm_activities row is inserted.';

DROP TRIGGER IF EXISTS trg_update_lead_last_activity ON public.crm_activities;
CREATE TRIGGER trg_update_lead_last_activity
  AFTER INSERT ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_activity();

-- ---------------------------------------------------------------------------
-- auto_schedule_followup() - Creates a follow-up when lead moves to a stage
-- with auto_followup_days configured
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_schedule_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage RECORD;
  v_tenant_id UUID;
BEGIN
  -- Only act when pipeline_stage_id changes
  IF NEW.pipeline_stage_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD IS NOT NULL AND OLD.pipeline_stage_id IS NOT DISTINCT FROM NEW.pipeline_stage_id THEN
    RETURN NEW;
  END IF;

  -- Get stage details
  SELECT * INTO v_stage
  FROM public.crm_pipeline_stages
  WHERE id = NEW.pipeline_stage_id;

  IF v_stage IS NULL OR v_stage.auto_followup_days IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine tenant_id
  v_tenant_id := COALESCE(NEW.tenant_id, v_stage.tenant_id);

  -- Create automatic follow-up
  INSERT INTO public.crm_followups (
    tenant_id,
    lead_id,
    created_by,
    assigned_to,
    title,
    followup_type,
    status,
    priority,
    scheduled_at,
    metadata
  ) VALUES (
    v_tenant_id,
    NEW.id,
    auth.uid(),
    COALESCE(NEW.responsavel_id, auth.uid()),
    'Follow-up automatico: ' || v_stage.name,
    'auto',
    'pending',
    'medium',
    now() + (v_stage.auto_followup_days || ' days')::INTERVAL,
    jsonb_build_object(
      'auto_generated', true,
      'stage_id', v_stage.id,
      'stage_name', v_stage.name
    )
  );

  -- Update next_followup_at on the lead
  NEW.next_followup_at := now() + (v_stage.auto_followup_days || ' days')::INTERVAL;
  NEW.followup_count := COALESCE(NEW.followup_count, 0) + 1;

  -- Log the activity
  INSERT INTO public.crm_activities (
    tenant_id,
    lead_id,
    user_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    v_tenant_id,
    NEW.id,
    auth.uid(),
    'followup_scheduled',
    'Follow-up automatico agendado',
    'Follow-up automatico agendado para ' || v_stage.auto_followup_days || ' dias - Etapa: ' || v_stage.name,
    jsonb_build_object(
      'stage_id', v_stage.id,
      'stage_name', v_stage.name,
      'followup_days', v_stage.auto_followup_days
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_schedule_followup IS
  'Trigger function: auto-creates a follow-up when a lead moves to a pipeline stage with auto_followup_days set.';

DROP TRIGGER IF EXISTS trg_auto_schedule_followup ON public.leads;
CREATE TRIGGER trg_auto_schedule_followup
  BEFORE INSERT OR UPDATE OF pipeline_stage_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.auto_schedule_followup();

-- ---------------------------------------------------------------------------
-- mark_overdue_followups() - Marks pending followups as overdue
-- Can be called via pg_cron or an Edge Function on a schedule
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_overdue_followups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.crm_followups
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending'
    AND scheduled_at < now()
    AND (snoozed_until IS NULL OR snoozed_until < now());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.mark_overdue_followups IS
  'Marks all pending follow-ups with scheduled_at in the past as overdue. '
  'Returns the number of rows updated. Call via pg_cron or Edge Function.';

-- =============================================================================
-- 16. updated_at trigger for crm_followups
-- =============================================================================

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_followups_updated_at ON public.crm_followups;
CREATE TRIGGER trg_crm_followups_updated_at
  BEFORE UPDATE ON public.crm_followups
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
