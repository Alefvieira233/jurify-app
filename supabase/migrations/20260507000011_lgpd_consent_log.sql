-- LGPD Consent Log (Lei 13.709/2018, art. 7º, art. 8º).
-- Registra consentimento implícito ou explícito do titular dos dados (lead/cliente)
-- na primeira interação via canal automatizado (WhatsApp, web). Auditável pela ANPD.
-- Imutável após insert (sem UPDATE) — fonte da verdade pra registro de operações
-- (art. 37). Conserva mesmo após delete do lead (compliance art. 16).

CREATE TABLE IF NOT EXISTS public.lgpd_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NULL,
  conversation_id UUID NULL,
  phone_number TEXT NULL,
  email TEXT NULL,
  consent_channel TEXT NOT NULL CHECK (consent_channel IN ('whatsapp', 'web', 'email', 'in_person', 'api')),
  consent_type TEXT NOT NULL CHECK (consent_type IN ('implicit_first_contact', 'explicit_optin', 'contractual', 'legal_obligation', 'legitimate_interest')),
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  consent_text TEXT NULL,
  policy_url TEXT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consent_tenant_lead
  ON public.lgpd_consent_log (tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_consent_tenant_phone
  ON public.lgpd_consent_log (tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_lgpd_consent_consented_at
  ON public.lgpd_consent_log (consented_at DESC);

ALTER TABLE public.lgpd_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_consent_log FORCE ROW LEVEL SECURITY;

-- Membros do tenant leem seu próprio consent log
CREATE POLICY lgpd_consent_log_tenant_select ON public.lgpd_consent_log
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.ativo = true
    )
  );

-- Insert via service_role apenas (edge function controla writes pra evitar tampering)
CREATE POLICY lgpd_consent_log_service_role_insert ON public.lgpd_consent_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Sem UPDATE/DELETE — registro imutável (auditoria ANPD).
-- (Default: PostgreSQL nega operações sem policy quando RLS está ativo.)

COMMENT ON TABLE public.lgpd_consent_log IS
  'Registro imutável de consentimento LGPD (art. 7º/8º/37). Toda primeira interação via canal automatizado gera entry. Não permite UPDATE/DELETE.';
