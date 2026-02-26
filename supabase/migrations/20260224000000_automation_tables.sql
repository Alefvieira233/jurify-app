-- Migration: Automation and Reminders Tables
-- Created: 2026-02-24
-- Purpose: Support agenda automation workflows

-- Tabela para tracking de tarefas de automação
CREATE TABLE public.automation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'task', 'reminder', 'drive_folder', 'google_sync')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para lembretes automáticos
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'push', 'in_app')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para pastas do Google Drive
CREATE TABLE public.drive_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL, -- Google Drive folder ID
  folder_name TEXT NOT NULL,
  folder_url TEXT,
  subfolders JSONB DEFAULT '[]', -- Array of subfolder objects
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para eventos recorrentes
CREATE TABLE public.recurring_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  area_juridica TEXT,
  responsavel TEXT,
  rrule TEXT NOT NULL, -- RRULE format for recurrence
  duration_minutes INTEGER DEFAULT 60,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  start_date DATE NOT NULL,
  end_date DATE,
  google_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para instâncias de eventos recorrentes
CREATE TABLE public.recurring_event_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_event_id UUID REFERENCES public.recurring_events(id) ON DELETE CASCADE NOT NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  google_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'modified')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recurring_event_id, start_time)
);

-- Habilitar RLS
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_event_instances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para automation_tasks
CREATE POLICY "Tenant isolation for automation tasks" ON public.automation_tasks
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Users can view own automation tasks" ON public.automation_tasks
  FOR SELECT USING (user_id = auth.uid());

-- Políticas RLS para reminders
CREATE POLICY "Tenant isolation for reminders" ON public.reminders
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (user_id = auth.uid());

-- Políticas RLS para drive_folders
CREATE POLICY "Tenant isolation for drive folders" ON public.drive_folders
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Políticas RLS para recurring_events
CREATE POLICY "Tenant isolation for recurring events" ON public.recurring_events
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Users can manage own recurring events" ON public.recurring_events
  FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para recurring_event_instances
-- (no tenant_id column — inherit isolation via parent recurring_events)
CREATE POLICY "Tenant isolation for recurring event instances" ON public.recurring_event_instances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.recurring_events re
      WHERE re.id = recurring_event_instances.recurring_event_id
        AND re.user_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX idx_automation_tasks_tenant_user ON public.automation_tasks(tenant_id, user_id);
CREATE INDEX idx_automation_tasks_status ON public.automation_tasks(status);
CREATE INDEX idx_automation_tasks_scheduled ON public.automation_tasks(scheduled_at) WHERE status = 'pending';

CREATE INDEX idx_reminders_tenant_user ON public.reminders(tenant_id, user_id);
CREATE INDEX idx_reminders_scheduled ON public.reminders(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_reminders_agendamento ON public.reminders(agendamento_id);

CREATE INDEX idx_drive_folders_tenant ON public.drive_folders(tenant_id);
CREATE INDEX idx_drive_folders_lead ON public.drive_folders(lead_id);
CREATE INDEX idx_drive_folders_agendamento ON public.drive_folders(agendamento_id);

CREATE INDEX idx_recurring_events_tenant ON public.recurring_events(tenant_id);
CREATE INDEX idx_recurring_events_user ON public.recurring_events(user_id);
CREATE INDEX idx_recurring_events_active ON public.recurring_events(is_active) WHERE is_active = true;

CREATE INDEX idx_recurring_instances_event ON public.recurring_event_instances(recurring_event_id);
CREATE INDEX idx_recurring_instances_time ON public.recurring_event_instances(start_time);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automation_tasks_updated_at BEFORE UPDATE ON public.automation_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drive_folders_updated_at BEFORE UPDATE ON public.drive_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_events_updated_at BEFORE UPDATE ON public.recurring_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar instâncias de eventos recorrentes
CREATE OR REPLACE FUNCTION generate_recurring_instances()
RETURNS void AS $$
DECLARE
  event_record RECORD;
  v_current_date DATE;
  v_end_date DATE;
  instance_start TIMESTAMP WITH TIME ZONE;
  instance_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Processa eventos recorrentes ativos
  FOR event_record IN
    SELECT * FROM public.recurring_events
    WHERE is_active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    v_current_date := GREATEST(event_record.start_date, CURRENT_DATE);
    v_end_date := COALESCE(event_record.end_date, CURRENT_DATE + INTERVAL '1 year');

    -- Gera instâncias para os próximos 30 dias
    WHILE v_current_date <= v_end_date AND v_current_date <= CURRENT_DATE + INTERVAL '30 days' LOOP
      -- TODO: Implementar RRULE parsing aqui
      -- Por enquanto, cria instância diária como exemplo
      instance_start := v_current_date::timestamp AT TIME ZONE event_record.timezone;
      instance_end := instance_start + (event_record.duration_minutes || ' minutes')::interval;

      -- Insere instância se não existir
      INSERT INTO public.recurring_event_instances(
        recurring_event_id,
        start_time,
        end_time,
        status
      ) VALUES (
        event_record.id,
        instance_start,
        instance_end,
        'scheduled'
      )
      ON CONFLICT (recurring_event_id, start_time) DO NOTHING;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE public.automation_tasks IS 'Tracking de tarefas de automação da agenda';
COMMENT ON TABLE public.reminders IS 'Lembretes automáticos para agendamentos';
COMMENT ON TABLE public.drive_folders IS 'Referências para pastas do Google Drive';
COMMENT ON TABLE public.recurring_events IS 'Configuração de eventos recorrentes';
COMMENT ON TABLE public.recurring_event_instances IS 'Instâncias geradas de eventos recorrentes';
