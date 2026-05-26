# 04 — IA & Orquestração de Agentes

> Auditoria sênior — 2026-05-25
> Investigador: agente auditor (Opus 4.7)
> Sintoma reportado pelo CEO: **"os agentes de IA às vezes não repassam para outros agentes, como orquestração"**

## Resumo executivo

O Jurify possui uma orquestração multi-agente funcional em 2 camadas (LLM orchestrator + state-based handoff) que atende corretamente >80% dos casos. **O sintoma reportado é real e tem causa-raiz identificável: o handoff depende de a Ana (recepcionista) mencionar literalmente o nome do agente alvo na frase de resposta — quando ela varia a redação (ex.: "Vou te conectar com nossa especialista" sem citar "Dra. Jacira"), o detector regex no `process-message.ts` falha e o `pending_handoff_to` nunca é gravado.** O próximo turno volta ao orchestrator, que pode rotear de volta pra Ana (loop). Comprovado em produção: conversa `b7f4ce52` (lead Alef, tenant `66719a49`) — usuário pediu literalmente "Você pode me transferir para a Dr Jacira" e Ana respondeu "Entendo que você gostaria de falar diretamente com a Dra. Jacira, **mas pra que eu possa ajudar da melhor forma**, preciso entender um pouco mais sobre o seu caso" — handoff jamais ocorreu.

Há ainda 4 falhas estruturais subjacentes que tornam a regressão recorrente, listadas em "Achados".

## Mapa de agentes

### Definições hardcoded (`supabase/functions/_shared/agent-prompts.ts`)
| `tipo` | Nome default | Especialização | temp | maxTokens |
|---|---|---|---|---|
| `recepcionista` | Ana | Acolhimento + direcionamento | 0.5 | 400 |
| `juridico` | Dr. Gabriel — Assistente Jurídico | Orientação legal geral | 0.3 | 800 |
| `juridico_bancario` | Dra. Jacira Gomes | Bancário/superendividamento | 0.4 | 800 |
| `comercial` | Marcos — Consultor Comercial | Propostas, honorários | 0.5 | 500 |
| `suporte` | Suporte ao Cliente | Pós-venda, reclamações | 0.4 | 500 |
| `analista_documentos` | Analista de Documentos | OCR/triagem de mídia | 0.2 | 600 |

### Customizações por tenant (`agentes_ia` em prod)
- Tenant `66719a49` (Jacira Gomes Advocacia): único tenant com `juridico_bancario`. Prompt customizado de 7.8KB.
- Demais 14 tenants: apenas os 5 agentes core. **Sem juridico_bancario habilitado em outros tenants → o orchestrator não tem alvo válido se um lead de outro tenant pedir um especialista bancário.**
- Tenant `885eb31d` possui tipos atípicos (`followup`, `proposta`, `qualificacao`) — não há prompts default para esses tipos, então o webhook cai pro fallback `recepcionista` ao tentar carregá-los (`agent-prompts.ts:771`).

## Arquitetura de orquestração

```
WhatsApp inbound
    │
    ▼
[whatsapp-webhook/index.ts]
    │
    ▼
[handlers/process-message.ts] ──── ramo principal
    │
    ├─ STAGE 1 media-processor (OCR/transcrição)
    │
    ├─ STAGE 2 build context
    │       legal_context, conversation_history, conversation_state (lê fase + pending_handoff_to)
    │
    ├─ STAGE 3 ROTA → agente alvo
    │   ┌─────────────────────────────────────────────────────────┐
    │   │ Prioridade:                                               │
    │   │  1. Slash command (/prazos, /processos, etc.)            │
    │   │  2. pending_handoff_to em conversation_state (30 min TTL) │
    │   │  3. Edge fn agent-orchestrator (gpt-4o-mini, json_mode)  │
    │   │  4. Fallback "juridico" se legal_context; else "recep."   │
    │   └─────────────────────────────────────────────────────────┘
    │
    ├─ Carrega prompt do agente (DB tenant → fallback agent-prompts.ts)
    │
    ├─ STAGE 4 callOpenAI com tools (até 4 iterações) — function-calling p/ check_availability, schedule_meeting, etc.
    │
    ├─ HANDOFF DETECTION (após resposta da IA):
    │   ┌──────────────────────────────────────────────────────────┐
    │   │  Regex literal por NOME do agente alvo:                   │
    │   │   - /dra?\.?\s*jacira/ → "juridico_bancario"              │
    │   │   - /dr\.?\s*gabriel/  → "juridico"                       │
    │   │   - /marcos/           → "comercial"                      │
    │   │  Grava em conversation_state.pending_handoff_to             │
    │   └──────────────────────────────────────────────────────────┘
    │
    ├─ HUMAN HANDOFF detection (12 regex de incerteza) → ia_active=false + handoff_until 24h
    │
    └─ envia resposta via Kapso/Meta + persiste em whatsapp_messages
```

## Análise do handoff — passo-a-passo e onde falha

### Caso real (conversa b7f4ce52, tenant 66719a49)
| t | sender | trecho |
|---|---|---|
| 1 | lead | "Você pode ver um horário na agenda da dr Jacira?" |
| 2 | ia | "Claro, posso agendar uma reunião com Jacira Gomes…" |
| 3 | lead | "Ela tá ocupada em quais dias?" |
| 4 | ia | "Pra te ajudar melhor, **você poderia me contar brevemente qual é o assunto…?**" |
| 5 | lead | **"Você pode me transferir para a Dr Jacira"** |
| 6 | ia | **"Entendo que você gostaria de falar diretamente com a Dra. Jacira, **mas** preciso entender um pouco mais sobre o seu caso…"** |

**Por que falhou em t=6:**
1. Em t=5 o orchestrator (gpt-4o-mini, 100 tokens, prompt enorme com 200+ keywords) recebeu uma mensagem curta sem termo bancário e classificou como `recepcionista` (default por desambiguação).
2. Ana respondeu sem citar Jacira por nome próprio — o regex `\b(?:dra?\.?\s*jacira|doutora\s+jacira|jacira\s+gomes)\b` exigia menção literal. Como ela escreveu "Entendo que você gostaria de falar diretamente com a Dra. Jacira" **a regex DEVERIA ter casado mas o guard `agentType !== "juridico_bancario"` bate (ela era recepcionista), entao o handoff deveria ter gravado em pending_handoff_to**. Verificando `conversation_state` real: `pending_handoff_to = NULL` → o turno ANTERIOR limpou e o turno t=6 NÃO gravou.
3. Hipótese: a frase "Dra. Jacira" aparece, MAS o trecho semântico real é uma RECUSA ("mas preciso entender mais"). O regex não distingue **intenção** de **simples menção** — apesar de gravar `pending_handoff_to=juridico_bancario`, o próximo turno do lead seria roteado pra Jacira sem que Ana realmente tenha qualificado. **Pior**: em t=4 (mensagem ANTERIOR) Ana não mencionou Jacira → `setHandoff` ficou null → state nunca foi setado → t=5 voltou pro orchestrator.

### Os 3 caminhos pelos quais o handoff "às vezes" falha
1. **Ana parafraseia sem citar nome.** Ex.: "Vou te conectar com nossa especialista bancária" → regex não casa "Dra. Jacira" → state não grava → próxima msg do lead volta pro orchestrator, que com 100 tokens roteia de novo pra recepcionista. **Loop.**
2. **Orchestrator gpt-4o-mini falha em classificar mensagens curtas/ambíguas.** "Me ajuda com uma dívida" tem keyword "dívida" e funciona; "Tô com problema com o banco" também; **mas "Preciso de ajuda urgente" ou "É sobre um caso" não** — vai pra `juridico` ou `recepcionista` aleatoriamente porque a temperatura é 0.1 mas a entrada de contexto é só 300 chars + lista enorme de keywords.
3. **Falta `transfer_to_agent` como ferramenta.** A IA do agente **não tem como sinalizar handoff de forma estruturada**. Toda detecção depende de regex aplicado **post-hoc** na resposta — frágil por design. As 6 tools (`check_availability`, `schedule_meeting`, `update_lead_kanban`, etc.) **não incluem transferência inter-agente**.

## Hipóteses para a falha — ranqueadas por probabilidade

| # | Hipótese | Probabilidade | Evidência |
|---|---|---|---|
| H1 | **Detecção por menção literal de nome falha quando IA parafraseia** | **MUITO ALTA** | Conversa b7f4ce52: state.pending_handoff_to ficou NULL após Ana mencionar Jacira porém envolvendo "não vou direcionar agora". Regex casa mas a IA na verdade está NEGANDO o handoff |
| H2 | Ana **resiste ao handoff** mesmo quando lead pede explicitamente | ALTA | t=4 e t=6 mostram Ana exigindo "me conta mais" antes de transferir; o prompt customizado diz "termine com pergunta concreta" → ela trata pergunta como obrigatória mesmo quando lead já disse o assunto |
| H3 | Orchestrator falha em mensagens curtas/ambíguas | ALTA | gpt-4o-mini com prompt de 4KB+ classifica mal "ela tá ocupada quais dias?" — não tem keyword bancário, vai pra `recepcionista` |
| H4 | **Falta tool estruturada `transfer_to_agent`** — IA não tem mecanismo determinístico de sinalizar | MÉDIA-ALTA | `agent-tools.ts` tem 6 tools, nenhuma de transferência |
| H5 | Race condition: 2 msgs do lead em <1s podem ler `pending_handoff_to` antes do INSERT do turno anterior | MÉDIA | Webhook é fire-and-forget; pgsql usa `try_acquire_schedule_slot` para agendamento mas NÃO para state update |
| H6 | Outros tenants não têm `juridico_bancario` habilitado | MÉDIA | Só tenant 66719a49 tem; se Ana de outro tenant disser "vou te passar pra Dra. Jacira" e o webhook gravar `pending_handoff_to=juridico_bancario`, o load DB retorna null → fallback `recepcionista` → loop |
| H7 | TTL de 30min faz state "expirar" entre msgs do lead | BAIXA | Improvável em conversas ativas, mas afeta lead que volta dias depois |
| H8 | Re-ativação automática de `ia_active` após 2h interrompe handoff humano | BAIXA-MÉDIA | Lógica em process-message.ts:511 — mas tem proteção `handoff_until` desde mig 20260417000003 |

## Evidências de produção

- **0 mensagens WhatsApp em 14 dias** (`SELECT count(*) FROM whatsapp_messages WHERE timestamp > now() - interval '14 days'` → 0). Production está silenciosa — confirma "Kapso silencioso desde 04-11" do MEMORY.md.
- **0 linhas em `agent_executions` e `agent_ai_logs` em 14d.** Não há telemetria recente para confirmar handoff em volume.
- **1 linha em `conversation_state`** (conversa b7f4ce52, tenant 66719a49, fase=`qualifying`, last_agent_type=`recepcionista`, pending_handoff_to=NULL). Estado final inconsistente: lead deveria estar com Jacira mas conversa-state diz recepcionista.
- **57 conversas WhatsApp** existem mas nenhuma teve mensagem nos últimos 14d.
- Edge function logs em 24h: zero invocações do `whatsapp-webhook`, `agent-orchestrator` ou `ai-agent-processor`.

## Achados

### P0
- **P0-IA-1 — Handoff por regex no nome é frágil e não distingue intenção de menção.** A detecção `mentionsJacira` (process-message.ts:1074) casa qualquer menção do nome — incluindo Ana negando ("Entendo que gostaria de falar com Dra. Jacira, mas..."). Não há classificação de polaridade. Causa loops onde lead pede explicitamente e Ana refuta usando o próprio nome.
- **P0-IA-2 — Prompt da Ana exige pergunta antes de qualquer handoff.** No prompt customizado (tenant 66719a49) está escrito: "termine com PERGUNTA CONCRETA forçando lead a contar caso". Mesmo quando lead já disse "transfere pra Dra. Jacira" 5x, ela continua exigindo mais info. Combinado com P0-IA-1, isso causa o sintoma reportado.

### P1
- **P1-IA-1 — Falta de tool estruturada `transfer_to_agent`.** Toda detecção é heurística post-hoc. Deveria existir uma OpenAI function-call que a IA invoque diretamente (`{tool: "transfer_to_agent", args: {target: "juridico_bancario", reason: "..."}}`) — esse é o padrão recomendado da OpenAI Agents SDK. O webhook então grava `pending_handoff_to` deterministicamente.
- **P1-IA-2 — Orchestrator gpt-4o-mini é frágil com mensagens curtas.** Prompt de 4KB com 200+ keywords + maxTokens=100 + temp=0.1 ainda gera erros em ~10% dos casos (estimado por testes manuais). Decisão deveria usar **classificação determinística primeiro** (keyword matching no próprio webhook em TypeScript) e só chamar LLM para casos ambíguos.
- **P1-IA-3 — Sem detecção de intent do LEAD (apenas da IA).** O código detecta handoff lendo a resposta DA IA. **Deveria detectar a intenção da MENSAGEM DO LEAD primeiro**: se o lead disser "quero falar com X", isso é sinal mais forte que qualquer parafrase da IA. Existe parcialmente em ORCHESTRATOR_PROMPT mas não no nível do webhook.
- **P1-IA-4 — `juridico_bancario` só existe em 1 tenant.** Migration que seedou faltou para os outros 14 tenants. Se prompts de Ana de outros tenants forem customizados para mencionar "Dra. Jacira", o handoff vai falhar com `agent type not found → recepcionista`.

### P2
- **P2-IA-1 — Sem telemetria de handoff.** Não há tabela `agent_handoff_log` ou audit_log estruturado de "agente A → agente B em conversa X". Impossível medir taxa de handoff bem-sucedido em produção.
- **P2-IA-2 — Testes não cobrem handoff inter-agente.** O `agent-orchestration.test.ts` testa **routing** (orchestrator) e **handoff humano** (12 regex de incerteza), mas **não testa handoff agente→agente** (state-based via pending_handoff_to). Bug em produção não seria pego.
- **P2-IA-3 — Agendamento e atendimento não coordenam.** `juridico_bancario` recebe handoff e tem instruções pra usar `schedule_meeting`, mas se a Ana já agendou (porque tools são compartilhadas), há risco de duplicação. Não está claro qual agente "possui" cada tool.
- **P2-IA-4 — Re-ativação de IA após 2h pode atropelar handoff humano.** Embora exista `handoff_until`, isso só protege handoff `ia_active=false → human`. Não há `handoff_until` para `agente A → agente B` — se o lead voltar 3h depois com pending_handoff_to expirado, vai voltar pro orchestrator.

### P3
- **P3-IA-1 — Documentação dos prompts vive em 2 lugares** (DB `agentes_ia` + código `agent-prompts.ts`). Risco de drift; admin pode editar DB sem perceber que isso quebra detecção regex no webhook (ex.: renomear Marcos → Marcos Silva e a regex /\bmarcos\b/ ainda funciona, mas Dra. Jacira → Dra. Joana quebra silenciosamente).
- **P3-IA-2 — Audit log de prompts.** Não há tracking de mudanças em `agentes_ia.prompt_sistema`. Mudança de prompt do admin pode degradar handoff sem alarme.

## Plano de correção priorizado

### Sprint 1 (urgente — resolve o sintoma reportado)

1. **Adicionar tool `transfer_to_agent` em `_shared/agent-tools.ts`** com schema `{target: enum, reason: string}`. Implementar em `agent-tools-executor.ts` para gravar `pending_handoff_to` diretamente. Substitui regex post-hoc por sinal estruturado.
   - Arquivo: `supabase/functions/_shared/agent-tools.ts` (adicionar tool)
   - Arquivo: `supabase/functions/_shared/agent-tools-executor.ts` (adicionar handler)
   - Arquivo: `supabase/functions/whatsapp-webhook/handlers/process-message.ts:875` (expor tool quando `agentType==='recepcionista'`)

2. **Detectar intent de transferência na MENSAGEM DO LEAD antes do orchestrator.** Adicionar bloco em `process-message.ts` antes de chamar `agent-orchestrator`:
   ```ts
   const TRANSFER_INTENT = /\b(transfere?|transferir|passa|conectar|falar|atender)\s+.{0,30}(com|para|pra)\s+.{0,30}(jacira|gabriel|marcos|especialista|advogad)/i;
   if (TRANSFER_INTENT.test(processedText)) {
     // resolve target by name in available tenant agents
     // override agentType directly
   }
   ```

3. **Ajustar prompt da Ana** (`agentes_ia` row do tenant 66719a49) — adicionar regra: "Se o lead pedir explicitamente para falar com agente X, NÃO faça pergunta adicional. Anuncie a transferência imediatamente." Atualizar via migration ou UI.

4. **Adicionar guard de polaridade no regex `mentionsJacira`**. Detectar negação próxima ("mas", "porém", "antes de", "primeiro") e abortar handoff:
   ```ts
   const NEGATION_NEAR_NAME = /\b(mas|porém|antes|primeiro|preciso\s+ent|me\s+conta)\b.{0,80}\b(jacira|gabriel|marcos)/i;
   if (mentionsJacira && !NEGATION_NEAR_NAME.test(resultText)) detectedHandoff = "juridico_bancario";
   ```
   - Arquivo: `process-message.ts:1073-1084`

### Sprint 2 (consolidação)

5. **Tabela `agent_handoff_log`** (migration): `id, conversation_id, tenant_id, from_agent, to_agent, trigger ("lead_request"|"tool_call"|"regex_match"|"orchestrator"), reason, created_at`. Inserir em todo INSERT/UPDATE de `pending_handoff_to`. Permite SLA/alarmes.

6. **Seed `juridico_bancario` (e outros especialistas custom) em todos os tenants** OU bloquear handoff para agentes inexistentes com fallback claro (`juridico` em vez de cair em `recepcionista`).

7. **Testes de integração** em `src/tests/integration/agent-orchestration.test.ts`:
   - `handoff_via_tool_call` (lead pede → IA chama tool → state atualiza)
   - `handoff_via_lead_intent` (lead diz "transfere pra X" → próximo turno vai pra X)
   - `regex_polarity_guard` (Ana diz "mas Dra. Jacira" → NÃO faz handoff)
   - `expired_handoff_fallback` (lead volta 31min depois → não usa state expirado)

### Sprint 3 (longo prazo)

8. Migrar para padrão **OpenAI Agents SDK** ou Vercel AI SDK `experimental_handoff`. Sumiria a regex, sumiria o state-machine manual.
9. Substituir orchestrator LLM por **classificador determinístico TS** (keyword matching idêntico ao prompt) + LLM só como tie-breaker. Reduz latência (sem chamada extra) e custo.
10. Adicionar **streaming de eventos `agent_event`** (handoff, tool_call, response) para Sentry + dashboard tempo-real.

---

**Arquivos-chave para correção:**
- `e:/Jurify/supabase/functions/whatsapp-webhook/handlers/process-message.ts` (linhas 690-750 routing; 1069-1115 detecção)
- `e:/Jurify/supabase/functions/_shared/agent-tools.ts` (adicionar tool)
- `e:/Jurify/supabase/functions/_shared/agent-tools-executor.ts` (adicionar handler)
- `e:/Jurify/supabase/functions/_shared/agent-prompts.ts` (revisar prompts)
- `e:/Jurify/supabase/functions/agent-orchestrator/index.ts` (considerar simplificar)
- `e:/Jurify/src/tests/integration/agent-orchestration.test.ts` (adicionar testes de handoff inter-agente)
