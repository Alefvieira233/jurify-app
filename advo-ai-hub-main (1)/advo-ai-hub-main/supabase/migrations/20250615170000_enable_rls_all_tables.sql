
-- Enable RLS and create secure tenant-based policies for all tables

-- Leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_leads_insert" ON public.leads
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'leads'
    AND action = 'create'
  )
);

CREATE POLICY "secure_leads_update" ON public.leads
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'leads'
    AND action = 'update'
  )
);

CREATE POLICY "secure_leads_delete" ON public.leads
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Contratos table
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_contratos_select" ON public.contratos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_contratos_insert" ON public.contratos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'contratos'
    AND action = 'create'
  )
);

CREATE POLICY "secure_contratos_update" ON public.contratos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'contratos'
    AND action = 'update'
  )
);

CREATE POLICY "secure_contratos_delete" ON public.contratos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Agendamentos table
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_agendamentos_select" ON public.agendamentos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_agendamentos_insert" ON public.agendamentos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'agendamentos'
    AND action = 'create'
  )
);

CREATE POLICY "secure_agendamentos_update" ON public.agendamentos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'agendamentos'
    AND action = 'update'
  )
);

CREATE POLICY "secure_agendamentos_delete" ON public.agendamentos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Agentes IA table
ALTER TABLE public.agentes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_agentes_select" ON public.agentes_ia
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_agentes_insert" ON public.agentes_ia
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'agentes_ia'
    AND action = 'create'
  )
);

CREATE POLICY "secure_agentes_update" ON public.agentes_ia
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'agentes_ia'
    AND action = 'update'
  )
);

CREATE POLICY "secure_agentes_delete" ON public.agentes_ia
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Logs table
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_logs_select" ON public.logs_execucao_agentes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_logs_insert" ON public.logs_execucao_agentes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Notificacoes table
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secure_notificacoes_select" ON public.notificacoes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_notificacoes_insert" ON public.notificacoes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "secure_notificacoes_update" ON public.notificacoes
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND resource = 'notificacoes'
    AND action = 'update'
  )
);
