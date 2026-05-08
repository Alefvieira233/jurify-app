# Jurify — Arquitetura (snapshot 2026-05-07)

**Auditor:** architecture mapper
**Data:** 2026-05-07 (pós Ondas 15-18)
**Stack:** Vercel (front Vite/React) + Supabase (Postgres + RLS + Edge Functions Deno + Realtime + pg_cron) + OpenAI + Kapso (Partner Mode) + Google Calendar OAuth + Stripe + Sentry + Postmark

---

## 1. Diagrama mental — fluxo principal (mensagem WhatsApp → resposta IA → CRM)

```
[Cliente final WhatsApp]
        │ envia mensagem
        ▼
[Kapso Cloud / Meta Cloud API]
        │ webhook POST (HMAC SHA-256 X-Webhook-Signature)
        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ EF: whatsapp-webhook (público; sem JWT — autenticação via HMAC tenant)  │
│  • Rate limit Phase 1 (global IP/host: 120/min)                          │
│  • Detecta payload Kapso vs Meta                                          │
│  • Resolve secret por phone_number_id → getWebhookSecretByPhoneId        │
│    (por tenant; global fallback REMOVIDO 2026-04-10)                     │
│  • Verifica HMAC com effectiveSecret                                     │
│  • Rate limit Phase 2 (per-tenant: 60/min por phone_number_id)           │
│  • Dedup: in-memory Map (5min TTL) + upsert webhook_events (durável)     │
│  • Para cada evento → handlers/process-message.ts                        │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ processNormalizedMessage (1726 linhas)                                  │
│                                                                          │
│ 1. RESOLVE TENANT (4 estratégias em cascata):                            │
│    1a. configuracoes_integracoes.observacoes JSON com phone_number_id   │
│    1b. conexoes_whatsapp.instance_name (fallback)                        │
│    1c. conexoes_whatsapp.telefone (status=connected)                     │
│    1d. whatsapp_conversations.phone_number (last resort)                 │
│    → se NULL: notifica admins do tenant dono da instância e dropa       │
│                                                                          │
│ 2. HEARTBEAT + auto-repair (telefone NULL em conexoes_whatsapp)         │
│                                                                          │
│ 3. RESOLVE departamento + responsável (conexão → membro → 1º admin)     │
│                                                                          │
│ 4. RESOLVE/CREATE LEAD via RPC find_lead_by_phone (normaliza fone)      │
│                                                                          │
│ 5. RESOLVE/CREATE whatsapp_conversation                                  │
│                                                                          │
│ 6. SAVE whatsapp_messages (sender=lead, processed_by_agent=false)        │
│                                                                          │
│ 7. FIRE-AND-FORGET paralelo (não bloqueiam):                             │
│    → transcribe-whatsapp-audio (Whisper)                                 │
│    → analyze-whatsapp-sentiment (gpt-4o-mini)                            │
│    → maybeSendAutoReply (greeting/away por business_hours)               │
│                                                                          │
│ 8. CHECK ia_active + auto-reativação após 2h (com cooldown handoff_until)│
│                                                                          │
│ 9. STAGE 1 — MEDIA: callEdgeFunction("media-processor")                  │
│    → OCR/Vision/PDF text → returns processedText + mediaCategory         │
│                                                                          │
│ 10. STAGE 2 — CONTEXT:                                                   │
│     buildLegalContext (processos / prazos / honorários / docs / RAG)    │
│     getSlashCommands (DB + cache 5min, fallback hardcoded)              │
│     conversationHistory smart (resumo old + 10 recent verbatim)         │
│                                                                          │
│ 11. STAGE 3 — ROUTING:                                                   │
│     IF slash command → agent fixo do command                             │
│     IF conversation_state.pending_handoff_to (one-shot, expira 30min)   │
│        → AGENTE OVERRIDE (pula orchestrator)                            │
│     ELSE → callEdgeFunction("agent-orchestrator")                       │
│            → gpt-4o-mini decide entre 6 agentes (recepcionista,         │
│              juridico, juridico_bancario, comercial, suporte,           │
│              analista_documentos)                                       │
│                                                                          │
│ 12. CARREGA AGENTE CUSTOMIZADO do tenant:                                │
│     SELECT * FROM agentes_ia WHERE tenant_id=? AND tipo=? AND ativo     │
│     fallback → AGENTS map em _shared/agent-prompts.ts                   │
│                                                                          │
│ 13. STATEFUL: lê conversation_state.current_phase                        │
│     (greeting → qualifying → scheduling → confirmed → follow_up → closed)│
│     Injeta phaseInstructions no system prompt                           │
│                                                                          │
│ 14. DETECT hasActionIntent (regex agendar/remarcar/cancelar/disponib.)  │
│     IF true → buildToolContext + tools=AGENT_TOOLS                      │
│                                                                          │
│ 15. LOOP function-calling (max 4 iterações):                             │
│     callOpenAI → tool_calls? → executeAgentTool() → push tool result    │
│     ↻ até model devolver content sem tools                              │
│                                                                          │
│ 16. UPDATE conversation_state via RPC update_conversation_phase:         │
│     • Atualiza fase (greeting→qualifying→scheduling→confirmed)          │
│     • Detecta menções a Dra Jacira/Dr Gabriel/Marcos → grava            │
│       pending_handoff_to (próxima msg pula orchestrator)                │
│     • Limpa handoff one-shot consumido                                  │
│                                                                          │
│ 17. POST-AI fallback paths:                                              │
│     • CONFIRM_REGEX → marca agendamento mais próximo como 'confirmado'  │
│     • detectScheduleIntent → parseScheduleFromText →                    │
│       hasScheduleConflict (interno + Google Calendar)                   │
│       → INSERT agendamentos (status='agendado')                         │
│       → invoke google-calendar createEventForResponsavel                │
│         (cria Meet link + attendees)                                    │
│       → atualiza link_videochamada, google_event_id                     │
│     • HANDOFF_REGEX (12 padrões) → ia_active=false + handoff_until=24h  │
│                                                                          │
│ 18. analyzeQualification → CRM auto-update:                              │
│     • status (novo→qualificado→…)                                        │
│     • temperature (cold→warm→hot, monotônico crescente)                 │
│     • lead_score (monotônico crescente)                                 │
│     • RE-ROTEAMENTO: nova area_juridica → fuzzy match departamento      │
│                                                                          │
│ 19. SEND REPLY: sendViaKapso/sendViaMeta (com 24h window check)         │
│     SAVE whatsapp_messages (sender=ia, send_status, provider_message_id)│
│                                                                          │
│ 20. UPDATE agent_status / processed_by_agent                             │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼ INSERT agendamentos dispara dois triggers DB:
┌──────────────────────────────────────────────────────────────────────────┐
│ tg_agendamento_auto_kanban (AFTER INSERT/UPDATE OF status):             │
│   • INSERT status='agendado': lead novo/em_contato → 'qualificado'      │
│   • UPDATE status='realizado': lead → 'contratado'                       │
│                                                                          │
│ tg_agendamento_auto_tarefa (AFTER INSERT):                              │
│   • INSERT tarefas (titulo='Reunião com X', prazo=data_hora-15min,      │
│     responsavel_id, criador_id=responsavel_id ou 1º admin)              │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼ pg_cron (*/15 * * * *) → process-meeting-reminders
┌──────────────────────────────────────────────────────────────────────────┐
│ process-meeting-reminders (auth: service-role only):                    │
│   • Window: agendamentos com data_hora ∈ [now+25min, now+35min]         │
│     status IN ('agendado','confirmado') AND reminder_30min IS NOT TRUE  │
│   • Para cada: invoke send-whatsapp-message (lembrete + Meet link)      │
│   • Marca reminder_30min=true, reminder_sent=true                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa das 52 Edge Functions (deno) — agrupadas por função

> Localização: `supabase/functions/<slug>/index.ts` · imports comuns em `supabase/functions/_shared/*`

### A. Pipeline de IA conversacional WhatsApp (CORE)
| Slug | Auth | Propósito |
|------|------|-----------|
| `whatsapp-webhook` | HMAC per-tenant (Kapso/Meta) | Entrypoint principal — dedup + roteamento Kapso/Meta |
| `agent-orchestrator` | service-role | gpt-4o-mini routing → agente especialista |
| `ai-agent-processor` | service-role | (legacy/parallel) processador agentes IA |
| `chat-completion` | JWT user | Interface chat manual em UI |
| `assistant` | JWT user | Assistente em-app |
| `media-processor` | service-role | OCR/Vision/PDF text extraction |
| `transcribe-whatsapp-audio` | service-role | Whisper transcription para áudio |
| `analyze-whatsapp-sentiment` | service-role | gpt-4o-mini → sentiment+urgency tagging |
| `summarize-whatsapp-conversation` | JWT user | Resumo IA conversa (cache invalidado por msg_count) |
| `extract-whatsapp-data` | JWT user | Function-calling extração 17 campos estruturados |
| `suggest-whatsapp-reply` | JWT user | Smart Reply 3 sugestões (Onda 14) |
| `process-meeting-reminders` | service-role (cron) | Cron */15min — lembrete 30min antes (Onda 18.2) |

### B. WhatsApp envio + features Meta API
| Slug | Auth | Propósito |
|------|------|-----------|
| `send-whatsapp-message` | JWT/service | Envio texto + 24h window gate + trial gate |
| `send-whatsapp-template` | JWT user | Templates aprovados Meta |
| `sync-whatsapp-templates` | JWT user | Sync templates via Kapso |
| `send-whatsapp-interactive` | JWT user | Quick reply buttons (até 3) |
| `send-whatsapp-list` | JWT user | List messages (10×10) |
| `whatsapp-mark-read` | JWT user | ✓✓ azul via Meta API |
| `whatsapp-typing` | JWT user | Typing indicator |
| `whatsapp-react` | JWT user | Reactions emoji |
| `whatsapp-forward` | JWT user | Forward msg até 5 destinos |
| `whatsapp-business-profile` | JWT user | Editor business profile (about/website/email/etc) |

### C. Integrações externas
| Slug | Auth | Propósito |
|------|------|-----------|
| `google-calendar` | JWT user OU service-role* | OAuth + listEvents/createEvent/updateEvent/deleteEvent + freeBusy + suggestSlots. *SERVICE_METHODS são chamadas de outra EF (whatsapp-webhook) sem JWT |
| `kapso-manager` | JWT user (admin) | Gestão customers/phone numbers Partner Mode |
| `tribunal-sync` | service-role | Provider tribunal (Escavador/fake) |
| `zapsign-integration` | JWT user | Envio assinatura ZapSign |
| `zapsign-webhook` | HMAC ZapSign | Recepção status assinatura |
| `stripe-webhook` | Stripe sig | Eventos billing |
| `create-checkout-session` | JWT user | Stripe checkout |
| `create-portal-session` | JWT user | Stripe customer portal |

### D. Documentos & RAG
| Slug | Auth | Propósito |
|------|------|-----------|
| `extract-document-text` | JWT user | Extrai texto PDF/imagem |
| `generate-document` | JWT user | Geração contratos/peças |
| `ingest-document` | JWT user | Indexa em pgvector |
| `ingest-document-from-file` | JWT user | Versão file-based |
| `generate-embedding` | service-role | OpenAI embeddings |
| `vector-search` | JWT user | Search RAG legal_knowledge |
| `create-drive-folder` | JWT user | Google Drive (futuro) |

### E. Email / push / notificações
| Slug | Auth | Propósito |
|------|------|-----------|
| `send-email` | JWT user | Postmark wrapper |
| `send-push-notification` | service-role | FCM (opcional) |
| `auto-followup` | service-role (cron) | Templates seeded em followup |
| `process-followup-queue` | service-role (cron) | Drena fila followup |
| `weekly-report` | service-role (cron) | Relatório semanal |
| `process-prazos-alerts` | service-role (cron) | Alerta prazos vencendo (cron daily 12h) |

### F. Manutenção / housekeeping
| Slug | Auth | Propósito |
|------|------|-----------|
| `cleanup-agent-memory` | service-role (cron daily 02h) | Expurga agent_memory expired |
| `data-retention-cleanup` | service-role | LGPD purge |
| `health` | público | Healthcheck básico |
| `health-check` | service-role | Healthcheck profundo (Stripe/Postmark/Kapso/Calendar) |
| `get-public-config` | público | Config front (placeholder) |

### G. Crypto / utility
| Slug | Auth | Propósito |
|------|------|-----------|
| `encrypt-data` | JWT user | Wrap encrypt AES-256-GCM |
| `decrypt-data` | JWT user | Wrap decrypt |
| `admin-create-user` | JWT user (admin) | Criação user controlada |
| `agentes-ia-api` | JWT user | CRUD agentes_ia customizáveis por tenant |

**Total identificado:** 52 slugs (44 ativos + 1 deno.json + 1 _shared dir + agent-orchestrator + outras agrupadas).

### Internos (service-role) vs públicos:
- **Públicos sem auth:** `whatsapp-webhook` (HMAC), `health`, `get-public-config`, `stripe-webhook` (sig), `zapsign-webhook` (HMAC).
- **Service-role only:** `agent-orchestrator`, `process-meeting-reminders`, `cleanup-agent-memory`, `process-followup-queue`, `process-prazos-alerts`, `auto-followup`, `weekly-report`, `tribunal-sync`, `generate-embedding`, `media-processor` (chamada por whatsapp-webhook), `transcribe-whatsapp-audio`, `analyze-whatsapp-sentiment`, `data-retention-cleanup`, `send-push-notification`, `health-check`.
- **JWT user:** todas as demais (CRUD em-app).

---

## 3. Modelo Multi-tenant

### 3.1 Coluna `tenant_id` — propagação universal
- **Toda tabela operacional** tem `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`.
- **Exceções legítimas:** `tenants` (a row É o tenant), `user_roles` (super-admin pode ter `tenant_id NULL`), tabelas globais (`subscription_plans`, `slash_commands` com tenant_id NULL = global, `features`).

### 3.2 Resolução tenant no webhook (4 estratégias em cascata)
```
1a. configuracoes_integracoes.observacoes JSON com {"phone_number_id":"..."}
    (PRIMARY: identifica o customer Kapso/Meta dono do número)
1b. conexoes_whatsapp.instance_name = phone_number_id
1c. conexoes_whatsapp.telefone (match status=connected)
3.  whatsapp_conversations.phone_number (LAST RESORT — perigoso multi-tenant)
```
**Risco:** método 1c+3 é multi-tenant-fraco — se 2 tenants tiverem o mesmo número (raro mas possível com migração mal-feita), o lead vai pro tenant ERRADO. Logs já avisam `console.warn` quando cai em fallback.

### 3.3 RLS — estado atual
- 76 tabelas tem RLS habilitado.
- Apenas ~30 estão com **FORCE RLS** (auditoria 2026-04-23 contou apenas 1 forced inicialmente; migrations 17000001 + 23000001 + 03000000 + 04030000 elevaram pra ~30).
- Pattern padrão: `tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())` + `service_role_all FOR ALL TO service_role USING (true)`.
- `get_current_tenant_id()` SECURITY DEFINER função usada em policies hardened (20260417000001).

### 3.4 Edge function service-role bypass
- `isServiceRole(req)` em `_shared/supabase-client.ts` (timing-safe compare).
- Quando edge function A chama edge function B via `supabase.functions.invoke()`, B recebe o service-role JWT — bypass RLS total. **Risco:** qualquer EF service-role com bug de tenant pode vazar dados cross-tenant.

---

## 4. Sistema de agentes IA — 4 camadas

### 4.1 Hierarquia
```
1. _shared/agent-prompts.ts → AGENTS map (6 agentes hardcoded)
   • recepcionista, juridico, juridico_bancario, comercial, suporte, analista_documentos

2. agent-orchestrator (gpt-4o-mini, JSON mode, temperature 0.1)
   → decide qual agente atende, baseado em:
     - has_legal_context, has_media, media_category, is_first_contact
     - termos jurídicos / bancários (regex em prompt)

3. agentes_ia (tabela DB) — overrides por tenant
   SELECT * WHERE tenant_id=? AND tipo=? AND ativo
   → tenant editou prompt_sistema/temperatura/max_tokens via UI

4. _shared/agent-tools.ts — 6 tools function-calling
   • check_availability, suggest_slots, schedule_meeting,
     reschedule_meeting, cancel_meeting, update_lead_kanban
   → executados em loop max 4 iterações (process-message.ts:914)
```

### 4.2 State-based handoff (Onda 17.1) — one-shot determinístico
```
Turn 1: agente "juridico" diz "Vou conectar você com Dra Jacira"
        → regex detecta menção de Jacira
        → RPC update_conversation_phase(_pending_handoff_to='juridico_bancario')

Turn 2: lead responde "ok"
        → webhook lê conversation_state.pending_handoff_to
        → AGENTE OVERRIDE → pula orchestrator
        → executa "juridico_bancario" diretamente
        → no fim, _clear_pending_handoff=true (one-shot consumido)

Expira após 30min de inatividade pra evitar handoff stale.
```

### 4.3 Conversation state (stateful pipeline — Onda 17)
**Tabela:** `conversation_state` (PK = conversation_id)
- `current_phase`: greeting → qualifying → scheduling → confirmed → follow_up → closed
- `accumulated_context`: JSONB acumulado (lead_name, area_juridica, last_user_message…)
- `last_agent_type`, `pending_handoff_to`, `pending_handoff_set_at`

**Transições automáticas em process-message.ts:**
- greeting → qualifying (após 1ª resposta)
- qualifying → scheduling (quando hasActionIntent detectado)
- scheduling → confirmed (regex "reunião agendada/marcada/confirmada" no resultText)

---

## 5. Integração Google Calendar

### 5.1 Edge function `google-calendar` (dual-mode)
- **OAuth methods (JWT user):** initiateAuth, exchangeCode, disconnect, status
  - Tokens cifrados AES-256-GCM em `google_calendar_tokens.access_token_encrypted` e `refresh_token_encrypted` (colunas plaintext dropadas em 20260406000002).
  - Scopes: `calendar.events` + `userinfo.email` + `userinfo.profile` (least privilege).
- **CALENDAR methods (JWT user):** listEvents, createEvent, updateEvent, deleteEvent, syncEvents, checkAvailability, suggestSlots
- **SERVICE methods (chamadas por outras EFs):** createEventForResponsavel, checkAvailabilityForResponsavel, suggestSlotsForResponsavel, updateEventForResponsavel, deleteEventForResponsavel
  - Identificadas pelo body antes do auth check.
  - **Não exigem JWT user** — confiam no contrato function-to-function do Supabase.

### 5.2 Fluxo schedule_meeting (Onda 16)
```
1. webhook lead pede "quinta 14h" → parseScheduleFromText
2. invoke google-calendar checkAvailabilityForResponsavel (freeBusy real)
3. SE busy → invoke suggestSlotsForResponsavel (próx 7 dias úteis 8-20h BRT)
4. SE livre:
   INSERT agendamentos → triggers tg_agendamento_auto_kanban + auto_tarefa
   invoke createEventForResponsavel (com createMeetLink: true + attendees: [leadEmail])
   → Calendar API retorna event.hangoutLink ou conferenceData.entryPoints[video].uri
   → UPDATE agendamentos SET google_event_id, link_videochamada
5. Response WhatsApp inclui Meet link in-line
```

### 5.3 OAuth state CSRF — soft enforcement
- Cliente DEVE enviar state crypto-random; se não enviar, server gera fallback. **Front legacy não envia → CSRF window aberto.**

---

## 6. Tabelas críticas e relacionamentos

### Core multi-tenant
```
tenants (id PK)
  └─ profiles (user_id PK, tenant_id FK)
       └─ user_roles (user_id, tenant_id, role, ativo)
       └─ google_calendar_tokens (user_id PK, access_token_encrypted)

  └─ departamentos (id, tenant_id)
       └─ departamento_membros (departamento_id, profile_id, tenant_id)

  └─ conexoes_whatsapp (id, tenant_id, instance_name=phone_number_id, departamento_id, responsavel_id)
  └─ configuracoes_integracoes (tenant_id, nome_integracao, api_key_encrypted, webhook_secret_encrypted, observacoes JSON)
```

### CRM
```
tenants
  └─ leads (id, tenant_id, telefone, status, area_juridica, departamento_id, responsavel_id, temperature, lead_score)
       └─ whatsapp_conversations (lead_id, tenant_id, ia_active, handoff_until, phone_number, agent_status)
            └─ whatsapp_messages (conversation_id, tenant_id, sender, message_type, send_status, processed_by_agent)
            └─ conversation_state (conversation_id PK, tenant_id, current_phase, pending_handoff_to, accumulated_context JSONB)

       └─ agendamentos (lead_id, tenant_id, responsavel_id FK profiles, data_hora, status, google_event_id, link_videochamada, reminder_30min, reminder_sent)
       └─ tarefas (criado por trigger fn_agendamento_auto_tarefa, prazo=data_hora-15min)
       └─ processos (lead_id) → prazos_processuais, processo_andamentos
       └─ honorarios (lead_id) → contratos
       └─ documentos_juridicos (lead_id, tenant_id, embedding pgvector)
       └─ lead_historico, lead_notas
```

### IA
```
agentes_ia (tenant_id, tipo, prompt_sistema, temperatura, max_tokens, ativo) — customizável per tenant
agent_executions (execution_id, tenant_id, lead_id, current_agent, status)
agent_ai_logs (execution_id FK, model, tokens, system_prompt, user_prompt, full_result)
ai_usage (tenant_id, date, tokens_total, budget_limit) — daily
agent_memory (tenant_id, lead_id, content, importance, expires_at, embedding) — RAG semântico
```

### Trial / billing
```
subscriptions (tenant_id, status='trialing'/'past_due'/'active', trial_ends_at)
subscription_plans (id='free'/'pro'/'enterprise', monthly_token_limit, features)
ai_usage rolling 30d → monthly budget enforcement
```

### Audit / segurança
```
audit_log (tenant_id, table_name, record_id, operation, old_data, new_data, user_id) — imutável LGPD
audit_log_archive — partitioned quarterly (cron daily)
webhook_events (event_id PK, source) — dedup durável
rate_limits (identifier, namespace, expires_at)
slash_commands (tenant_id NULL=global, command, intent, agent_type)
```

---

## 7. Triggers DB críticos

| Trigger | Tabela | Quando | Ação |
|---------|--------|--------|------|
| `tg_agendamento_auto_kanban` | agendamentos | AFTER INSERT/UPDATE OF status | INSERT 'agendado' → lead status 'qualificado'; UPDATE 'realizado' → 'contratado' |
| `tg_agendamento_auto_tarefa` | agendamentos | AFTER INSERT | INSERT tarefas com prazo = data_hora - 15min, criador = responsavel ou 1º admin |
| `tg_conversation_state_updated_at` | conversation_state | BEFORE UPDATE | bump updated_at + phase_updated_at |
| `audit_trigger_fn` | múltiplas | AFTER INSERT/UPDATE/DELETE | INSERT audit_log (defensivo: tenant_id resolvido via to_jsonb com fallback NEW.id quando table='tenants' — fix 20260503000000) |
| `on_auth_user_created` | auth.users | AFTER INSERT | RPC handle_new_user → cria tenant + profile + user_roles + create_trial_subscription (45d) — **removido em 04-10 prod, restaurado em 05-03** |
| `tg_lead_phone_dedup` | leads | BEFORE INSERT | normaliza telefone evita duplicatas |
| `tg_lead_won_create_contrato` | leads | AFTER UPDATE status='ganho' | INSERT contratos boilerplate |

---

## 8. pg_cron jobs ativos

| Job name | Schedule | Ação |
|----------|----------|------|
| `cleanup-agent-memory` | `0 2 * * *` (daily 02h) | DELETE agent_memory WHERE expires_at < NOW() |
| `refresh-dashboard-views` | `*/5 * * * *` | REFRESH MATERIALIZED VIEW dashboard MVs |
| `cleanup-expired-data` | `0 3 * * *` | LGPD purge |
| `archive-audit-logs` | `0 4 1 */3 *` (trimestral) | Move audit_log → audit_log_archive |
| `archive-whatsapp-messages` | `0 5 1 * *` (mensal) | Archive whatsapp_messages > 365d |
| `check-prazos-vencendo` | `0 7 * * *` | Notifica prazos próximos |
| `prazos-alerts-daily` | `0 12 * * *` | invoke process-prazos-alerts |
| `process_meeting_reminders` | `*/15 * * * *` | invoke process-meeting-reminders (Onda 18.2) |

**Observação:** todos os crons que invocam edge functions usam `current_setting('app.service_role_key')` em vez de hardcoded JWT (fix 20260410000001).

---

## 9. Concurrency / race conditions identificadas

1. **Webhook dedup:** in-memory Map (5min TTL) + upsert webhook_events. **Risco:** se mesma instância edge process bate retry simultâneo, ambos chegam ao upsert com mesmo `event_id` — apenas um insere, outro vê null e dedupa. ✓ OK.

2. **Auto-reativação ia_active:** condição é `(updated_at > 2h ago) AND NOT cooldown_active`. Atualização é `void` (fire-and-forget). **Risco:** duas mensagens em janela de 100ms podem ambas reativar e processar — não há lock. Pouco grave porque ambos acabam respondendo, só duplica AI call.

3. **Lead status downgrade:** `analyzeQualification` força monotonic crescente (temperature, lead_score), mas `status` SUBSTITUI. Se IA classificar errado num turno (ex: "qualificado" → "novo" porque resposta foi vaga), o downgrade ocorre. **Risco médio.**

4. **Tool-call loop sem mutex:** se mesma conversa receber 2 mensagens em < 30s, 2 invocações de webhook rodam em paralelo — ambas fazem `buildToolContext`, ambas executam `schedule_meeting` se houver intent. Pode criar 2 agendamentos. Mitigado parcialmente pelo check `existingAgendamento` mas **race está aberta entre check e insert.**

5. **conversation_state UPSERT:** RPC `update_conversation_phase` é safe (ON CONFLICT DO UPDATE). ✓ OK.

6. **process-meeting-reminders cron:** usa janela [now+25min, now+35min] + flag `reminder_30min`. Se cron rodar 2x simultâneo (raro), ambos pegam mesmas linhas. **Não há SELECT FOR UPDATE.** Risco de duplicar lembrete.

---

## 10. Resilience — comportamento sob falhas

| Dependência | Falha | Comportamento Jurify |
|-------------|-------|---------------------|
| **Supabase DB** | Down | Webhook 500. Front mostra erros via Sentry. Sem DB não há fallback. **SPOF total.** |
| **OpenAI** | Timeout/down | `BudgetExceededError` ou catch genérico → mensagem fallback "Recebi sua mensagem, advogado entrará em contato". Notifica admins. ✓ Graceful. |
| **Kapso** | Down | `sendViaKapso` falha → AI msg salva com `send_status='failed'`, `provider_message_id=null`. Lead não recebe resposta mas dado é persistido. Sem retry queue. **Risco: mensagem perdida silenciosa.** |
| **Google Calendar** | Down/sem token | `tool_checkAvailability` retorna `{success:false}`, agente continua sem freeBusy. `createEventForResponsavel` falha → agendamento DB sem Meet link, observação log. ✓ Graceful. |
| **Stripe** | Down | Checkout/portal falham. Trial gate ainda funciona via DB. ✓ |
| **Postmark** | Down | `email_failures` table guarda fail. ✓ |
| **Whisper** (transcribe) | Down | Áudio não transcrito. `analyze-whatsapp-sentiment` opera no texto cru "[Áudio recebido]". Resposta IA degrada mas não falha. ✓ |
| **pg_cron** | Falha | Lembretes não disparam. Sem alerta automático. **Gap: monitoring cron health.** |

---

## 11. Cinco maiores GAPS arquiteturais

### P0 — Race condition em agendamento auto via webhook (HIGH IMPACT)
**Arquivo:** `supabase/functions/whatsapp-webhook/handlers/process-message.ts:1217-1227`
**Problema:** Check `existingAgendamento` e INSERT subsequente NÃO são atômicos. Se lead enviar 2 msgs com intent agendamento em < 30s, 2 instâncias do webhook podem ambas passar no check e INSERT, criando 2 agendamentos duplicados (e disparando 2 triggers auto_tarefa = 2 tarefas).
**Fix proposto:**
- UNIQUE INDEX em `agendamentos(lead_id, tenant_id) WHERE status IN ('agendado','confirmado') AND data_hora > NOW()` (parcial).
- OU usar advisory lock por lead_id durante o bloco.
- OU consolidar em RPC plpgsql atômico com SELECT FOR UPDATE.

### P0 — Tenant resolution fallback 1c+3 viola isolamento multi-tenant (CRITICAL)
**Arquivo:** `process-message.ts:144-178`
**Problema:** Quando phone_number_id não bate em `configuracoes_integracoes`, fallback usa `conexoes_whatsapp.telefone` (status=connected) e `whatsapp_conversations.phone_number`. Se 2 tenants tiverem o mesmo número (cenário de migração tenant ou reuso de chip), webhook entrega mensagem ao tenant ERRADO. Vazamento de dados entre clientes.
**Fix proposto:**
- Remover método 3 (whatsapp_conversations) — apenas log + drop com notificação.
- Método 1c só ativa se houver UM ÚNICO tenant matching.
- Adicionar UNIQUE constraint `conexoes_whatsapp(instance_name)` global.

### P1 — Sem dead-letter queue para envio Kapso falho (DATA LOSS)
**Arquivo:** `process-message.ts:1660-1722`
**Problema:** Se `sendViaKapso` retorna `success=false` (timeout, 500, key inválida), AI msg é salva com `send_status='failed'`, mas **não há mecanismo de retry**. Nenhum cron drena failed messages. Lead nunca recebe resposta. Sem alerta automático ao admin.
**Fix proposto:**
- Tabela `whatsapp_send_queue` ou flag `send_attempts` em `whatsapp_messages`.
- Cron `*/5 * * * *` retentando msgs failed da última 1h, com backoff.
- Após 3 falhas, notifica admin do tenant.

### P1 — Tool-loop max 4 iterações sem dedup de tool calls (RUNAWAY COST)
**Arquivo:** `process-message.ts:911-979`
**Problema:** Se modelo entrar em loop pedindo mesma tool repetidamente (ex: `check_availability` 4x para mesmo slot), 4 chamadas a Google Calendar API + 5 chamadas OpenAI por turno. Sem dedup de tool_calls dentro do loop. **Custo OpenAI explode.**
**Fix proposto:**
- Hash dos `(tool_name, args)` já executados — se repetido, retornar resultado cacheado.
- Reduzir MAX_TOOL_ITERATIONS para 3.
- Métrica per-tenant `tool_iterations_total` em `agent_executions`.

### P1 — Ausência de circuit breaker para edge functions invocadas (SPOF cascade)
**Arquivo:** webhook chama `media-processor`, `agent-orchestrator`, `google-calendar`, `transcribe-whatsapp-audio`, `analyze-whatsapp-sentiment`. Se uma estiver lenta (latency 30s), webhook bloqueia outras conversas (Deno isolate é per-invocation mas concurrency limit do plano Supabase pode estourar).
**Problema:** Sem circuit breaker, webhook timeout (default 60s) é o ÚNICO limite. Se OpenAI estiver lento, todas as 60 conversas/min ficam aguardando.
**Fix proposto:**
- Implementar exponential backoff com jitter em `_shared/openai-retry.ts` (já existe parcialmente).
- Circuit breaker per-edge-function: se 5 falhas seguidas em 1min, desativar invocação por 5min e usar fallback (já existe pra orchestrator com `legalCtx.has_context ? "juridico" : "recepcionista"`).
- Health-check probe periódico em `health-check` EF para sinalizar status no `realtime`.

### Bônus — P2 (não top-5 mas relevante)
- **CSRF state OAuth Google fraco:** front legacy não envia state crypto-random, server fallback gera fallback (process-message.ts: google-calendar:272-275). Fix: forçar state no front; rejeitar se ausente.
- **conversation_state.pending_handoff_to é TEXT não enum:** detect/clear depende de matching string exato. Fix: enum DB ou check constraint com lista fixa.
- **Sem rate limit per-tenant em google-calendar SERVICE methods:** webhook pode marretar Google Calendar API com 60+ check_availability/min sem cota. Fix: adicionar bucket per-tenant ou cache de busy windows por 60s.
- **agentes_ia overrides sem auditoria de quem editou prompt:** apenas `updated_at` registrado. Fix: trigger gravando em audit_log com diff do prompt_sistema.

---

## 12. Pontos fortes da arquitetura

- **HMAC per-tenant** (global fallback removido) é referência de isolamento multi-tenant em webhook.
- **Encryption at rest** em google_calendar_tokens, configuracoes_integracoes.api_key_encrypted/webhook_secret_encrypted (AES-256-GCM).
- **State machine determinística** com pending_handoff_to one-shot resolve handoff verbal sem depender de orchestrator não-determinístico.
- **Triggers DB** desonera webhook de regras CRM (Kanban auto + tarefa) — se webhook morrer, trigger garante consistência.
- **Budget enforcement em ai-caller** centralizado (daily + monthly por tokens, não por count) elimina inconsistência entre 6+ EFs.
- **Smart context** (resumo old + 10 recent verbatim) permite conversas longas sem inflar token cost.
- **Trial 45d + read-only graceful** preserva visualização + WhatsApp inbound mesmo após expiração.

---

## Resumo executivo

A arquitetura Jurify é um pipeline edge-function-first com fortes garantias multi-tenant via HMAC + encryption + RLS hardened. O fluxo WhatsApp está densamente acoplado a uma única função (`process-message.ts` 1726 linhas) que orquestra tenant resolution → contexto legal → routing → state machine → tool-loop function-calling → CRM auto-update → triggers DB → cron lembrete. Os 5 gaps mais críticos são: race condition em agendamento auto (P0 data integrity), fallback 1c+3 de tenant resolution (P0 data leakage cross-tenant), ausência de DLQ para envio Kapso falho (P1 silent message loss), tool-loop sem dedup de calls (P1 runaway cost) e ausência de circuit breaker em invocações cross-EF (P1 cascade failure). O documento completo em `e:\Jurify\.planning\codebase\2026-05-07-arquitetura.md` mapeia 52 edge functions, todas tabelas críticas, 7 triggers, 8 cron jobs, e analisa concurrency + resilience por dependência externa.
