-- Função estável para lookup de tenant_id — permite ao PostgreSQL cachear o resultado
-- por query, evitando N+1 nas RLS policies que chamam subquery por linha avaliada.
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_tenant_id() IS
  'Retorna tenant_id do usuário autenticado. STABLE permite ao planner cachear por query, evitando N+1 nas RLS policies.';
