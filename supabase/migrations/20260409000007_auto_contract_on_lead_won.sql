-- =============================================================================
-- Auto-generate contract when lead status changes to "ganho"
-- Creates a draft contract in contratos table with lead data pre-filled.
-- Notifies the responsible lawyer.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_contract_on_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  responsavel_nome TEXT;
  contract_text TEXT;
BEGIN
  -- Only fire when status changes TO 'ganho'
  IF NEW.status <> 'ganho' OR OLD.status = 'ganho' THEN
    RETURN NEW;
  END IF;

  -- Get responsible person's name
  SELECT nome_completo INTO responsavel_nome
  FROM profiles
  WHERE id = NEW.responsavel_id;

  -- Build contract template text
  contract_text := format(
    E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\n'
    'CONTRATANTE: %s\n'
    'Telefone: %s\n'
    'Email: %s\n\n'
    'CONTRATADA: [Nome do Escritório]\n\n'
    'OBJETO: Prestação de serviços advocatícios na área de %s.\n\n'
    'VALOR: R$ %s\n\n'
    'Este contrato foi gerado automaticamente e deve ser revisado pelo advogado responsável antes do envio para assinatura.\n\n'
    'Advogado responsável: %s\n'
    'Data de geração: %s',
    COALESCE(NEW.nome, NEW.nome_completo, 'Não informado'),
    COALESCE(NEW.telefone, 'Não informado'),
    COALESCE(NEW.email, 'Não informado'),
    COALESCE(NEW.area_juridica, 'Não especificada'),
    COALESCE(NEW.valor_causa::TEXT, '0,00'),
    COALESCE(responsavel_nome, 'Não atribuído'),
    to_char(now(), 'DD/MM/YYYY HH24:MI')
  );

  -- Check if contract already exists for this lead (prevent duplicates)
  IF NOT EXISTS (
    SELECT 1 FROM contratos
    WHERE lead_id = NEW.id AND tenant_id = NEW.tenant_id
  ) THEN
    -- Create draft contract
    INSERT INTO contratos (
      lead_id,
      tenant_id,
      nome_cliente,
      area_juridica,
      valor_causa,
      texto_contrato,
      status,
      responsavel_id,
      observacoes
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      COALESCE(NEW.nome, NEW.nome_completo, 'Lead ' || NEW.id::TEXT),
      COALESCE(NEW.area_juridica, 'Não especificada'),
      COALESCE(NEW.valor_causa, 0),
      contract_text,
      'rascunho',
      NEW.responsavel_id,
      'Contrato gerado automaticamente quando lead marcado como ganho. Revisar antes de enviar.'
    );

    -- Notify responsible lawyer
    INSERT INTO notificacoes (tenant_id, tipo, titulo, mensagem, ativo)
    VALUES (
      NEW.tenant_id,
      'sucesso',
      '📝 Contrato gerado automaticamente',
      format(
        'Lead "%s" (%s) foi marcado como GANHO! Um contrato rascunho foi criado automaticamente. Revise e envie para assinatura.',
        COALESCE(NEW.nome, NEW.nome_completo, 'Lead'),
        COALESCE(NEW.area_juridica, '')
      ),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to leads table
DROP TRIGGER IF EXISTS trg_auto_contract_on_won ON public.leads;
CREATE TRIGGER trg_auto_contract_on_won
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW
  WHEN (NEW.status = 'ganho' AND OLD.status <> 'ganho')
  EXECUTE FUNCTION public.auto_generate_contract_on_won();
