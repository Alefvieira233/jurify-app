-- DEB-010: Add CHECK constraints on status columns
-- Ensures data integrity by restricting status values to known valid states.
-- Values sourced from Zod schemas (leadSchema, processoSchema, honorarioSchema, prazoSchema)
-- and frontend STATUS_CONFIG (statusConfig.ts).
--
-- Sprint 2 — Story 2.1

BEGIN;

-- leads.status
DO $$ BEGIN
  ALTER TABLE leads ADD CONSTRAINT chk_leads_status
    CHECK (status IN ('novo', 'em_contato', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- processos.status
DO $$ BEGIN
  ALTER TABLE processos ADD CONSTRAINT chk_processos_status
    CHECK (status IN ('ativo', 'suspenso', 'encerrado_vitoria', 'encerrado_derrota', 'encerrado_acordo', 'arquivado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- honorarios.status
DO $$ BEGIN
  ALTER TABLE honorarios ADD CONSTRAINT chk_honorarios_status
    CHECK (status IN ('vigente', 'pago', 'inadimplente', 'cancelado', 'disputado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- prazos.status
DO $$ BEGIN
  ALTER TABLE prazos ADD CONSTRAINT chk_prazos_status
    CHECK (status IN ('pendente', 'cumprido', 'perdido', 'cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tickets.status
DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT chk_tickets_status
    CHECK (status IN ('aberto', 'em_andamento', 'fechado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- agendamentos.status
DO $$ BEGIN
  ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_status
    CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'realizado', 'reagendado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tarefas.status
DO $$ BEGIN
  ALTER TABLE tarefas ADD CONSTRAINT chk_tarefas_status
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contratos.status
DO $$ BEGIN
  ALTER TABLE contratos ADD CONSTRAINT chk_contratos_status
    CHECK (status IN ('rascunho', 'ativo', 'expirado', 'cancelado', 'assinado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- crm_followups.status
DO $$ BEGIN
  ALTER TABLE crm_followups ADD CONSTRAINT chk_crm_followups_status
    CHECK (status IN ('pending', 'completed', 'skipped', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- whatsapp_sessions.status
DO $$ BEGIN
  ALTER TABLE whatsapp_sessions ADD CONSTRAINT chk_whatsapp_sessions_status
    CHECK (status IN ('active', 'waiting', 'closed', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
