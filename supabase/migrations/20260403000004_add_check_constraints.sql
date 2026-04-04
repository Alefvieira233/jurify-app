-- DEB-010: Add CHECK constraints on status columns
-- Ensures data integrity by restricting status values to known valid states.
-- Values sourced from production data + Zod schemas + frontend STATUS_CONFIG.
-- Tables that don't exist are silently skipped (undefined_table exception).
--
-- Sprint 2 — Story 2.1

-- leads.status
DO $$ BEGIN
  ALTER TABLE leads ADD CONSTRAINT chk_leads_status
    CHECK (status IN ('novo', 'em_contato', 'qualificado', 'proposta', 'em_proposta', 'negociacao', 'ganho', 'perdido', 'contratado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- processos.status
DO $$ BEGIN
  ALTER TABLE processos ADD CONSTRAINT chk_processos_status
    CHECK (status IN ('ativo', 'suspenso', 'encerrado_vitoria', 'encerrado_derrota', 'encerrado_acordo', 'arquivado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- honorarios.status
DO $$ BEGIN
  ALTER TABLE honorarios ADD CONSTRAINT chk_honorarios_status
    CHECK (status IN ('vigente', 'pago', 'inadimplente', 'cancelado', 'disputado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- agendamentos.status
DO $$ BEGIN
  ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_status
    CHECK (status IN ('pendente', 'agendado', 'confirmado', 'cancelado', 'realizado', 'reagendado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- tarefas.status
DO $$ BEGIN
  ALTER TABLE tarefas ADD CONSTRAINT chk_tarefas_status
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- contratos.status
DO $$ BEGIN
  ALTER TABLE contratos ADD CONSTRAINT chk_contratos_status
    CHECK (status IN ('rascunho', 'ativo', 'expirado', 'cancelado', 'assinado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- crm_followups.status (skip if table/column missing)
DO $$ BEGIN
  ALTER TABLE crm_followups ADD CONSTRAINT chk_crm_followups_status
    CHECK (status IN ('pending', 'completed', 'skipped', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
END $$;

-- prazos_processuais.status (actual table name, not 'prazos')
DO $$ BEGIN
  ALTER TABLE prazos_processuais ADD CONSTRAINT chk_prazos_status
    CHECK (status IN ('pendente', 'cumprido', 'perdido', 'cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- whatsapp_sessions (skip if status column missing)
DO $$ BEGIN
  ALTER TABLE whatsapp_sessions ADD CONSTRAINT chk_whatsapp_sessions_status
    CHECK (status IN ('active', 'waiting', 'closed', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
END $$;

-- tickets_suporte (actual table name, not 'tickets')
DO $$ BEGIN
  ALTER TABLE tickets_suporte ADD CONSTRAINT chk_tickets_status
    CHECK (status IN ('aberto', 'em_andamento', 'fechado'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;
