# 05 — Google Calendar & Agendamento IA

> Auditoria sênior 2026-05-25 · Foco prioritário #2: "ainda não tá perfeito na situação de marcar a reunião/call no Google Calendar".
> Owner: Alef Vieira (founder/eng).
> Cobertura: edge functions `google-calendar`, `whatsapp-webhook`, `process-meeting-reminders`; shared `agent-tools*`, `schedule-parser`; frontend `useGoogleCalendarConnection`, `GoogleAuthCallback`; produção `yfxgncbopvnsltjqetxw` (sa-east-1).

---

## Resumo executivo

O agendamento via WhatsApp **funciona em prod** — há exatamente 1 evento Calendar gerado pela IA (08/05/2026, lead "Eng.Alef Vieira" smoke test do próprio owner, agendamento `1b930a21` → Meet `meet.google.com/uhu-hppk-rpf`). Mas há **um bug P0 ABERTO que impede usuários novos de conectarem o Google Calendar** desde o Sprint 2 do postmortem (2026-05-07):

**`GoogleAuthCallback` não repassa o parâmetro `state` no exchangeCode** — o backend valida CSRF binding desde 20260507000013, mas o frontend nunca foi atualizado. Resultado: toda tentativa de conectar via UI hoje retorna HTTP 401 "Missing OAuth state — possible CSRF attempt". O único token que existe em prod (`jaciradossantosgomes5@gmail.com`) foi criado ANTES dessa migration e sobrevive porque o refresh token ainda gira.

Outros achados relevantes:
- **Dois fluxos paralelos de agendamento** disputando o mesmo turn no webhook (IA tool-calling + parser legacy regex), capazes de gerar UX confusa ("você já tem agendamento" sobrescrevendo confirmação da IA).
- **Timezone math frágil** em `schedule-parser.ts` — funciona por coincidência mas é manutenibilidade ruim e não cobre DST.
- **`agent_executions.status`** trava em `processing` para todos os 25 últimos runs — UPDATE final fire-and-forget perde a corrida com a finalização do edge runtime após Response.
- **Cobertura de testes raquítica** — testes batem só smoke (`expect(typeof connect).toBe('function')`); zero teste E2E ou contract test do fluxo OAuth completo.

Bom: RLS está forçada em `agendamentos`, `google_calendar_tokens`, `google_calendar_sync_logs`, `oauth_pending_states`, `conversation_state`. Escopo OAuth reduzido a `calendar.events` (mínimo). Tokens encriptados via AES-256-GCM com PBKDF2.

---

## Pipeline completo (do msg ao evento)

```
WhatsApp inbound (Kapso/Meta)
   │
   ▼
whatsapp-webhook (POST /functions/v1/whatsapp-webhook)
   │  • resolve tenant (estrita por phone_number_id, sem fallback frágil)
   │  • persiste mensagem, decifra/cifra content_encrypted
   │  • orquestrador IA escolhe agent (recepcionista/juridico/juridico_bancario/...)
   ▼
handlers/process-message.ts (1747 linhas)
   ├── [FLUXO A — IA tool-calling, linhas 851-979]
   │     • detecta hasActionIntent (agendar/marcar/remarcar/cancelar/horário)
   │     • buildToolContext(supabase, tenantId, leadId, responsavelId, responsavelNome)
   │     • callOpenAI com tools: AGENT_TOOLS, toolChoice: "auto"
   │     • loop até MAX_TOOL_ITERATIONS=4
   │     • executeAgentTool → tool_scheduleMeeting:
   │           1. supabase.rpc("try_acquire_schedule_slot", …)  ← advisory lock
   │           2. supabase.functions.invoke("google-calendar", action:"createEventForResponsavel")
   │              ↳ checa google_calendar_tokens, monta event com attendees+Meet+reminders
   │              ↳ POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all
   │           3. update agendamentos set google_event_id, link_videochamada
   │           4. insert google_calendar_sync_logs (status='success'|'error')
   │
   ├── [FLUXO B — Parser legacy regex, linhas 1213-1505]
   │     • SEMPRE roda depois do FLUXO A, independente
   │     • detectScheduleIntent + parseScheduleFromText (regex PT-BR)
   │     • se confidence >= 0.5 → checkAvailability + suggestSlots + try_acquire_schedule_slot
   │     • cria evento Calendar (lógica DUPLICADA em relação ao FLUXO A)
   │     • sobrescreve aiText com "Perfeito! Reunião agendada…" ou "Você já tem agendamento ativo"
   │
   ▼
send-reply → WhatsApp outbound (Kapso/Meta)
   │
   ▼ (T-30min antes do agendamento)
process-meeting-reminders (pg_cron a cada 15min)
   • busca agendamentos data_hora ∈ [now+25min, now+35min] + reminder_30min IS NULL
   • envia template WhatsApp com link Meet
   • marca reminder_30min=true
```

**Sync bidirecional Calendar→DB:** NÃO existe. Eventos modificados/deletados no Google Calendar fora do Jurify não são refletidos em `agendamentos`. Não há webhook Calendar Push Notifications registrado.

---

## Mapa de edge functions + tools de agente

### Edge functions

| Função | Métodos públicos | Métodos service-only (function-to-function) | Notas |
|--------|------------------|---------------------------------------------|-------|
| `google-calendar` | initiateAuth, exchangeCode, disconnect, status, listEvents, createEvent, updateEvent, deleteEvent, syncEvents, checkAvailability, suggestSlots | createEventForResponsavel, checkAvailabilityForResponsavel, suggestSlotsForResponsavel, updateEventForResponsavel, deleteEventForResponsavel | service-mode detectado via peek do body antes de exigir auth user; OK |
| `process-meeting-reminders` | (cron only, exige `isServiceRole`) | — | reminder T-30min apenas; **sem T-24h** apesar da doc CALENDAR_INTEGRATION_10_10 dizer 24h+2h |
| `whatsapp-webhook` | handler entry | — | dispara tool-calling + parser legacy |

### Tools de agente IA (`_shared/agent-tools.ts`)

| Tool | Args | Impl em `agent-tools-executor.ts` |
|------|------|----------------------------------|
| `check_availability` | start_iso, end_iso | invoca `checkAvailabilityForResponsavel` |
| `suggest_slots` | from_iso, slot_minutes?, count? | invoca `suggestSlotsForResponsavel` (seg-sex 8h-20h BRT, 7 dias) |
| `schedule_meeting` | start_iso, duration_minutes?, area_juridica?, observacoes? | `try_acquire_schedule_slot` + Calendar event |
| `reschedule_meeting` | new_start_iso, duration_minutes? | update agendamento + `updateEventForResponsavel` |
| `cancel_meeting` | reason? | status='cancelado' + `deleteEventForResponsavel` |
| `update_lead_kanban` | new_status, temperature?, reason? | UPDATE leads.status |

---

## Estado da OAuth Google

| Item | Estado | Observação |
|------|--------|------------|
| Client ID/Secret em Edge Secrets | OK (token criado existe) | `Google OAuth não configurado` retorna 503 caso ausente |
| Escopo solicitado | `calendar.events + userinfo.email + userinfo.profile` | mínimo possível para sensitive scope |
| CSRF binding server-side | OK no backend desde 20260507000013 | RPC `create_oauth_pending_state` + `consume_oauth_pending_state`, TTL 10min, single-use |
| **State propagado no frontend** | **QUEBRADO** | `useGoogleCalendarConnection.handleCallback(code)` ignora `state` — request ao `exchangeCode` retorna 400/401 sempre |
| Tokens encriptados | OK | AES-256-GCM via `_shared/crypto.ts`; colunas plaintext dropadas em 20260406000002 |
| Refresh token auto-renew | OK | `GoogleOAuthService.getValidToken` checa `expires_at` e dispara `refresh_token` grant; persiste novo access encriptado |
| Tokens em prod | **1 token** (Jacira) | Criado antes do binding CSRF; sobrevive via refresh |
| RLS `google_calendar_tokens` | enabled + forced + 7 policies | OK (correção da auditoria 2026-04-10) |
| Verification status Google | **NÃO VERIFICADO** | Limite 100 tokens vivos por client; warning "App not verified" no consent; checklist em `docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md` aguarda submissão manual do owner |

---

## Bugs conhecidos corrigidos vs em aberto

### Corrigidos (postmortem 2026-05-07)

1. `agendamentos.titulo NOT NULL` sem default → RPC gera titulo. (20260507000008)
2. `notify_lead_status_change` enum cast ausente → cast `::public.notification_type` (20260507000009)
3. `fn_agendamento_auto_tarefa` `criador_id = lead_id` → fallback admin/manager (20260507000010)
4. Race condition agendamento → `try_acquire_schedule_slot` com advisory lock (20260507000007)
5. UNIQUE defense-in-depth `(tenant_id, lead_id, minute_bucket)` + `instance_name` (20260507000015)
6. CSRF binding OAuth state server-side (20260507000013)
7. Scope reduzido `calendar` → `calendar.events` (auditoria 2026-04-10)
8. RLS `google_calendar_tokens` (auditoria 2026-04-10)

### Em aberto

| # | Severidade | Bug |
|---|------------|-----|
| 1 | **P0** | `GoogleAuthCallback` não envia `state` no exchange — UI de conectar Calendar quebrada |
| 2 | **P1** | Dois fluxos paralelos (IA tool-calling + parser legacy) podem disputar o mesmo turn e gerar UX inconsistente |
| 3 | **P1** | `agent_executions.status` trava em `processing` (100% dos últimos 25 runs em prod) — UPDATE final fire-and-forget |
| 4 | **P1** | Reminder T-24h declarado em docs (CALENDAR_INTEGRATION_10_10) mas só T-30min está implementado |
| 5 | **P2** | Timezone math em `schedule-parser.ts` (BRT_OFFSET fixo, `setHours` em "pseudo-BRT") — frágil mas funciona |
| 6 | **P2** | Sem sync bidirecional Calendar → Jurify (sem Calendar Push Notifications) |
| 7 | **P2** | `email` opcional no lead → tool_scheduleMeeting cria evento SEM attendee; cliente não recebe convite por email |
| 8 | **P2** | Google OAuth não verificado — warning + limite 100 tokens (escala bloqueada) |
| 9 | **P3** | Testes raquíticos (smoke-level apenas) — sem E2E do fluxo OAuth+Calendar |
| 10 | **P3** | `process-meeting-reminders` envia apenas para o lead, **nunca confirma se WhatsApp inbound (status janela 24h Meta)** existe — pode falhar silenciosamente |

---

## Hipóteses para falhas atuais (ranqueadas)

### H1 (mais provável) — Usuário tentou conectar Calendar e levou 401

Tela `GoogleAuthCallback.tsx:39` chama `handleCallback(code)`. Hook `useGoogleCalendarConnection.handleCallback(code)` chama `callOAuthFunction('exchangeCode', { code, redirectUri }, …)` — **sem state**. Backend `google-calendar/index.ts:311-315` faz:
```ts
if (!state || typeof state !== "string") {
  return new Response(JSON.stringify({ error: "Missing OAuth state — possible CSRF attempt" }), { status: 400 });
}
```
Resultado: UI mostra "Erro na Autenticação" → "Missing OAuth state — possible CSRF attempt", redireciona em 5s para `/configuracoes?tab=integracoes`. Usuário acha que "não conecta".

### H2 — Reschedule/cancel não funcionam se `lead.responsavel_id` não está setado

`buildToolContext` resolve `activeAgendamentoId` por `(lead_id, tenant_id, status in agendado/confirmado, future)`. Mas se o lead foi criado sem `responsavel_id` (caso default — 0/7 dos agendamentos em prod têm `responsavel_id` definido exceto o smoke test), o `tool_rescheduleMeeting` no Calendar PATCH skipa silenciosamente porque exige `ctx.responsavelId`.

### H3 — Lead sem email → Meet criado mas convite por email não enviado

`tool_scheduleMeeting` linha 178 atribui `attendeeEmails = ctx.leadEmail ? [ctx.leadEmail] : []`. No agendamento real do dia 08/05 o lead "Eng.Alef Vieira" não tem email (campo `lead_email = null`). Evento Calendar é criado, Meet é gerado, mas cliente WhatsApp NÃO recebe convite. UX: cliente recebe só o link Meet no texto do WhatsApp. Se fechar a conversa, perde o link.

### H4 — Sobrescrita de aiText pelo parser legacy

Sequência observada no código:
1. IA via tool-calling chama `schedule_meeting` → cria agendamento + retorna `aiText="Perfeito! Reunião marcada com Jacira em quinta às 10h. Meet criado."`
2. Saída do bloco try-catch.
3. Linha 1213 `leadWantsToSchedule = detectScheduleIntent(text)` — mensagem original ainda contém "marcar" → true.
4. Linha 1217 query `existingAgendamento` retorna o que IA acabou de criar → entra no branch da linha 1227.
5. **`aiText` é SOBRESCRITO** para "Você já tem um atendimento agendado…", apagando a confirmação detalhada da IA.

Isso explicaria o relato "marca a reunião mas não tá perfeito" — a IA confirma corretamente internamente mas o lead recebe uma mensagem fria/redundante.

### H5 — Reminder T-30min é o ÚNICO; doc promete T-24h também

Atende parcialmente a expectativa do usuário. Cliente pode esquecer da reunião sem o reminder D-1.

### H6 — Calendar Push Notifications ausente

Se a Jacira mover o evento manualmente no Google Calendar, Jurify continua mostrando horário antigo. UX confusa para o advogado.

### H7 — Agendamento futuro com weekend/feriado

`validateBusinessHours` recusa sábado/domingo (OK) mas NÃO conhece feriados brasileiros nacionais ou estaduais. Lead pede "agendar pra 7 de setembro às 10h" → marca normalmente; cliente acha que terá atendimento em feriado.

---

## Evidências de produção

| Métrica | Valor |
|---------|-------|
| Total agendamentos | 7 |
| Criados últimos 30 dias | 1 (smoke test 08/05) |
| Criados últimos 7 dias | 0 |
| Com `google_event_id` | 1/7 |
| Com `link_videochamada` (Meet) | 3/7 (2 dos seed) |
| Status `cancelado` | 0/7 |
| `google_calendar_tokens` em prod | 1 |
| `google_calendar_sync_logs` | 1 success, 0 errors |
| `agent_executions` recent: status='processing' (não finaliza) | 25/25 |
| RLS forced em `agendamentos`, `tokens`, `sync_logs`, `oauth_pending_states`, `conversation_state` | OK |

Agendamento 08/05 — pipeline fim-a-fim funcional:
- Lead: Eng.Alef Vieira / `559681419460` / email NULL
- Responsavel: `aebbf689` / jaciradossantosgomes5@gmail.com / Google conectado
- Data/hora: 2026-05-14 13:00 UTC = 10:00 BRT (parser interpretou "na quinta" → próxima quinta 10h default)
- Título gerado: `Consulta WhatsApp - Jacira Gomes (Nao informado)` ← área "Nao informado" do lead vazou no título
- Meet: `https://meet.google.com/uhu-hppk-rpf`
- `sync_logs`: action='create', status='success'

Nenhuma atividade WhatsApp inbound desde 2026-05-09 20:03 (último agent_execution).

---

## Achados P0/P1/P2/P3

### P0
1. **GoogleAuthCallback não envia OAuth state** — UI de conectar Google Calendar quebrada para qualquer novo tenant. Arquivos: `src/pages/GoogleAuthCallback.tsx:39`, `src/hooks/useGoogleCalendarConnection.ts:92-102`.

### P1
2. **Dois fluxos paralelos de agendamento** — tool-calling IA + parser legacy podem ambos rodar no mesmo turn. Arquivo: `supabase/functions/whatsapp-webhook/handlers/process-message.ts` (851-979 e 1213-1505).
3. **`agent_executions` UPDATE final fire-and-forget** — 25/25 últimas execuções travam em `processing`. Falta `await` antes do `.update().then(...)` na hot path. Arquivo: `process-message.ts:1009-1019`.
4. **Reminder T-24h faltando** — `process-meeting-reminders` só dispara T-30min. Lead esquece reunião 1 dia antes.

### P2
5. **Timezone math frágil** — `schedule-parser.ts:20,22,28,183` usa `setHours` em pseudo-BRT. Funciona por coincidência (Deno Edge é UTC), quebra ao mudar runtime ou se Brasil voltar com horário de verão.
6. **Sem Calendar Push Notifications (sync bidirecional)** — `google-calendar` edge function não registra watch channel; mudanças no Calendar fora do Jurify ficam invisíveis.
7. **Lead sem email não recebe invite por email** — `tool_scheduleMeeting` aceita `attendeeEmails=[]` silenciosamente. Lead só vê Meet via mensagem WhatsApp e perde se fechar conversa.
8. **Google OAuth verification pendente** — limite 100 tokens vivos + warning UX. Bloqueia escala. Checklist documentado mas não executado.
9. **Título do agendamento exibe "Nao informado"** quando área jurídica não foi extraída — UX pobre. Deveria omitir parêntese ou usar fallback "Consulta jurídica".
10. **`process-meeting-reminders` não respeita janela Meta 24h** — pode tentar enviar mensagem texto fora da janela; envio template não testado.

### P3
11. **Testes `useGoogleCalendarConnection.test.ts`** apenas validam `typeof connect === 'function'` — não cobririam o bug P0 atual.
12. **Sem testes de contrato Google Calendar API** (mocks fetch) no path `agent-tools-executor`.
13. **Sem E2E Playwright cobrindo connect → consent → callback → agendamento**.
14. **Sem feriados nacionais/estaduais** em `validateBusinessHours`.
15. **`webhook_events`** tem apenas `{id, event_id, source, created_at}` — sem campo `error_message` apesar do postmortem prometer "tag log estruturado para tenant_resolution_failed". Observabilidade insuficiente.

---

## Plano de correção priorizado

### Sprint imediato (1-2h) — P0

1. **Patch `useGoogleCalendarConnection.handleCallback`** para aceitar `state` e propagar:
   ```ts
   const handleCallback = useCallback(async (code: string, state: string) => { … callOAuthFunction('exchangeCode', { code, state, redirectUri }, …) });
   ```
2. **Patch `GoogleAuthCallback.tsx`** para extrair `state`:
   ```ts
   const code = searchParams.get('code');
   const state = searchParams.get('state');
   if (!state) throw new Error('OAuth state ausente — possível CSRF');
   await handleCallback(code, state);
   ```
3. Smoke test: tenant novo → conectar Calendar → token criado → status=connected.
4. Adicionar teste unitário cobrindo state propagation.

### Sprint 1 (4-6h) — P1

5. **Remover fluxo parser legacy** OU **gate por `!toolCallsExecuted`** para garantir que parser só roda se IA NÃO usou `schedule_meeting`. Recomendação: deletar bloco 1213-1505 inteiro (300 linhas de débito morto após tool-calling).
6. **Aguardar UPDATE final** de `agent_executions` (`await` em vez de `void … .then`).
7. **Adicionar reminder T-24h** ao `process-meeting-reminders` (segunda janela ou job dedicado `process-meeting-reminders-1day`).

### Sprint 2 (8-12h) — P2

8. Refatorar timezone: usar `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` em vez de aritmética manual.
9. Implementar Calendar Push Notifications (POST `/watch` na conexão, edge function `google-calendar-push-receiver` para receber updates, atualizar `agendamentos` bidirecional).
10. **Coletar email do lead via tool dedicado** (`update_lead_contact_info`) ou enriquecer prompts; sempre que email existir, anexar como attendee.
11. **Submeter OAuth verification** (depende do owner executar checklist).
12. Polir título: trocar `(Nao informado)` por omissão; fallback "Consulta jurídica via WhatsApp".

### Sprint 3 (sustentável) — P3

13. E2E Playwright: cobrir flow connect → callback → status; em prod com mock Google.
14. Testes contract Google Calendar API com `msw`.
15. Adicionar tabela `holidays` (feriados nacionais/estaduais) ao `validateBusinessHours`.
16. Enriquecer `webhook_events` com colunas estruturadas (`error_message`, `error_code`, `tenant_id`, `lead_id`, `severity`).

---

## Anexos

- **Pipeline detalhado:** `supabase/functions/whatsapp-webhook/handlers/process-message.ts` (1747 linhas)
- **Tool definitions:** `supabase/functions/_shared/agent-tools.ts`
- **Tool executor:** `supabase/functions/_shared/agent-tools-executor.ts`
- **Parser PT-BR:** `supabase/functions/_shared/schedule-parser.ts`
- **OAuth service:** `supabase/functions/google-calendar/google-oauth.ts`
- **OAuth callback page (bug P0):** `src/pages/GoogleAuthCallback.tsx`
- **OAuth hook (bug P0):** `src/hooks/useGoogleCalendarConnection.ts`
- **Postmortem original:** `docs/POSTMORTEM_2026-05-07.md`
- **Análise histórica:** `docs/HISTORICAL_IMPACT_ANALYSIS_2026-05-07.md`
- **Verification checklist:** `docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`
