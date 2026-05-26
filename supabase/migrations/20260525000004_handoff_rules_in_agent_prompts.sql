-- =============================================================================
-- P0-3 — Regras de transferência (handoff) injetadas no prompt dos agentes IA.
-- (Auditoria 2026-05-25)
--
-- Causa do sintoma: Ana (recepcionista) tinha no prompt customizado a regra
-- "termine com pergunta concreta" — então resistia ao handoff mesmo quando o
-- lead pedia explicitamente ("posso falar com a Dra. Jacira?" → "entendo, MAS
-- preciso entender mais sobre seu caso"). Solução: anexar bloco de regras de
-- handoff identificável por tag [HANDOFF_RULES_v2026_05_25] no FINAL do
-- prompt_sistema, preservando tudo o que o tenant customizou.
--
-- Idempotente: usa regex para anexar somente se a tag ainda não estiver presente.
-- =============================================================================

DO $migration$
DECLARE
  v_rules_block text := E'\n\n[HANDOFF_RULES_v2026_05_25]\n' ||
    E'REGRAS DE TRANSFERÊNCIA — OBRIGATÓRIO seguir:\n' ||
    E'1. Se o cliente pedir EXPLICITAMENTE para falar com outro profissional ' ||
        E'(ex: "quero falar com a Dra. Jacira", "me transfere para o Dr. X", ' ||
        E'"posso falar com o especialista em banco"), você DEVE chamar ' ||
        E'imediatamente a tool transfer_to_agent. NÃO faça perguntas adicionais ' ||
        E'antes da transferência. NÃO diga "mas preciso entender". Apenas ' ||
        E'confirme a transferência via handoff_message.\n' ||
    E'2. Se o caso envolver banco, financiamento, empréstimo, score, cartão ' ||
        E'ou negativação → transfer_to_agent(target_agent_type="juridico_bancario").\n' ||
    E'3. Se o caso envolver matéria jurídica complexa fora do seu escopo ' ||
        E'(quando você for recepcionista) → transfer_to_agent(target_agent_type="juridico").\n' ||
    E'4. Se a discussão for sobre orçamento/honorários/valores → ' ||
        E'transfer_to_agent(target_agent_type="comercial").\n' ||
    E'5. Para análise de documentos enviados pelo cliente → ' ||
        E'transfer_to_agent(target_agent_type="analista_documentos").\n' ||
    E'6. Para dúvidas operacionais sobre o atendimento ou serviços do escritório → ' ||
        E'transfer_to_agent(target_agent_type="suporte").\n' ||
    E'7. SOMENTE termine a mensagem com pergunta concreta quando NÃO houver ' ||
        E'tool call (ou seja, quando você estiver de fato qualificando o lead).\n' ||
    E'A tool transfer_to_agent é a única forma legítima de fazer handoff. ' ||
        E'Detecção heurística post-hoc foi descontinuada.\n';
  v_updated int;
BEGIN
  UPDATE public.agentes_ia
  SET
    prompt_sistema = COALESCE(prompt_sistema, '') || v_rules_block,
    updated_at = now()
  WHERE
    prompt_sistema IS NOT NULL
    AND tipo IN (
      'recepcionista',
      'juridico',
      'juridico_bancario',
      'comercial',
      'suporte',
      'analista_documentos',
      'qualificacao',
      'proposta'
    )
    AND prompt_sistema NOT ILIKE '%HANDOFF_RULES_v2026_05_25%';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'P0-3: % agentes atualizados com regras de handoff', v_updated;
END
$migration$;
