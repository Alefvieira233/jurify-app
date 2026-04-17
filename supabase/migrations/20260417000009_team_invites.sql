-- ============================================================================
-- team_invites — invitations created during onboarding (Onda 2)
--
-- Date:        2026-04-17
-- Context:     Onboarding step 3 (Equipe) allows the owner to invite up to 5
--              initial team members. Each invitation is persisted here so it
--              can be resent, audited, and redeemed once the invitee signs up.
--
-- Idempotent:  CREATE TABLE IF NOT EXISTS; ON CONFLICT on UNIQUE (tenant_id, email)
-- RLS:         Enabled — only admins of the same tenant may read/manage invites.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'manager', 'member')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS team_invites_tenant_status_idx
  ON public.team_invites (tenant_id, status);
CREATE INDEX IF NOT EXISTS team_invites_token_idx
  ON public.team_invites (token);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Admins of the tenant may read invites
DROP POLICY IF EXISTS team_invites_select_admins ON public.team_invites;
CREATE POLICY team_invites_select_admins ON public.team_invites
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  );

-- Admins of the tenant may create invites
DROP POLICY IF EXISTS team_invites_insert_admins ON public.team_invites;
CREATE POLICY team_invites_insert_admins ON public.team_invites
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  );

-- Admins of the tenant may update invites (revoke, resend, etc.)
DROP POLICY IF EXISTS team_invites_update_admins ON public.team_invites;
CREATE POLICY team_invites_update_admins ON public.team_invites
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  )
  WITH CHECK (tenant_id = public.get_current_tenant_id());

COMMENT ON TABLE public.team_invites IS
  'Invitations created during onboarding step 3 and from Settings > Team. Tokens are hex-encoded 24-byte secrets.';
