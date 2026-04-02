-- Follow-up Sequences: automated WhatsApp/email sequences triggered by events
CREATE TABLE IF NOT EXISTS crm_followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'lead_created', 'proposta_enviada', 'sem_resposta_24h', 'sem_resposta_48h',
    'contrato_enviado', 'agendamento_criado', 'lead_perdido', 'manual'
  )),
  is_active BOOLEAN DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each step: { "delay_hours": number, "channel": "whatsapp"|"email", "template": string, "subject"?: string }
  total_triggered INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_followup_sequences_tenant ON crm_followup_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_followup_sequences_trigger ON crm_followup_sequences(tenant_id, trigger_event) WHERE is_active = true;

-- Scheduled follow-up items (queue)
CREATE TABLE IF NOT EXISTS crm_followup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES crm_followup_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  message_template TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_queue_pending ON crm_followup_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followup_queue_tenant ON crm_followup_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_followup_queue_lead ON crm_followup_queue(lead_id);

-- RLS policies
ALTER TABLE crm_followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for followup sequences"
  ON crm_followup_sequences FOR ALL
  USING (tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for followup queue"
  ON crm_followup_queue FOR ALL
  USING (tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid()));
