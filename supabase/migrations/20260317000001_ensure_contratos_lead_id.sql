-- Ensure contratos.lead_id column exists (fixes "column contratos.lead_id does not exist")
-- The original migration created it, but some environments may be missing it.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Index for join performance
CREATE INDEX IF NOT EXISTS idx_contratos_lead_id ON public.contratos(lead_id);
