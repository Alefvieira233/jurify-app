-- Fix: Automation tables RLS policies were using current_setting('app.tenant_id')
-- which is a server-side GUC never set by the frontend Supabase client.
-- Replace with standard auth.uid()-based tenant isolation used everywhere else.

-- ============================================================
-- automation_tasks
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for automation tasks" ON public.automation_tasks;
DROP POLICY IF EXISTS "Users can view own automation tasks" ON public.automation_tasks;

CREATE POLICY "automation_tasks_tenant_isolation" ON public.automation_tasks
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================
-- reminders
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;

CREATE POLICY "reminders_tenant_isolation" ON public.reminders
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================
-- drive_folders
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for drive folders" ON public.drive_folders;

CREATE POLICY "drive_folders_tenant_isolation" ON public.drive_folders
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================
-- recurring_events
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for recurring events" ON public.recurring_events;
DROP POLICY IF EXISTS "Users can manage own recurring events" ON public.recurring_events;

CREATE POLICY "recurring_events_tenant_isolation" ON public.recurring_events
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );
