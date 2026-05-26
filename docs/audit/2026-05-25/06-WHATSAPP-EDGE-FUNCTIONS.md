# 06 — WhatsApp Pipeline & Edge Functions

> Auditoria 2026-05-25 — Área: WHATSAPP PIPELINE + EDGE FUNCTIONS
> Projeto Supabase: `yfxgncbopvnsltjqetxw` (Jurify, sa-east-1, ACTIVE_HEALTHY)
> Total edge functions deployadas: **53** (paridade local ↔ remote 100%)

---

## Resumo executivo

O pipeline WhatsApp está **bem arquitetado** (defesa em profundidade: HMAC per-tenant, dedup 2 camadas, rate-limit 2 fases, tenant resolution estrita pós-P0, trial-gate em outbound, janela 24h, retry exponencial, auto-reactivate IA com cooldown, handoff regex+state, LGPD consent log, sentiment+transcribe fire-and-forget). Foram entregues 53 functions cobrindo as 18 ondas. No entanto há **silêncio operacional crítico** confirmado nos logs das últimas 24h:

| Categoria | Status |
|-----------|--------|
| **WhatsApp inbound (webhook)** | **ZERO eventos nas últimas 24h** — Kapso continua silencioso desde 2026-04-11. Reativação no `app.kapso.ai` ainda pendente. |
| **Cron jobs (GitHub Actions)** | **TODOS retornando 401** — `auto-followup`, `weekly-report`, `process-prazos-alerts`, `notify-expiring-trials`, `health-check`. `HEALTH_CHECK_TOKEN` e/ou `SUPABASE_SERVICE_ROLE_KEY` ainda dessincronizados. |
| **stripe-webhook** | **503 recorrente** — `STRIPE_WEBHOOK_SECRET` provavelmente ausente/inválido. |
| **tribunal-sync** | 400 recorrente — payload inválido ou `TRIBUNAL_PROVIDER` mal configurado. |
| **data-retention-cleanup** | 500 — exception interna na execução manual. |
| **Edge function logs do whatsapp-webhook** | **VAZIO em 24h** — não há sequer rejeição de requisições. Confirmação inequívoca de que Kapso não está disparando. |

Conclusão: a engenharia do webhook está pronta para produção, mas **a integração ponta-a-ponta está OFF** por dependência operacional externa (Kapso webhook desativado + cron tokens errados). Sem essas reativações nenhuma das ondas 1-18 entrega valor real ao cliente.

---

## Inventário completo

53 functions ACTIVE no projeto `yfxgncbopvnsltjqetxw`. Tabela ordenada por grupo funcional.

### Grupo WhatsApp (17 functions — todas ACTIVE)

| Função | verify_jwt | Versão | Último update | Trial-gate | Notas |
|--------|-----------|--------|---------------|-----------|-------|
| `whatsapp-webhook` | false | 162 | 2026-05-08 | n/a (inbound) | Entrypoint Kapso+Meta. **Sem tráfego 24h.** |
| `send-whatsapp-message` | true | 109 | 2026-05-09 | ✅ `send_whatsapp` | Outbound principal. 24h window enforcement. |
| `send-whatsapp-template` | true | 3 | 2026-04-30 | ✅ | Templates Meta aprovados. |
| `send-whatsapp-interactive` | true | 3 | 2026-04-30 | ✅ | Buttons. |
| `send-whatsapp-list` | true | 3 | 2026-04-30 | ✅ | Lists 10×10. |
| `whatsapp-react` | true | 3 | 2026-04-30 | ✅ | Reactions. |
| `whatsapp-forward` | true | 3 | 2026-04-30 | ✅ | Forward msg. |
| `whatsapp-mark-read` | true | 3 | 2026-04-30 | ❌ **Falta** | Marca ✓✓ azul. |
| `whatsapp-typing` | true | 3 | 2026-04-30 | ❌ **Falta** | Typing indicator. |
| `whatsapp-business-profile` | true | 3 | 2026-04-30 | ❌ **Falta** | Edita profile. |
| `sync-whatsapp-templates` | true | 3 | 2026-04-30 | ❌ **Falta** | Sync com Meta. |
| `suggest-whatsapp-reply` | true | 3 | 2026-05-04 | ✅ `ai_responder` | Smart Reply IA Onda 14. |
| `summarize-whatsapp-conversation` | true | 3 | 2026-04-30 | ❌ **Falta** | Resumo IA. |
| `extract-whatsapp-data` | true | 3 | 2026-04-30 | ❌ **Falta** | Extração estruturada. |
| `analyze-whatsapp-sentiment` | true | 3 | 2026-04-30 | ❌ **Falta** | Sentiment IA Onda 11. |
| `transcribe-whatsapp-audio` | true | 2 | 2026-05-04 | ❌ **Falta** | Whisper. |
| `media-processor` | true | 61 | 2026-04-09 | n/a (interno) | OCR + media extraction. |

### Grupo IA / Agentes (5)

| Função | verify_jwt | Versão | Notas |
|--------|-----------|--------|-------|
| `agent-orchestrator` | false | 62 | Decide qual agente atender. Chamado pelo webhook. |
| `agentes-ia-api` | true | 96 | CRUD agentes (frontend). |
| `ai-agent-processor` | true | 97 | Pipeline IA. |
| `chat-completion` | true | 81 | Chat genérico (assistant). |
| `assistant` | true | 70 | Helper IA. |

### Grupo Documentos / Vetores (5)

| Função | verify_jwt | Notas |
|--------|-----------|-------|
| `generate-document` | true | Geração PDFs/DOCs. |
| `extract-document-text` | true | OCR. |
| `ingest-document` | true | Pipeline embeddings. |
| `ingest-document-from-file` | true | Upload + embed. |
| `vector-search` | true | RAG. |
| `generate-embedding` | true | Embeddings OpenAI. |

### Grupo Billing / Stripe (3)

| Função | verify_jwt | Status logs | Notas |
|--------|-----------|-------------|-------|
| `create-checkout-session` | true | OK | Stripe checkout. |
| `create-portal-session` | true | OK | Portal cliente. |
| `stripe-webhook` | false | **503 recorrente** | Falha no signature verify ou env ausente. |

### Grupo Integrações Externas (5)

| Função | verify_jwt | Status | Notas |
|--------|-----------|--------|-------|
| `kapso-manager` | true | OK | CRUD config Kapso. Master mode aware. |
| `google-calendar` | false | OK (200 nos schedules) | OAuth + agendamento. Chamado pelo webhook. |
| `create-drive-folder` | true | n/a | Google Drive. |
| `zapsign-integration` | false | n/a | Assinatura digital. |
| `zapsign-webhook` | false | n/a | Callback ZapSign. |

### Grupo Cron / Scheduled (8 — **TODOS 401 nas últimas 24h**)

| Função | verify_jwt | Cron | Status atual |
|--------|-----------|------|--------------|
| `data-retention-cleanup` | true | 02:00 UTC | **500** (último run manual quebrou) |
| `process-prazos-alerts` | true | seg-sex 09:00 UTC | **401** |
| `auto-followup` | false | diário 09:00 UTC | **401** |
| `weekly-report` | false | seg 07:00 UTC | **401** |
| `cleanup-agent-memory` | true | dom 03:00 UTC | sem log |
| `tribunal-sync` | false | a cada 6h | **400** (input inválido) |
| `process-meeting-reminders` | false | implícito | sem log |
| `notify-expiring-trials` | false | diário 13:00 UTC | **401** |

### Grupo Utilitários (8)

| Função | verify_jwt | Notas |
|--------|-----------|-------|
| `health` | false | 200 OK (responde) |
| `health-check` | false | **401** — token errado dos crons |
| `get-public-config` | false | Debug helper (commit a8c47e1) — considerar remover |
| `admin-create-user` | true | Admin tools |
| `encrypt-data` / `decrypt-data` | true | Wrapper crypto |
| `send-email` | true | Postmark |
| `send-push-notification` | true | FCM |
| `process-followup-queue` | true | Worker fila |

---

## WhatsApp webhook — análise profunda

**Path:** `supabase/functions/whatsapp-webhook/index.ts` (414 linhas) + `handlers/process-message.ts` (1748 linhas, **monstro de complexidade**) + `process-status-update.ts`, `qualification.ts`, `send-reply.ts`, `edge-function-client.ts`.

### Validações (forte)

1. **HMAC per-tenant estrito** (sem fallback global). Cabeçalho `x-webhook-signature` ou `x-kapso-signature` validado via `verifyHmacSignature` contra `webhook_secret_encrypted` de `configuracoes_integracoes`. Sem header → 401. Sem tenant secret → 401. (Removido em 2026-04-10 P0-3.)
2. **Verify token (Meta GET)**: usa env `WHATSAPP_VERIFY_TOKEN` + DB encrypted; comparação `timingSafeCompare` contra timing attacks.
3. **Rate-limit 2 fases**: global (120/min) pre-parse + per-tenant (60/min) por `phone_number_id`, ambos `denyOnDbFailure=true` (fail-closed contra DB outage).
4. **Dedup 2 camadas**: `processedMessages` Map em memória (TTL 5min) + upsert atômico em `webhook_events(event_id, source)` com `ignoreDuplicates`. Sem race entre SELECT+INSERT.
5. **Suporte 3 formatos de payload Kapso**: direct array, `{events:[...]}`, `{data:[...]}`, single. + Meta Official (entry/changes).
6. **PII redaction nos logs** via `redactPII()` antes de printar.

### Tenant resolution (pós-P0 2026-05-07)

Apenas DUAS estratégias permitidas:
- **PRIMARY:** `phone_number_id` exato no JSON de `configuracoes_integracoes.observacoes` (ILIKE `%"phone_number_id":"X"%`).
- **FALLBACK 1b:** `conexoes_whatsapp.instance_name` = phoneId.

Removidos os fallbacks frouxos por telefone do lead (1c) e por última conversa (3) — esses vazavam contexto entre tenants. Sem match → **drop com notificação só pros tenants do `instance_name`** (não broadcast cross-tenant).

### Pipeline (process-message.ts) — 13 estágios

1. Resolve tenant (estrita).
2. Heartbeat + auto-repair `telefone` em `conexoes_whatsapp`.
3. Resolve departamento + responsavel (3 fallbacks).
4. Resolve/cria `lead` via RPC `find_lead_by_phone` (normaliza variantes).
5. Resolve/cria `whatsapp_conversation` + LGPD consent log no 1º contato.
6. INSERT em `whatsapp_messages` com `message_id` (fix commit `cd58812`).
7. Audio → transcribe fire-and-forget (Whisper).
8. Sentiment IA fire-and-forget (gpt-4o-mini).
9. Auto-reply (greeting/away) fire-and-forget.
10. Check `ia_active` + auto-reactivate ≥2h se sem cooldown `handoff_until`.
11. Media processing via `media-processor`.
12. Build context (legal_context RAG + history smart-summary) + state-based handoff + orchestrator routing.
13. Loop OpenAI com tools (até 4 iterações), update `conversation_state` phase + handoff detection (Jacira/Gabriel/Marcos), CONFIRM regex, schedule intent + try_acquire_schedule_slot RPC, HANDOFF_REGEX 12 patterns → cooldown 24h, qualifica lead + notifica, sendViaKapso/Meta + retry exponencial, salva resposta IA com `send_status`.

### Pontos frágeis / débitos

- **Arquivo `process-message.ts` com 1748 linhas** — viola Onda O2 (decomposição). Refatoração em pipeline stages está pendente.
- **3 chamadas a `google-calendar`** dentro do hot path do agendamento (`checkAvailabilityForResponsavel`, `suggestSlotsForResponsavel` 2×, `createEventForResponsavel`) — síncronas, podem somar 5-10s. Bom para UX mas sem timeout explícito além do default 15s.
- **`findByConversationOrPhone` em `whatsapp-window.ts`** usa `.or(phone_number.eq.X,phone_number.eq.+X)` — não cobre variantes `55(11)…`. Combinado com `find_lead_by_phone` RPC para leads (cobre normalização) — mas window check pode ter false-negative em formatações divergentes.
- **HANDOFF_REGEX `mentionsJacira/Gabriel/Marcos` hardcoded** — não tenant-aware. Para outros escritórios, esses nomes são ruído (pode disparar handoff falso).
- **Slash commands**: cache 5min em-memória NÃO invalida quando admin edita via UI. Atualização DB demora até 5min para refletir.
- **`webhook_events` insert para unresolved** (linha 162) usa `event_id = unresolved_{Date.now()}_{from}` — não respeita `onConflict event_id+source`, pode gerar PK collision em alta concorrência.

### Pontos fortes

- Trial-gate corretamente OUT do webhook inbound (cliente pode receber sempre; só outbound bloqueia).
- Budget-exceeded path com fallback friendly + notif admin (não silencioso).
- Empty content from OpenAI → fallback explícito (não envia string vazia).
- `agent_executions` + `agent_ai_logs` rastreabilidade completa por execution_id.
- `try_acquire_schedule_slot` RPC com `pg_try_advisory_xact_lock` resolve race condition de agendamento concorrente (commit `c479dab` P0 race fix).

---

## Kapso integration

**Master/Partner Mode** (commit `532b805`, 2026-05-04):
- `KAPSO_MASTER_API_KEY` (Edge Secret) preferido em `getTenantKapsoConfig`.
- Header `X-Kapso-Customer-Id` setado em todas requests quando `customer_id` está em `observacoes` JSON — isola dados por tenant na conta master Kapso.
- Fallback legacy (`api_key_encrypted` per-tenant) mantido — 14 tenants ainda em modo antigo até wizard novo migrar.

**Webhook secret per-tenant**: lookup em `getWebhookSecretByPhoneId` — ILIKE `%"phone_number_id":"X"%` em `configuracoes_integracoes.webhook_secret_encrypted` decrypted. Sem secret cadastrado → 401.

**Estado de produção (CRÍTICO):**
- Confirmado pelo log `mcp__claude_ai_Supabase__get_logs(edge-function)`: **zero hits em `/whatsapp-webhook` nas últimas 24h.**
- Memória do projeto: silêncio Kapso desde **2026-04-11**.
- Causa-raiz provável: webhook desativado/desconfigurado em `app.kapso.ai` no painel de cada customer (não existe API platform pra reativar via código).
- Ação operacional pendente (não-código): logar no painel master Kapso e reativar/reconfigurar webhook URL para cada `phone_number_id`.

---

## Pipeline ponta-a-ponta (diagrama ASCII)

```
┌─────────────────┐
│ WhatsApp client │  (lead enviou msg)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Meta WA Cloud → Kapso       │
└────────┬────────────────────┘
         │ POST + HMAC sig + X-Webhook-Event
         ▼
┌───────────────────────────────────────────────────────┐
│ supabase.co/functions/v1/whatsapp-webhook (verify_jwt=false) │
│  1. CORS                                              │
│  2. Rate-limit global 120/min (fail-closed)           │
│  3. Parse JSON (3 shapes Kapso + Meta)                │
│  4. Resolve phone_number_id                           │
│  5. Rate-limit per-tenant 60/min (fail-closed)        │
│  6. Lookup webhook_secret_encrypted (per-tenant)      │
│  7. Verify HMAC (timingSafeCompare)                   │
│  8. Dedup (in-memory Map + webhook_events upsert)     │
│  9. Route Kapso vs Meta                               │
└────────┬──────────────────────────────────────────────┘
         │ for each event (batch loop)
         ▼
┌───────────────────────────────────────────────────────┐
│ processNormalizedMessage(supabase, msg)               │
│  ┌─────────────────────────────────────────────────┐  │
│  │ TENANT_RESOLUTION (estrita, post-P0)            │  │
│  │   PRIMARY: observacoes JSON phone_number_id     │  │
│  │   FALLBACK: conexoes_whatsapp.instance_name     │  │
│  │   ELSE → drop + notifica só tenants matching    │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ LEAD + CONVERSATION (resolve/create)            │  │
│  │   find_lead_by_phone RPC | LGPD consent log     │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ INSERT whatsapp_messages (msg_id, send_status)  │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌────────────────┬──────────────┬──────────────┐     │
│  │ FIRE-FORGET:   │              │              │     │
│  │ transcribe     │ sentiment IA │ auto-reply   │     │
│  │ (Whisper)      │ (gpt-4o-mini)│ greeting/away│     │
│  └────────────────┴──────────────┴──────────────┘     │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ia_active gate + handoff_until cooldown check   │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ media-processor (OCR / vision)                  │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ buildLegalContext (RAG) + conversation history  │  │
│  │ summary (compress >10 msgs)                     │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ROUTING: slash cmd | handoff_override |         │  │
│  │ agent-orchestrator → agentes_ia (tenant custom) │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ OpenAI loop (gpt-4o-mini, 4 tool iters max)     │  │
│  │ tools: check_availability, suggest_slots,       │  │
│  │ schedule_meeting, move_kanban, etc.             │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ POST-PROCESS: CONFIRM regex, schedule intent +  │  │
│  │ try_acquire_schedule_slot RPC, Google Calendar  │  │
│  │ event + Meet link, HANDOFF_REGEX (12 patterns)  │  │
│  │ + cooldown 24h, lead qualification (status,     │  │
│  │ area, temp, score) + auto re-route departamento │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ sendViaKapso(retry 2x exp) | sendViaMeta        │  │
│  └────────────────┬────────────────────────────────┘  │
└───────────────────┼───────────────────────────────────┘
                    ▼
            ┌────────────────┐
            │ Kapso → Meta   │ → WhatsApp client recebe resposta
            └────────────────┘
                    │
                    ▼  (status update webhook callback)
            ┌──────────────────────┐
            │ processStatusUpdate  │ — delivered/read/failed
            └──────────────────────┘
```

### Pontos onde pode falhar silenciosamente

| Ponto | Risco | Mitigação atual |
|-------|-------|-----------------|
| Kapso não dispara webhook | **ALTO (estado atual!)** | Nenhum monitor passivo. Cron `health-check` deveria pingar mas está 401. |
| Tenant resolution falha | MÉDIO | Notif só pros tenants matching, msg dropada. |
| OpenAI empty content | MÉDIO | Fallback friendly mais log error. |
| Send Kapso 5xx persistente | MÉDIO | Retry 2x exp, depois `send_status=failed` no DB. |
| Budget exceeded | BAIXO | Fallback canned + notif admin. |
| Calendar sync 4xx | BAIXO | Best-effort (catch + warn), agendamento ainda persiste. |
| Audio transcribe falha | BAIXO | Sentiment ainda roda no texto raw. |
| Auto-reply spam loop | BAIXO | `whatsapp_auto_reply_log` cooldown 4h away. |

---

## Logs recentes (últimas 24h)

Coletado via `mcp__claude_ai_Supabase__get_logs(service=edge-function)`:

```
POST 400  tribunal-sync                  (recorrente, 4× em 24h)
POST 503  stripe-webhook                 (recorrente)
GET  200  health                          OK
GET  401  health-check                   (recorrente — token errado)
POST 401  notify-expiring-trials         (cron)
POST 401  auto-followup                   (cron)
POST 401  process-prazos-alerts           (cron)
POST 401  weekly-report                   (cron)
POST 500  data-retention-cleanup          (exception interna)
```

**Notável (ausência):**
- **ZERO entradas para `whatsapp-webhook`** em 24h → Kapso silencioso confirmado.
- **ZERO entradas para qualquer `send-whatsapp-*`** → frontend não está acionando outbound (faz sentido: sem inbound, sem conversa aberta, e janela 24h fecha tudo).
- **ZERO entradas para `agent-orchestrator`** → consistente.

---

## Achados P0/P1/P2/P3

### P0 — Bloqueadores produto-em-pé

**P0-1 — Kapso webhook desativado em `app.kapso.ai`** (operacional, não código)
- Estado: silêncio desde 2026-04-11, confirmado por log 0 hits 24h.
- Ação: logar no painel master Kapso e reconfigurar webhook URL `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook` para cada customer/phone_number_id. Salvar webhook_secret retornado pela Kapso em `configuracoes_integracoes.webhook_secret_encrypted` (cada tenant).

**P0-2 — Cron jobs todos 401** (operacional)
- `HEALTH_CHECK_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` ou ambos em `repo > Settings > Secrets > Actions` estão dessincronizados ou rotacionados sem update.
- Impacto: prazos não viram alertas WhatsApp, follow-up não dispara, weekly-report não envia, trials não expiram automaticamente, retention LGPD parada (linha 33 `data-retention-cleanup` valida `HEALTH_CHECK_TOKEN`).
- Ação: rotar e re-setar os 3 secrets em GitHub Actions; testar manualmente via `workflow_dispatch`.

**P0-3 — `stripe-webhook` 503 recorrente**
- `STRIPE_WEBHOOK_SECRET` provavelmente ausente em Edge Secrets ou Stripe Dashboard apontando endpoint errado.
- Impacto: assinaturas Stripe não sincronizam (`tenant_subscriptions` desatualizado), checkouts bem-sucedidos não viram active no DB.
- Ação: validar `supabase secrets list | grep STRIPE`, validar endpoint em dashboard Stripe.

### P1 — Robustez

**P1-1 — `data-retention-cleanup` 500**
- Exception não tratada no run manual (provavelmente RLS ou tabela mudou schema). Investigar `mcp__claude_ai_Supabase__get_logs` específico do `function_id` e ajustar.

**P1-2 — `tribunal-sync` 400**
- Provavelmente payload do cron `{"batch": true}` não compatível com schema esperado, ou `TRIBUNAL_PROVIDER` env não setado (fica em `fake` default mas valida input).

**P1-3 — Faltam trial-gates em 6 functions outbound**
- `whatsapp-mark-read`, `whatsapp-typing`, `whatsapp-business-profile`, `sync-whatsapp-templates`, `summarize-whatsapp-conversation`, `extract-whatsapp-data`, `analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio` não chamam `checkTrialAccess`.
- Justificativa parcial: typing/mark-read são cheap. Mas summarize/extract/transcribe consomem OpenAI/Whisper → trial expirado deveria bloquear (ação `ai_responder`).
- Ação: adicionar `checkTrialAccess(supabase, tenantId, 'ai_responder')` no início dessas 4 functions IA.

**P1-4 — `handlers/process-message.ts` 1748 linhas**
- Monstro de complexidade. Decomposição em estágios (recommended): `resolveTenantAndLead`, `extractAndProcessMedia`, `routeToAgent`, `runAIWithTools`, `postProcessSchedule`, `sendAndPersist`.
- Risco: bugs sutis acumulando, difícil de testar unidade.

**P1-5 — `webhook_events` insert para unresolved sem ON CONFLICT**
- Linha 162 `index.ts` (handlers/process-message.ts): event_id = `unresolved_${Date.now()}_${from}` — sob bursts pode colidir.
- Fix: usar `crypto.randomUUID()` ou source diferente.

**P1-6 — `mentionsJacira/Gabriel/Marcos` hardcoded**
- Tenant-specific names hardcoded no codebase (regex em ~linha 1074). Outros escritórios podem disparar handoff falso por coincidência.
- Fix: ler nomes de `agentes_ia.nome` por tenant + montar regex dinâmico (com cache).

### P2 — Higiene

**P2-1 — `get-public-config`** marcado como "debug helper" (commit `a8c47e1`) em produção. Decidir: documentar como permanente ou remover.

**P2-2 — `health-check` v97 retornando 401** — função existe, mas está rejeitando tokens conhecidos. Provavelmente espera `x-health-check-token` diferente.

**P2-3 — `cache` em-memória dos slash_commands não invalida** — 5min de atraso após edit.

**P2-4 — CORS** — `cors.ts` reflete origin se em allow-list. Solid. Apenas verificar que `https://app.jurify.com.br` está incluído se for o domínio prod real (atualmente lista tem `jurify.com.br` sem `app.`).

**P2-5 — `auto-reply.ts isWithinBusinessHours` usa UTC-3 fixo** — não respeita DST nem outros fusos. Para São Paulo basta porque DST foi extinto, mas comentário no código já reconhece a fraqueza.

### P3 — Cosméticos

**P3-1 — Logs ainda têm muitos `console.log` em vez de `logger`** — apesar de `_shared/logger.ts` existir, o webhook usa `console.*` direto (PII filtragem manual via `redactPII`).

**P3-2 — `whatsapp-window.ts` `.or(phone.eq.X, phone.eq.+X)`** não cobre variantes de formatação. Standardizar com `find_lead_by_phone` RPC ou função SQL similar.

---

## Recomendações (prioridade decrescente)

1. **HOJE — Reativar Kapso webhook** em `app.kapso.ai` para todos customers. Testar com mensagem real ao número WA + monitorar log do webhook em tempo real (Supabase Studio). Sem isso nada do produto WhatsApp funciona.

2. **HOJE — Rotar e re-setar 3 secrets em GitHub Actions** (`SUPABASE_SERVICE_ROLE_KEY`, `HEALTH_CHECK_TOKEN`, `SUPABASE_PROJECT_REF`). Executar todos workflows via `workflow_dispatch` manualmente e confirmar 200.

3. **HOJE — Investigar `STRIPE_WEBHOOK_SECRET`** + validar endpoint Stripe Dashboard apontando para `…/functions/v1/stripe-webhook`. Sem isso checkouts ficam órfãos.

4. **SEMANA — Adicionar trial-gate em 4 functions IA** (summarize, extract, transcribe, sentiment). Padrão: `checkTrialAccess(supabase, tenantId, 'ai_responder')` + `trialBlockedResponse`.

5. **SEMANA — Investigar `tribunal-sync 400` e `data-retention-cleanup 500`** — pegar `function_id` em get_logs e olhar stack trace.

6. **SPRINT — Refatorar `process-message.ts` em 6 estágios** (1748 → 6×~290 linhas). Cobertura de teste por estágio.

7. **SPRINT — Tenant-aware HANDOFF_REGEX** — ler nomes de `agentes_ia` por tenant e construir regex dinâmico cacheado 5min.

8. **SPRINT — Migrar `console.*` → `logger.ts`** estruturado em todas functions WhatsApp pra ter logs JSON parsáveis em Sentry/observability futuro.

9. **OPCIONAL — Dead-letter queue**: tabela `whatsapp_failed_messages` para casos `send_status=failed` permitir retry manual via UI admin.

10. **OPCIONAL — Health endpoint específico do webhook** que retorne timestamp do último evento processado (`SELECT MAX(created_at) FROM webhook_events WHERE source='whatsapp'`). Acoplar a alerta Discord/Slack quando `> 1h sem eventos` em horário comercial.
