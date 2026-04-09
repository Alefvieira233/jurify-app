-- =============================================================================
-- RLS: Department-level visibility for leads
-- Adds defense-in-depth: admins/managers see all leads in tenant,
-- regular users see only leads in their departments or assigned to them.
-- Service role (Edge Functions) bypasses RLS automatically.
-- =============================================================================

-- Drop existing SELECT policy to replace with department-aware version
DROP POLICY IF EXISTS "rls_leads_select" ON public.leads;

-- Helper function: check if user is admin or manager in their tenant
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_current_tenant_id()
      AND role IN ('admin', 'administrador', 'manager', 'gerente')
      AND ativo = true
  )
$$;

-- New SELECT policy with department-level visibility:
-- 1. Admin/Manager → see ALL leads in tenant (unchanged behavior)
-- 2. Regular user → see leads in departments they belong to, OR assigned to them, OR unassigned (departamento_id IS NULL)
CREATE POLICY "rls_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND (
    -- Admins and managers see everything in tenant
    public.is_admin_or_manager()
    OR
    -- Lead is assigned to this user
    responsavel_id = auth.uid()
    OR
    -- Lead is in a department the user belongs to
    departamento_id IN (
      SELECT departamento_id FROM public.departamento_membros
      WHERE profile_id = auth.uid()
        AND tenant_id = public.get_current_tenant_id()
    )
    OR
    -- Unassigned leads (no department) are visible to all authenticated tenant users
    -- so they can be claimed/routed
    departamento_id IS NULL
  )
);

-- Performance index for department membership lookups in RLS
CREATE INDEX IF NOT EXISTS idx_departamento_membros_profile_tenant
ON public.departamento_membros(profile_id, tenant_id);
