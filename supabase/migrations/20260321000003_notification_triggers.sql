-- ============================================
-- Auto-Notification Triggers
-- Creates notifications automatically when key events occur:
--   1. Lead status change
--   2. Lead temperature (prioridade) change
--   3. Lead assignment (responsavel_id) change
--   4. Automation flow/rule execution completes
-- ============================================

-- ── 1. Lead status change notification ──

CREATE OR REPLACE FUNCTION public.notify_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notificacoes (
      titulo,
      mensagem,
      tipo,
      tenant_id,
      created_by
    ) VALUES (
      'Status de Lead Alterado',
      format(
        'O lead "%s" mudou de "%s" para "%s".',
        COALESCE(NEW.nome, 'Sem nome'),
        COALESCE(OLD.status, 'indefinido'),
        COALESCE(NEW.status, 'indefinido')
      ),
      CASE
        WHEN NEW.status IN ('convertido', 'ganho') THEN 'sucesso'
        WHEN NEW.status IN ('perdido', 'cancelado') THEN 'alerta'
        ELSE 'info'
      END,
      NEW.tenant_id,
      NEW.responsavel_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_status_notify ON public.leads;
CREATE TRIGGER trg_lead_status_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_lead_status_change();

-- ── 2. Lead temperature/priority change notification ──

CREATE OR REPLACE FUNCTION public.notify_lead_priority_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.prioridade IS DISTINCT FROM NEW.prioridade THEN
    INSERT INTO public.notificacoes (
      titulo,
      mensagem,
      tipo,
      tenant_id,
      created_by
    ) VALUES (
      CASE
        WHEN NEW.prioridade = 'urgente' THEN 'Lead Urgente!'
        WHEN NEW.prioridade = 'alta' THEN 'Lead com Alta Prioridade'
        ELSE 'Prioridade de Lead Alterada'
      END,
      format(
        'O lead "%s" mudou de prioridade "%s" para "%s".',
        COALESCE(NEW.nome, 'Sem nome'),
        COALESCE(OLD.prioridade, 'indefinida'),
        COALESCE(NEW.prioridade, 'indefinida')
      ),
      CASE
        WHEN NEW.prioridade IN ('urgente', 'alta') THEN 'alerta'
        ELSE 'info'
      END,
      NEW.tenant_id,
      NEW.responsavel_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_priority_notify ON public.leads;
CREATE TRIGGER trg_lead_priority_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.prioridade IS DISTINCT FROM NEW.prioridade)
  EXECUTE FUNCTION public.notify_lead_priority_change();

-- ── 3. Lead assignment change notification ──

CREATE OR REPLACE FUNCTION public.notify_lead_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
  new_owner_name TEXT;
  old_owner_name TEXT;
BEGIN
  IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id AND NEW.responsavel_id IS NOT NULL THEN
    -- Resolve names
    SELECT nome_completo INTO new_owner_name FROM public.profiles WHERE id = NEW.responsavel_id;
    SELECT nome_completo INTO old_owner_name FROM public.profiles WHERE id = OLD.responsavel_id;

    -- Notify the new owner
    INSERT INTO public.notificacoes (
      titulo,
      mensagem,
      tipo,
      tenant_id,
      created_by
    ) VALUES (
      'Lead Atribuído a Você',
      format(
        'O lead "%s" foi atribuído a %s%s.',
        COALESCE(NEW.nome, 'Sem nome'),
        COALESCE(new_owner_name, 'você'),
        CASE WHEN old_owner_name IS NOT NULL
          THEN format(' (anteriormente com %s)', old_owner_name)
          ELSE ''
        END
      ),
      'info',
      NEW.tenant_id,
      NEW.responsavel_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_assignment_notify ON public.leads;
CREATE TRIGGER trg_lead_assignment_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id)
  EXECUTE FUNCTION public.notify_lead_assignment_change();

-- ── 4. Automation execution completion notification ──

CREATE OR REPLACE FUNCTION public.notify_automation_execution()
RETURNS TRIGGER AS $$
DECLARE
  ref_name TEXT;
BEGIN
  -- Only notify on terminal statuses
  IF NEW.status IN ('sucesso', 'erro') THEN
    -- Resolve reference name
    IF NEW.tipo = 'flow' THEN
      SELECT nome INTO ref_name FROM public.automation_flows WHERE id = NEW.referencia_id;
    ELSIF NEW.tipo = 'rule' THEN
      SELECT nome INTO ref_name FROM public.automation_rules WHERE id = NEW.referencia_id;
    END IF;

    INSERT INTO public.notificacoes (
      titulo,
      mensagem,
      tipo,
      tenant_id
    ) VALUES (
      CASE
        WHEN NEW.status = 'sucesso' THEN 'Automação Concluída'
        ELSE 'Erro na Automação'
      END,
      format(
        '%s "%s" %s%s.',
        CASE WHEN NEW.tipo = 'flow' THEN 'O fluxo' ELSE 'A regra' END,
        COALESCE(ref_name, 'Sem nome'),
        CASE WHEN NEW.status = 'sucesso' THEN 'foi executado(a) com sucesso' ELSE 'falhou durante a execução' END,
        CASE WHEN NEW.duracao_ms IS NOT NULL
          THEN format(' (%sms)', NEW.duracao_ms)
          ELSE ''
        END
      ),
      CASE WHEN NEW.status = 'sucesso' THEN 'sucesso' ELSE 'erro' END,
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_automation_execution_notify ON public.automation_executions;
CREATE TRIGGER trg_automation_execution_notify
  AFTER INSERT OR UPDATE ON public.automation_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('sucesso', 'erro'))
  EXECUTE FUNCTION public.notify_automation_execution();

-- ── 5. New lead notification ──

CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notificacoes (
    titulo,
    mensagem,
    tipo,
    tenant_id,
    created_by
  ) VALUES (
    'Novo Lead Cadastrado',
    format(
      'O lead "%s" foi cadastrado%s.',
      COALESCE(NEW.nome, 'Sem nome'),
      CASE WHEN NEW.origem IS NOT NULL
        THEN format(' (origem: %s)', NEW.origem)
        ELSE ''
      END
    ),
    'info',
    NEW.tenant_id,
    NEW.responsavel_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_lead_notify ON public.leads;
CREATE TRIGGER trg_new_lead_notify
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();
