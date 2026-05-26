# Plano 10/10 — Jurify referência absoluta do mercado jurídico BR

**Autor:** Auditoria sênior 2026-05-25
**Solicitado por:** Alef (CEO)
**Objetivo:** transformar o Jurify em produto inquestionável para escritórios de advocacia brasileiros — funcionando perfeitamente, atendendo 100% das necessidades operacionais, com diferenciais competitivos defensáveis.

---

## Filosofia do plano

1. **Destravar antes de construir.** Resolver os 11 P0 e 8 OP da auditoria — o produto JÁ existe, só não está em prod por chaves/painéis/bugs específicos.
2. **Polir até o último detalhe.** O que existe (53+ edge functions, 33 features) precisa funcionar com confiança 99,9%, não 95%.
3. **Completar gaps que travam adoção.** Cálculos jurídicos, prazos automáticos via OCR, peticionamento eletrônico, portal do cliente — itens sem os quais escritórios médios/grandes não migram.
4. **Compliance é diferencial de venda.** LGPD + OAB + ISO viram argumentos comerciais, não custos.
5. **Cada fase entrega valor isolado.** Nada é "preparar para o futuro" — toda fase é vendível.

---

## Métrica de sucesso ("10/10")

| Pilar | Como medimos 10/10 |
|---|---|
| **Operacional** | 0 downtime > 5min/mês · 100% das integrações ativas · 0 P0 abertos |
| **Performance** | FCP < 1s · LCP < 1,5s · Lighthouse 95+ · API p99 < 500ms |
| **Confiabilidade** | Crash-free sessions ≥ 99,9% · MTTR < 30min · backup testado mensalmente |
| **Segurança** | 0 advisors ERROR · ISO 27001 ready · LGPD/OAB compliance certificado · pentest anual |
| **Adoção** | Onboarding < 10min · 70% tenants ativos D-30 · ≥ 8 NPS · churn mensal < 3% |
| **Funcionalidade** | Cobre 95% dos casos de uso de um escritório com 1-50 advogados sem precisar de SaaS adicional |
| **IA** | Handoff bem-sucedido ≥ 95% · agendamento ponta-a-ponta sem retrabalho ≥ 90% · taxa de aceitação de sugestões IA ≥ 60% |

---

## Resumo das 6 fases

| Fase | Tema | Duração | Esforço | Resultado |
|---|---|---|---|---|
| **0** | Destravamento operacional | 1 semana | 30h dev + 25min CEO | Produto roda 100% em prod, sintomas reportados resolvidos |
| **1** | Estabilização + dívida técnica | 2 semanas | 40h | CI verde, alertas reais, arquitetura sem duplicações, testes E2E robustos |
| **2** | Excelência no core (WhatsApp + IA + Calendar) | 3 semanas | 80h | Handoff 95%+, agendamento sem retrabalho, IA com tools 100% function-calling |
| **3** | Diferenciais jurídico BR (10 frentes) | 6-8 semanas | 200h | OCR jurídico, cálculos automáticos, peticionamento, portal cliente, jurisprudência, financeiro pleno, departamentos granulares |
| **4** | Compliance, escala, certificações | 3-4 semanas | 80h | ISO 27001 ready, multi-região, disaster recovery, OAB Provimento 205 |
| **5** | Growth e expansão | 6-8 semanas | 120h | API pública, mobile app, marketplace de templates, programa de partners |

**Total para 10/10 completo:** ~550h dev (~5-6 meses calendário com 1 dev sênior full-time) + ações operacionais do CEO.

---

# FASE 0 — Destravamento operacional (semana 1)

> **Objetivo:** após esta semana, o Jurify roda 100% em produção, os 2 sintomas que o CEO reportou estão resolvidos, e a operação fica observável.

## 0.1 — Ações do CEO (~25min em painéis externos)

| ID | Ação | Painel | Como |
|---|---|---|---|
| **OP-1** | Reativar webhook Kapso | `app.kapso.ai` | Login → Webhooks → URL deve ser `https://<project>.supabase.co/functions/v1/whatsapp-webhook` → testar com mensagem real |
| **OP-2** | Rotar `SUPABASE_SERVICE_ROLE_KEY` + `HEALTH_CHECK_TOKEN` | GitHub Actions Secrets | Settings → Secrets → atualizar ambos. Token novo do Supabase Dashboard → Settings → API |
| **OP-3** | `STRIPE_WEBHOOK_SECRET` | Supabase Edge Secrets | `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx`. Pegar do dashboard Stripe → Developers → Webhooks |
| **OP-4** | `VITE_SENTRY_DSN` no Vercel | vercel.com | Settings → Environment Variables (prod) → add. Depois redeploy |
| **OP-5** | HIBP no Supabase Auth | Supabase Dashboard | Authentication → Policies → "Leaked password protection" toggle on |
| **OP-6** | Postgres 17.4 → 17.6 | Supabase Dashboard | Database → Upgrades → schedule maintenance window |
| **OP-7** | Branch protection `main` | GitHub Settings | Branches → add rule `main` → require PR + checks `ci.yml`, `e2e.yml`, `pre-commit-check.yml` + dismiss stale reviews |
| **OP-8** | Sentry → Slack/Discord | sentry.io | Settings → Integrations → Slack/Discord webhook → alerts em production errors |

**Definition of done (DoD) Fase 0.1:** Kapso webhook recebe mensagens em prod, todas as 8 crons retornam 200, Stripe webhook 200, Sentry recebe eventos test, redeploys do main exigem PR.

## 0.2 — P0 técnicos (eu, ~30h)

### P0-9 — CI vermelho (XS · 15min)
**Arquivo:** [src/tests/integration/whatsapp-webhook.test.ts](src/tests/integration/whatsapp-webhook.test.ts)
**Linhas:** ~195 e ~403
**Fix:** atualizar fixture esperando 7 chaves (incluir `messageId` add no commit `cd58812`).
**DoD:** `npm run test -- --run` 1516/1516, CI verde.

### P0-7 — Cross-tenant leak (XS · 10min)
```sql
-- migration nova: 20260525000001_close_remaining_acesso_total.sql
DROP POLICY IF EXISTS "Acesso total autenticado" ON public.agent_ai_logs;
DROP POLICY IF EXISTS "Acesso total autenticado" ON public.agent_executions;
-- as policies tenant-aware já existem (criadas em 20260507000017); estas são as residuais legacy
```
**DoD:** `mcp__claude_ai_Supabase__get_advisors security` → 0 issues nessas tabelas. Teste manual com 2 tenants confirma isolamento.

### P0-10 — Sentry DSN sanity (XS · 5min)
**Após OP-4 do CEO:** verificar em prod via console que `Sentry.getCurrentHub().getClient()` não é `undefined`. Disparar erro de teste via `/throw-test-error` (criar rota oculta temporária).
**DoD:** evento aparece no Sentry dashboard em < 60s.

### P0-4 — OAuth Google Calendar callback (S · 1-2h)
**Arquivo:** [src/features/conexoes/GoogleAuthCallback.tsx:39](src/features/conexoes/GoogleAuthCallback.tsx#L39) + [src/features/conexoes/hooks/useGoogleCalendarConnection.ts](src/features/conexoes/hooks/useGoogleCalendarConnection.ts)
**Fix:**
```tsx
// GoogleAuthCallback.tsx
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state'); // ← adicionar
const error = params.get('error');
if (error) throw new Error(error);
if (!code || !state) throw new Error('Missing OAuth parameters');
await handleCallback(code, state);

// useGoogleCalendarConnection.ts
async function handleCallback(code: string, state: string) {
  const { data, error } = await supabase.functions.invoke('google-calendar', {
    body: { action: 'oauth_callback', code, state },
  });
  if (error) throw error;
  return data;
}
```
**Teste:** unit test cobrindo (1) ausência de state → throw, (2) state válido → passa.
**Manual:** novo usuário conecta Calendar com sucesso.
**DoD:** test passa + smoke test do CEO com conta nova OK.

### P0-1 + P0-2 + P0-3 — Handoff de agentes (M · 5h)

**P0-2: Tool estruturada `transfer_to_agent`**
**Novo arquivo:** [supabase/functions/_shared/agent-tools.ts](supabase/functions/_shared/agent-tools.ts)
```typescript
export const transferToAgentTool = {
  type: 'function' as const,
  function: {
    name: 'transfer_to_agent',
    description:
      'Transfere a conversa para outro agente especialista. Use SOMENTE quando o cliente pedir explicitamente ou quando o caso fugir do seu escopo definido.',
    parameters: {
      type: 'object',
      properties: {
        target_agent_type: {
          type: 'string',
          enum: ['juridico', 'juridico_bancario', 'comercial', 'suporte', 'analista_documentos'],
          description: 'Tipo do agente alvo. Deve existir no tenant.',
        },
        reason: {
          type: 'string',
          description: 'Motivo curto do handoff (1 frase) para registrar no audit log.',
        },
        handoff_message: {
          type: 'string',
          description: 'Mensagem curta para o cliente confirmando a transferência. Ex: "Vou te transferir para a Dra. Jacira, especialista em direito bancário. Um momento."',
        },
      },
      required: ['target_agent_type', 'reason', 'handoff_message'],
    },
  },
};

export async function executeTransferToAgent({
  args,
  supabase,
  conversationId,
  tenantId,
}: {
  args: { target_agent_type: string; reason: string; handoff_message: string };
  supabase: SupabaseClient;
  conversationId: string;
  tenantId: string;
}) {
  const { data: agent } = await supabase
    .from('agentes_ia')
    .select('id, nome, ativo')
    .eq('tenant_id', tenantId)
    .eq('tipo', args.target_agent_type)
    .eq('ativo', true)
    .maybeSingle();

  if (!agent) {
    return {
      success: false,
      error: `Agente ${args.target_agent_type} não disponível neste tenant`,
      fallback_message: 'Vou continuar atendendo você. Pode me contar mais sobre seu caso?',
    };
  }

  await supabase.from('conversation_state').upsert(
    {
      conversation_id: conversationId,
      tenant_id: tenantId,
      pending_handoff_to: args.target_agent_type,
      handoff_reason: args.reason,
      handoff_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
    { onConflict: 'conversation_id' }
  );

  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    action: 'agent_handoff',
    entity_type: 'conversation',
    entity_id: conversationId,
    metadata: { from: args.target_agent_type, reason: args.reason },
  });

  return { success: true, message: args.handoff_message };
}
```

**P0-1: Detecção de intent na mensagem do LEAD (não no output da IA)**
**Arquivo:** [supabase/functions/whatsapp-webhook/handlers/process-message.ts](supabase/functions/whatsapp-webhook/handlers/process-message.ts) ANTES do call ao orchestrator (linha ~690)
```typescript
const TRANSFER_PATTERNS = [
  /transfer(?:e|ir|ÊNCIA|ência|a-me)\s+(?:para|pro|com)\s+(\w+)/i,
  /quero\s+falar\s+(?:com|diretamente\s+com)\s+(?:a\s+)?(?:dra?\.?\s+)?(\w+)/i,
  /(?:posso|pode)\s+(?:me\s+)?(?:transferir|passar)\s+(?:para|pro|com)\s+(?:a\s+)?(?:dra?\.?\s+)?(\w+)/i,
];

const detectTransferIntent = (msg: string): string | null => {
  for (const pattern of TRANSFER_PATTERNS) {
    const match = msg.match(pattern);
    if (match) return match[1]?.toLowerCase();
  }
  return null;
};

const targetName = detectTransferIntent(userMessage);
if (targetName) {
  const { data: matched } = await supabase
    .from('agentes_ia')
    .select('id, tipo, nome')
    .eq('tenant_id', tenant.id)
    .ilike('nome', `%${targetName}%`)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle();

  if (matched) {
    agentType = matched.tipo;
    handoffForced = true;
    // skip orchestrator e ata
  }
}
```

**P0-3: Prompt da Ana — ajustar política de transferência**
**SQL update no `agentes_ia.system_prompt` do recepcionista:**
```
REGRAS DE TRANSFERÊNCIA (OBRIGATÓRIO SEGUIR):
1. Se o cliente pedir explicitamente para falar com outro profissional (ex: "quero falar com a Dra. Jacira", "me transfere para o Dr. Gabriel"), você DEVE chamar imediatamente a tool `transfer_to_agent`. NÃO faça perguntas adicionais.
2. Se o caso envolver direito bancário, banco, financiamento, empréstimo, score → tool `transfer_to_agent` com `target_agent_type=juridico_bancario`.
3. Se o caso envolver outros temas jurídicos complexos → `juridico`.
4. Se for orçamento/comercial → `comercial`.
5. Em qualquer outro caso, termine sua mensagem com 1 pergunta concreta para qualificar o lead.
```

**Teste de regressão:**
- Conversa: "Posso falar com a Dra. Jacira?" → expected: tool call `transfer_to_agent`, handoff_message anunciando transferência. **Sem perguntas extras.**
- Conversa: "Tenho problema com banco" → expected: tool call para `juridico_bancario`.
- Conversa: "Qual o valor?" → expected: tool call para `comercial`.

**DoD:** 3 cenários acima passam em prod (conversation_id capturado em audit_log). Telemetria de handoff aparece em dashboard.

### P0-5 — Dois fluxos paralelos de agendamento (M · 3-4h)
**Arquivo:** [supabase/functions/whatsapp-webhook/handlers/process-message.ts](supabase/functions/whatsapp-webhook/handlers/process-message.ts) linhas 851-979 (tool calling) + 1213-1505 (parser legacy)
**Fix:** gate o parser legacy por `!toolCallsExecuted`. Se IA executou `schedule_meeting` no turn, parser não roda.
```typescript
const toolCallsExecuted = (response.tool_calls ?? []).length > 0;
const scheduleToolUsed = response.tool_calls?.some(t => t.function.name === 'schedule_meeting');

if (!toolCallsExecuted && !scheduleToolUsed) {
  // só agora roda o parser legacy
  const parsed = parseScheduleIntent(userMessage);
  if (parsed) { /* ... */ }
}
```
**Alternativa preferida (M+):** remover parser legacy completamente, confiando no tool calling. Mas precisa garantir cobertura do tool em 100% das mensagens.
**DoD:** teste unitário cobre os 2 paths; smoke test em prod com 5 mensagens variadas (agendar, remarcar, cancelar) → resposta limpa, sem duplicidade.

### P0-6 — `agent_executions` stuck em processing (XS · 30min)
**Arquivo:** mesmo `process-message.ts`, no UPDATE final.
**Fix:** `await` o update + try/catch + Sentry capture em erro.
```typescript
try {
  const { error } = await supabase
    .from('agent_executions')
    .update({
      status: 'completed',
      response: finalText,
      tokens_used: tokenUsage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  if (error) {
    console.error('agent_execution_update_failed', { executionId, error });
    Sentry?.captureException(error);
  }
} catch (e) {
  console.error('agent_execution_update_threw', e);
}
```
**Cleanup retroativo:** migration que marca como `completed` os 25 stuck com `metadata.recovered=true`.
**DoD:** próximas execuções terminam em status final < 5s; query monitora `processing` > 60s e dispara alerta.

### P0-8 — Imutabilidade LGPD (S · 1h)
**Nova migration:**
```sql
-- 20260525000002_immutable_compliance_logs.sql
CREATE TRIGGER prevent_lgpd_delete BEFORE DELETE ON public.lgpd_consent_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_delete();
CREATE TRIGGER prevent_lgpd_update BEFORE UPDATE ON public.lgpd_consent_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_update();
CREATE TRIGGER prevent_assistant_audit_delete BEFORE DELETE ON public.assistant_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_delete();
CREATE TRIGGER prevent_assistant_audit_update BEFORE UPDATE ON public.assistant_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_update();
```
**DoD:** tentativa de DELETE/UPDATE por admin de tenant retorna erro; integration test cobre.

### P0-11 — `modulepreload` anula defer (S · 1h)
**Arquivo:** [vite.config.ts](vite.config.ts)
```ts
export default defineConfig({
  build: {
    modulePreload: {
      resolveDependencies(filename, deps) {
        return deps.filter(d =>
          !d.includes('sentry-vendor') &&
          !d.includes('charts-vendor') &&
          !d.includes('dnd-vendor') &&
          !d.includes('pdf-vendor')
        );
      },
    },
  },
});
```
**Validação:** após build, `dist/index.html` não preload mais esses chunks. Lighthouse LCP < 1,5s.

## 0.3 — Smoke test final (CEO, 30min)

1. **Conexão Google Calendar** (conta nova): conectar, ver token salvo, criar evento manual → aparece no Calendar real.
2. **WhatsApp inbound**: enviar "Olá" do celular → Ana responde em < 15s.
3. **Handoff explícito**: enviar "Posso falar com a Dra. Jacira?" → resposta de transferência sem pergunta extra; próxima mensagem é respondida pela Jacira (verificar `pending_handoff_to` em DB).
4. **Agendamento**: enviar "Quero agendar uma reunião amanhã às 14h" → IA confirma, evento criado no Calendar com Meet link, lead recebe link.
5. **Cobrança**: criar checkout de teste no Stripe → webhook 200, assinatura ativa na UI.
6. **Sentry**: forçar erro → aparece no dashboard em < 60s + alerta no Slack.
7. **Crons**: aguardar próximo dispatch → ver 8/8 status 200 no GitHub Actions.

**DoD da Fase 0:** todos os 7 itens do smoke test passam. Memória `MEMORY.md` atualizada com snapshot pós-destravamento.

---

# FASE 1 — Estabilização (semanas 2-3, ~40h)

> **Objetivo:** eliminar débito técnico, deixar arquitetura sem duplicações, testes E2E robustos, observabilidade plena.

## 1.1 — Arquitetura sem duplicações (~12h)

### A1.1 — Unificar LeadDrawer (M · 3h)
- Consolidar [src/components/forms/LeadDrawer.tsx](src/components/forms/LeadDrawer.tsx) (294 LOC) + [src/features/leads/LeadDrawer.tsx](src/features/leads/LeadDrawer.tsx) (160 LOC) em um único componente em `src/features/leads/LeadDrawer.tsx`.
- Shape único derivado de [src/schemas/leadSchema.ts](src/schemas/leadSchema.ts).
- Atualizar 4 callsites: `LeadsPanel`, `PipelineCard`, `ContatosTable`, `KanbanOperacional`.
- **DoD:** grep `LeadDrawer` retorna 1 import path; tests existentes passam.

### A1.2 — Single source para `LEAD_STATUS_LABELS` (S · 1h)
- Manter [src/constants/leadStatus.ts](src/constants/leadStatus.ts) como source of truth.
- `schemas/leadSchema.ts` e `features/pipeline/pipelineConfig.ts` apenas re-exportam.
- **DoD:** grep retorna 1 declaração + 2 re-exports.

### A1.3 — Factory queryKeys em todo WhatsApp (M · 3h)
- 13 hooks WhatsApp ainda usam strings cruas (`useConversationNotes`, `useWhatsAppAutoReply`, `useWhatsAppQuickReplies`, `useWhatsAppSearch`, `useWhatsAppTemplates`, `useWhatsAppWindow`, `PinnedMessagesBar`).
- Adicionar a `queryKeys.ts`:
```ts
export const queryKeys = {
  // ...
  whatsapp: {
    all: ['whatsapp'] as const,
    conversations: { /* já existe */ },
    notes: (conversationId: string) => ['whatsapp', 'notes', conversationId] as const,
    autoReply: (tenantId: string) => ['whatsapp', 'auto-reply', tenantId] as const,
    quickReplies: (tenantId: string) => ['whatsapp', 'quick-replies', tenantId] as const,
    search: (conversationId: string, q: string) => ['whatsapp', 'search', conversationId, q] as const,
    templates: (tenantId: string) => ['whatsapp', 'templates', tenantId] as const,
    window: (conversationId: string) => ['whatsapp', 'window', conversationId] as const,
    pinned: (conversationId: string) => ['whatsapp', 'pinned', conversationId] as const,
  },
};
```
- Migrar invalidations em mutations (forward, react, send, pin, etc).
- **DoD:** grep `['whatsapp-` (strings cruas) retorna 0; invalidations consistentes.

### A1.4 — Adoção de `useEntityCRUD` (M · 3h)
- Migrar `useContratos`, `useLeads`, `useContatos`, `useTarefas`, `useDocumentos`, `useNotificacoes`, `useDepartamentos` para `useEntityCRUD`.
- Remover JSDoc `@deprecated` de `useContratos.ts:4` ou implementar de fato.
- **DoD:** ≥ 10 hooks usando a factory.

### A1.5 — Barrels em todas as features (S · 2h)
- Criar `index.ts` em cada `src/features/*/` com exports públicos.
- Lint rule `no-restricted-imports` passa de warn → error para deep imports cross-feature.
- **DoD:** 33/33 features têm `index.ts`; lint error em deep imports.

## 1.2 — Segurança (~6h)

### S1.1 — Restringir grants em 87 funções SECURITY DEFINER (M · 3h)
- Listar via:
```sql
SELECT n.nspname, p.proname, p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef AND n.nspname = 'public'
ORDER BY p.proname;
```
- Para cada função, decidir: usável por `authenticated` (com guard interno de tenant)? Apenas `service_role`? Apenas `postgres`?
- Migration revoga `EXECUTE` de `anon` em todas exceto as 3-5 que precisam (e.g. `health_check_anon`).
- **DoD:** advisor `function_executable_by_anon` → 0 ou whitelist documentada.

### S1.2 — PII em Sentry (S · 1h)
- `setUser({ id: hashedUserId, segment: tenant.id })` em vez de `{ email, username }`.
- Adicionar `beforeSend` filter removendo emails de event body.
- **DoD:** dashboard Sentry sem emails visíveis em events recentes.

### S1.3 — Rotation policy de secrets (S · 1h)
- Documentar em `docs/RUNBOOK.md` quais secrets rotar mensalmente, trimestralmente, anualmente.
- Adicionar reminders em `cron-jobs.yml` (e-mail 7 dias antes do venc).
- **DoD:** runbook publicado + cron configurado.

### S1.4 — Pen-test automated (M · 1h setup)
- Adicionar OWASP ZAP scan no GitHub Actions (rodar weekly em staging).
- Adicionar `npm audit --omit=dev --audit-level=high` no CI (já tem critical, expandir).
- **DoD:** workflow `security-scan.yml` rodando weekly.

## 1.3 — IA / Orquestração (~8h)

### I1.1 — HANDOFF tenant-aware (S · 1h)
- Substituir regex hardcoded por load dinâmico de `agentes_ia` do tenant em cache (5min TTL).
- **DoD:** novo agente criado em tenant → handoff funciona sem deploy.

### I1.2 — Provisioning automático de `juridico_bancario` em todos os tenants (S · 1h)
- Migration cria o agente em todos os 17 tenants (com `ativo=false` por padrão para opt-in).
- UI em `/configuracoes/agentes` permite ativar.
- **DoD:** todos os tenants têm a opção visível.

### I1.3 — Decompor `process-message.ts` (L · 6h)
**De 1.748 linhas para 6 módulos:**
```
supabase/functions/whatsapp-webhook/handlers/
├── process-message.ts (orquestrador, < 200 LOC)
├── stages/
│   ├── 01-resolve-tenant.ts
│   ├── 02-resolve-conversation.ts
│   ├── 03-classify-and-route.ts
│   ├── 04-dispatch-agent.ts
│   ├── 05-handle-tool-calls.ts
│   └── 06-persist-and-respond.ts
└── tools/ (cada tool em arquivo próprio)
```
- Cada estágio é testável isolado.
- **DoD:** orquestrador < 200 LOC; unit tests por estágio.

## 1.4 — Edge Functions (~4h)

### E1.1 — Trial-gate em 4 funções IA (S · 1h)
- `summarize-whatsapp-conversation`, `extract-whatsapp-data`, `analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio` → adicionar `await assertTrialActive(supabase, tenantId, 'ai_responder')`.
- **DoD:** 11/11 funções IA outbound gated.

### E1.2 — Investigar `tribunal-sync 400` (M · 2h)
- Logs detalhados sobre o 400.
- Verificar API key Escavador (`ESCAVADOR_API_KEY`) ou provider config (`TRIBUNAL_PROVIDER=fake|escavador|datajud`).
- **DoD:** sync rodando para 1 tenant teste, andamentos chegando.

### E1.3 — `data-retention-cleanup 500` (S · 1h)
- Ler logs, identificar erro.
- Fix + retry mechanism.
- **DoD:** cron diário 200 OK.

### E1.4 — Auditar 9 edge functions sem caller cliente (S · 30min)
- `agent-orchestrator`, `agentes-ia-api`, `vector-search`, `generate-embedding`, `generate-document`, `ingest-document-from-file`, `media-processor`, `get-public-config`, `send-push-notification`.
- Decidir: manter (com doc) / deprecar / wire em UI.
- **DoD:** cada uma classificada em `docs/EDGE-FUNCTIONS.md`.

## 1.5 — Qualidade & Testes (~8h)

### Q1.1 — `npm audit fix` (S · 30min)
- 1 HIGH xmldom DoS + 3 moderate. Validar build pós-fix.
- **DoD:** `npm audit --audit-level=high` clean.

### Q1.2 — Integration test pipeline WhatsApp ponta-a-ponta (L · 5h)
- Test que envia webhook fake Kapso → mocka OpenAI → assert mensagem persistida + resposta enviada + handoff funcionando.
- Cobertura mínima: 5 cenários (saudação, handoff explícito, agendamento via tool, agendamento via parser, follow-up).
- **DoD:** novo arquivo `src/tests/integration/whatsapp-pipeline-e2e.test.ts` com 5 testes.

### Q1.3 — Refactor `DocumentosManager` e `WhatsAppIA` (M · 3h)
- `DocumentosManager.tsx` (656 LOC) → quebrar em `DocumentosList`, `DocumentoCard`, `DocumentoUploader`, `DocumentoActions`.
- `WhatsAppIA.tsx` (500 LOC) → similar.
- **DoD:** nenhum componente > 400 LOC em src/features/.

## 1.6 — DevOps / Observabilidade (~6h)

### D1.1 — Investigar bundle 6MB (M · 2h)
- Rodar `npm run build` localmente e na CI, comparar.
- Identificar se cap CI 4MB está silenciado por bug em script.
- Reduzir bundle: tree-shaking, lazy charts, jspdf chunk apenas onde usado.
- **DoD:** bundle ≤ 4MB e CI guard ativo de fato.

### D1.2 — Husky pre-push (S · 30min)
- `npm run type-check && npm run test -- --run`.
- **DoD:** push sem testes verdes é bloqueado localmente.

### D1.3 — Alertas Slack/Discord para deploy + Sentry spike (S · 1h)
- GitHub Action `notify.yml` posta no webhook em deploy failure.
- Sentry alerts rule: ≥ 10 erros/min em prod → Slack.
- **DoD:** teste manual envia notificação.

### D1.4 — Dashboards externos (M · 2.5h)
- Configurar Metabase ou Grafana Cloud apontando para Supabase read replica.
- Dashboards: DAU/WAU/MAU, conversão trial→paid, churn, latência edge function, top errors.
- **DoD:** URL do dashboard publicada em `docs/RUNBOOK.md`.

### D1.5 — Health endpoint completo (S · 30min)
- `/api/health` (edge function `health`) retorna JSON com checks: db, openai, kapso, stripe, google, sentry.
- Statuspage.io ou custom page consumindo.
- **DoD:** `/status` público.

**DoD Fase 1:** todos os P1 da auditoria fechados; CI verde; dashboards externos rodando; alertas reais funcionando; arquitetura sem duplicações conhecidas.

---

# FASE 2 — Excelência no core (semanas 4-6, ~80h)

> **Objetivo:** elevar WhatsApp + IA + Calendar ao nível "10/10". Handoff 95%+ assertivo, agendamento sem retrabalho, IA tool-calling 100% (zero parser regex), bundle <1MB inicial, FCP <1s.

## 2.1 — IA / Agentes 10/10 (~30h)

### 2.1.1 — Substituir parser regex legacy por tools completas (L · 12h)
**Tools a criar** (cada uma em `_shared/agent-tools/`):
- `schedule_meeting` (já existe? revisar e refinar)
- `cancel_meeting`
- `reschedule_meeting`
- `list_my_meetings`
- `transfer_to_agent` (P0-2)
- `extract_lead_data` (CPF/CNPJ/processo/urgência → upsert no lead)
- `create_task` (cria tarefa para advogado responsável)
- `request_document` (envia mensagem pedindo doc específico)
- `send_quick_reply` (catálogo de respostas prontas)
- `search_jurisprudence` (busca jurisprudência relevante para o caso — fase 3)
- `escalate_to_human` (marca conversa como urgente para advogado real)

**Cada tool tem:**
- JSON Schema de parâmetros
- Executor com tenant isolation
- Telemetria (`tool_call_log` table)
- Unit test
- Documentação no system_prompt do agente

**DoD:** zero parser regex em `process-message.ts`; 100% das ações via tool calling; `tool_call_log` populado.

### 2.1.2 — Detecção de intent multi-camada (M · 6h)
**3 camadas em série:**
1. **Regex de transferência explícita** (P0-1, já feito) — captura "transfere para X".
2. **Classificador rápido** (gpt-4o-mini, 50 tokens, JSON): classifica em `[transfer, schedule, document, complaint, qualification, billing, other]`.
3. **Agent dispatch**: chama agente correto com tools.

**Vantagens:**
- Reduz custo (não chama agente principal com 4KB prompt se for transfer simples).
- Latência menor.
- Telemetria precisa.

**DoD:** classificador tem ≥ 90% acurácia em dataset de 100 mensagens reais; cada classe tem fallback.

### 2.1.3 — RAG com vector store por tenant (L · 10h)
**Setup:**
- `documentos_embeddings` table (já existe? `generate-embedding` function existe).
- Ao upload de documento jurídico, gerar embedding e armazenar.
- Tool `search_internal_documents` busca por similaridade dentro do tenant.
- Caso de uso: cliente pergunta "qual o valor das custas?" → RAG busca em contratos do tenant → IA responde com base no template específico daquele escritório.

**DoD:** demo onde 1 tenant uploada 5 docs, agente cita corretamente em conversa.

### 2.1.4 — Telemetria de handoff (M · 2h)
- Dashboard com:
  - Taxa de handoff bem-sucedido (`pending_handoff_to` setado + próxima msg respondida pelo agente alvo)
  - Tempo médio entre pedido e handoff
  - Agentes mais/menos chamados
  - Conversas com handoff falho (alvo de iteração de prompt)
- Alerta Sentry se taxa de handoff cair < 80% em 24h.

**DoD:** dashboard `/configuracoes/observabilidade-ia` mostra métricas em tempo real.

## 2.2 — Google Calendar 10/10 (~20h)

### 2.2.1 — Timezone via Intl (M · 3h)
- Substituir `BRT_OFFSET` fixo + `setHours` em `schedule-parser.ts` por:
```ts
const formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});
```
- Lidar com horário de verão (mesmo BR não usar mais, código deve ser robusto).
- Suporte a outros timezones (escritórios em Manaus, Cuiabá, Belém).
- **DoD:** unit tests cobrindo 3 timezones.

### 2.2.2 — Calendar Push Notifications (L · 6h)
- Configurar Google Calendar webhook (`calendar.events.watch`).
- Edge function `google-calendar-webhook` recebe push → sync para `agendamentos` table.
- Permite advogado mexer no Google direto e Jurify reflete.
- **DoD:** mudança no Google Calendar → atualização no Jurify < 10s.

### 2.2.3 — Reminder T-24h (S · 1h)
- `process-meeting-reminders` agora dispara T-24h, T-3h, T-30min.
- Mensagem WhatsApp + email (Postmark).
- **DoD:** smoke test confirma 3 reminders.

### 2.2.4 — Lead sem email recebe invite via WhatsApp link (S · 2h)
- Se `lead.email` for vazio, IA envia mensagem com link `https://meet.google.com/xxx-yyy-zzz` em vez de depender do invite.
- Mensagem template: "Sua reunião está marcada para [data] às [hora]. Acesse: [meet link]. ICS: [link]."
- ICS file generation para clientes adicionarem ao próprio Calendar.
- **DoD:** lead sem email recebe link via WhatsApp e consegue entrar.

### 2.2.5 — Google OAuth verification (M · 4h + days esperando Google)
- Submeter app para verification do Google.
- Privacy Policy + Terms claros sobre uso de calendar data.
- Scope minimal (`calendar.events` apenas).
- **DoD:** badge "verified" no consent screen; limite 100 usuários removido.

### 2.2.6 — UI de agendamento manual no dashboard (M · 4h)
- Tela `/agendamentos` lista todos.
- Drag-and-drop reschedule.
- Botão "Criar manualmente" sem precisar do WhatsApp.
- Filtros por advogado, tipo (presencial/call), status.
- **DoD:** advogado pode criar/editar/cancelar pelo dashboard.

## 2.3 — WhatsApp pro (~20h)

### 2.3.1 — Campanhas em massa com segmentação (L · 8h)
- Tela `/whatsapp/campanhas`.
- Selecionar segmento (lead status, área jurídica, tag, último contato > X dias).
- Template Meta aprovado obrigatório.
- Preview de payload + variables.
- Rate-limit respeitado (Meta tier-based, default 1k/dia).
- Status: agendada, enviando, concluída, erros.
- Métricas: enviadas, entregues, lidas, respondidas, opt-out.
- **DoD:** disparar campanha real para 10 leads teste; relatório.

### 2.3.2 — A/B testing de templates (M · 4h)
- 2 templates A e B com mesmo segmento.
- Métricas comparativas (read rate, reply rate, conversion rate).
- Winner declarado após N envios.
- **DoD:** UI mostra winner com p-value.

### 2.3.3 — Smart Reply ranking (M · 3h)
- Onda 14 já entrega 3 sugestões. Adicionar:
  - Ranking por contexto (sentiment, urgency, área).
  - Aprendizado por aceitação (qual sugestão usuário escolheu → fine-tune ranking).
- **DoD:** dashboard mostra taxa de aceitação por tipo de sugestão.

### 2.3.4 — Áudio outbound (S · 2h)
- Já tem transcrição inbound. Adicionar TTS (OpenAI tts-1) para enviar áudio quando útil (resposta longa, accessibility).
- Botão "Enviar como áudio" no ChatInput.
- **DoD:** áudio enviado, cliente recebe e ouve.

### 2.3.5 — Sticker / GIF / location messages (S · 3h)
- Suporte a tipos não-texto avançados (stickers para tom amigável, location para endereço do escritório).
- **DoD:** envio + recepção testados.

## 2.4 — Performance e bundle (~10h)

### 2.4.1 — Bundle < 1MB inicial (L · 6h)
- Análise via `vite-bundle-visualizer`.
- Lazy load: jspdf-autotable, recharts, dnd-kit (já parcialmente).
- Substituir `lodash` por imports específicos onde existir.
- Remover deps unused (depcheck já apontou 9 candidates — validar).
- **DoD:** bundle inicial ≤ 1MB gzip.

### 2.4.2 — Lighthouse 95+ (M · 4h)
- LCP, FID, CLS, FCP, TTI.
- Preload imagens hero, fontes, fonts-display swap.
- Service Worker para cache estático (já tem? verificar).
- **DoD:** Lighthouse score 95+ em /login e /dashboard.

**DoD Fase 2:** taxa de handoff ≥ 95% em prod; agendamento ponta-a-ponta sem retrabalho ≥ 90%; bundle ≤ 1MB; Lighthouse 95+.

---

# FASE 3 — Diferenciais jurídico BR (semanas 7-12, ~200h)

> **Objetivo:** entregar 10 frentes que tornam o Jurify completo para um escritório médio/grande BR. Cada frente é vendível isoladamente.

## 3.1 — OCR + IA documental (~30h)

### 3.1.1 — Pipeline OCR (L · 12h)
- Provider: Google Cloud Vision OU Azure OCR OU Mistral OCR (avaliar custo).
- Edge function `ocr-document` recebe arquivo (PDF/imagem), retorna texto + bounding boxes.
- Storage em `documentos_ocr` com vetor de embedding.
- **DoD:** upload de RG → texto extraído com >95% accuracy.

### 3.1.2 — Extração estruturada por tipo (L · 8h)
- Tipos: RG, CPF, CNH, comprovante endereço, contrato, intimação, sentença, petição, certidão, recibo, NF.
- Cada tipo tem schema Zod + prompt de extração.
- Tool `extract_structured_data` com `document_type`.
- **DoD:** 10 tipos suportados, accuracy ≥ 90% em sample teste.

### 3.1.3 — Captura automática de prazos a partir de intimações (L · 6h)
- IA lê intimação → identifica tipo (recurso, contestação, manifestação) → calcula prazo legal (CPC art. 219 — dias úteis) + feriados → cria entry em `prazos` table + Google Calendar + alerta.
- **DoD:** upload intimação → prazo aparece no dashboard com data correta.

### 3.1.4 — Revisão automática de contratos (M · 4h)
- Tool `review_contract`: identifica cláusulas perigosas (multa abusiva, foro, prazo prescricional), sugere alterações, lista pontos de atenção.
- **DoD:** demo com contrato real mostra 5+ sugestões úteis.

## 3.2 — Cálculos jurídicos automáticos (~25h)

### 3.2.1 — Engine de correção monetária (L · 10h)
- Tabelas atualizadas mensalmente (cron): INPC, IPCA, IGP-M, TR, SELIC, IPC-FIPE.
- Calculadora em `src/features/calculos/` + edge function `calc-correction`.
- API: `{ valor, inicio, fim, indice }` → `{ valor_corrigido, fator, memoria_calculo }`.
- Memória de cálculo para imprimir/anexar à petição.
- **DoD:** UI calculadora + 6 índices funcionando.

### 3.2.2 — Cálculo de juros (M · 6h)
- Legal (Selic), contratual (livre), mora (1%), compensatório (6%), pré-fixado, pós-fixado, capitalização simples/composta.
- **DoD:** UI + memória de cálculo.

### 3.2.3 — Cálculo trabalhista (L · 6h)
- Verbas rescisórias (aviso prévio, 13º proporcional, férias + 1/3, FGTS, multa 40%, INSS, IRRF).
- Horas extras (50%, 100%, DSR reflexo).
- Diferenças salariais.
- **DoD:** UI com inputs de admissão/demissão/salário → cálculo completo PDF-able.

### 3.2.4 — Pensão alimentícia (M · 3h)
- Cálculo por %, salário-mínimo, fixo. Atualização anual. Reajustes.
- **DoD:** UI + impressão.

## 3.3 — Editor de petições com IA (~30h)

### 3.3.1 — Biblioteca de templates por área (L · 8h)
- Templates iniciais (50+): petição inicial (cível, trabalhista, criminal, família, tributário), contestação, réplica, recurso (apelação, agravo, especial, extraordinário), embargos, manifestação, alegações finais.
- Cada template com placeholders inteligentes (cliente, parte adversa, processo, valor, data, tribunal).
- **DoD:** /peticoes/templates lista 50+ com preview.

### 3.3.2 — Editor rich text + auto-fill (L · 10h)
- Slate.js ou TipTap.
- Auto-fill via dados do processo selecionado.
- Comandos slash `/cliente`, `/processo`, `/jurisprudencia`.
- Versionamento Git-like (diff entre versões).
- **DoD:** advogado edita petição, salva versões, compara.

### 3.3.3 — Sugestão de cláusulas via RAG (L · 8h)
- Tool `suggest_clause` recebe contexto (área, fato, pedido) → busca jurisprudência relevante via `vector-search` → retorna 3 cláusulas sugeridas com citações.
- **DoD:** sugestão em < 5s.

### 3.3.4 — Exportação Word/PDF + protocolar (M · 4h)
- Export Word (.docx) com formatação ABNT.
- Export PDF.
- Botão "Protocolar online" (integração PJe / e-saj via API onde possível, ou copy-to-clipboard).
- **DoD:** docx exportado abre no Word corretamente.

## 3.4 — Jurisprudência e pesquisa (~20h)

### 3.4.1 — Indexação STJ/STF/TJs (L · 10h)
- API JusBrasil ou Escavador (já tem) ou scraper próprio (LegalGo / Jusbrasil API).
- Ingestão diária de acórdãos relevantes.
- Embedding por similaridade.
- **DoD:** base de 100k+ acórdãos indexados.

### 3.4.2 — UI de pesquisa (M · 6h)
- Search box com filtros (tribunal, ministro, ano, palavra-chave).
- Resultados rankeados.
- Salvar favoritas.
- Citação one-click para petição.
- **DoD:** /jurisprudencia funcional.

### 3.4.3 — "Casos parecidos com o meu" (M · 4h)
- A partir do processo aberto, busca por embedding similar.
- **DoD:** demo com processo real mostra 5+ casos relevantes.

## 3.5 — Portal do cliente (PWA) (~30h)

### 3.5.1 — App PWA para cliente (L · 12h)
- Subdomain `cliente.<tenant>.jurify.com.br` ou `<tenant>.jurify.app`.
- Login via OTP WhatsApp / e-mail.
- Tela: meus processos, documentos compartilhados, próxima reunião, pendências de pagamento, mensagens.
- **DoD:** cliente faz login e vê seus dados.

### 3.5.2 — Notificações push (FCM) (M · 4h)
- Já tem `send-push-notification` (edge function órfã — wire na UI cliente).
- Triggers: nova mensagem advogado, andamento processual, reminder reunião, cobrança.
- **DoD:** cliente recebe push em mobile.

### 3.5.3 — Chat in-app cliente↔advogado (M · 6h)
- Alternativa ao WhatsApp para clientes que preferem app.
- Mesma base de mensagens (`whatsapp_messages` ou nova tabela `client_chat_messages`).
- **DoD:** mensagens fluem nos dois sentidos.

### 3.5.4 — Assinatura digital embed ZapSign (M · 4h)
- iframe ZapSign no portal cliente.
- Webhook atualiza status no Jurify.
- **DoD:** cliente assina dentro do app.

### 3.5.5 — Pagamento de honorários (M · 4h)
- Cliente vê faturas + paga via Pix/cartão.
- Integração Asaas (Pix instantâneo) OU Stripe (cartão).
- **DoD:** fatura paga → status atualizado.

## 3.6 — Financeiro pleno (~25h)

### 3.6.1 — Gateway Asaas (Pix + boleto) (L · 8h)
- Asaas API: gera cobrança Pix instantâneo + boleto bancário.
- Webhook recebe confirmação.
- Conciliação automática com `honorarios`.
- **DoD:** advogado emite cobrança Pix, cliente paga, status atualizado.

### 3.6.2 — Emissão de NF-e (M · 6h)
- Provider: NFE.io OU eNotas OU Migrate.
- Trigger ao confirmar pagamento.
- PDF + XML armazenados em `documentos`.
- **DoD:** NF emitida automaticamente em sandbox.

### 3.6.3 — Régua de cobrança automatizada (M · 5h)
- Workflow: D-3 lembrete amigável, D dia do venc, D+3 cobrança firme, D+7 cobrança formal, D+15 protesto via Asaas, D+30 negativação.
- Cada step pode ser WhatsApp / email / SMS.
- Customizável por tenant.
- **DoD:** régua dispara automaticamente.

### 3.6.4 — Honorários múltiplos (M · 4h)
- Tipos: contratual (fixo, mensal, fase processual), êxito (% sobre ganho), sucumbenciais (% sobre causa).
- Cada tipo com fluxo próprio de cobrança.
- **DoD:** UI suporta 3 tipos.

### 3.6.5 — Dashboard financeiro (M · 2h)
- Receita mensal, projetada, inadimplência, ticket médio, top devedores.
- **DoD:** /financeiro/dashboard pronto.

## 3.7 — Departamentos e roles granulares (~15h)

### 3.7.1 — Multi-departamento (L · 8h)
- Tabela `departamentos` já existe? Validar e expandir.
- Cada processo/cliente pertence a um departamento.
- Roles: sócio, advogado sênior, advogado pleno, advogado júnior, estagiário, secretária, financeiro, marketing, RH.
- Permissões granulares por área/processo/cliente.
- **DoD:** advogado de "trabalhista" não vê processos "criminal" (a menos que sócio).

### 3.7.2 — Workflows por departamento (M · 4h)
- Cada departamento define seu pipeline de leads (etapas customizáveis).
- Templates de petição específicos.
- **DoD:** /configuracoes/departamentos suporta config.

### 3.7.3 — Métricas por advogado (M · 3h)
- Casos ativos, taxa de conversão, ticket médio, prazos cumpridos, NPS clientes.
- **DoD:** /equipe/{advogadoId}/dashboard.

## 3.8 — Tribunais e DataJud (~20h)

### 3.8.1 — Integração CNJ DataJud (L · 10h)
- API pública do CNJ (`api-publica.datajud.cnj.jus.br`).
- Sync diário de andamentos.
- Suporte a 90+ tribunais (TJs, TRTs, TRFs, STJ, STF, TSE).
- **DoD:** processo cadastrado tem andamentos atualizados em D-1.

### 3.8.2 — Notificação inteligente de andamentos (M · 4h)
- IA classifica relevância (intimação > sentença > despacho > juntada > certidão).
- Push apenas para relevantes.
- **DoD:** advogado recebe push só para alta relevância.

### 3.8.3 — Dashboard de processos (M · 4h)
- Filtros: minha atuação, com prazo, recentemente movimentados, sem mexer há X dias.
- **DoD:** /processos/dashboard pronto.

### 3.8.4 — Integração e-CNJ / PJe (M · 2h)
- Quando possível, link direto para o processo no e-CNJ/PJe a partir do Jurify.
- **DoD:** botão "Abrir no PJe" funcional para 5 tribunais piloto.

## 3.9 — Marketing / Aquisição (~15h)

### 3.9.1 — Landing por área com lead capture (M · 6h)
- Landing pages SEO-friendly por área (advocacia trabalhista, criminal, família, consumidor, etc).
- Lead capture com qualificação por IA.
- A/B testing via Vercel Edge Config.
- **DoD:** 5 landings publicadas com Plausible / GA4.

### 3.9.2 — UTM tracking + funil completo (M · 4h)
- Lead → trial → paid → churn rastreado por source/medium/campaign.
- Integração Meta Ads + Google Ads conversion API.
- **DoD:** dashboard funil por source.

### 3.9.3 — Email nurturing avançado (M · 3h)
- Postmark já está integrado. Adicionar:
  - Sequence onboarding (D0, D1, D3, D7, D14, D30).
  - Re-engagement (D+15 sem login).
  - Education content (blog posts).
- **DoD:** ≥ 8 emails na sequence.

### 3.9.4 — Referral OAB (S · 2h)
- Advogado convida colega OAB → ganha desconto.
- **DoD:** programa funcional.

## 3.10 — IA jurídica especializada (~20h)

### 3.10.1 — Fine-tuning em direito brasileiro (L · 10h)
- Coletar 10k+ pares (pergunta jurídica BR → resposta correta).
- Fine-tune via OpenAI API ou usar provider especializado (Mistral, Cohere com BR data).
- A/B test contra gpt-4o-mini base.
- **DoD:** modelo custom em prod com ganho ≥ 15% em accuracy.

### 3.10.2 — Súmulas + jurisprudência citáveis (M · 6h)
- Base de súmulas STF, STJ, TST atualizada.
- Tool `cite_jurisprudence` retorna súmula + acórdão com link.
- **DoD:** IA cita corretamente em petição.

### 3.10.3 — Confidence score em respostas (M · 4h)
- Cada resposta da IA tem score 0-100.
- < 60 → flag para revisão humana.
- **DoD:** UI mostra score; baixos vão para queue.

**DoD Fase 3:** 10 frentes entregues, cada uma com demo gravada e doc para vendas.

---

# FASE 4 — Compliance, escala, certificações (semanas 13-16, ~80h)

> **Objetivo:** virar segurança e compliance em diferencial comercial defensável.

## 4.1 — LGPD compliance completo (~20h)

### 4.1.1 — DPO interface (M · 4h)
- /lgpd/dpo com:
  - ROPA (registro de operações de tratamento)
  - RIPD (relatório de impacto)
  - Solicitações de titulares (acesso, correção, exclusão, portabilidade)
  - Incidentes
- **DoD:** todas as seções funcionais.

### 4.1.2 — Anonimização automática (M · 4h)
- Cron mensal: dados pessoais de leads inativos > 5 anos → anonimizados (CPF/email/telefone → hash + flag).
- **DoD:** cron rodando + audit log.

### 4.1.3 — Consentimento granular (M · 4h)
- Cliente assina termo por finalidade (atendimento, marketing, jurisprudência, IA training).
- Revogação a qualquer momento.
- **DoD:** UI cliente + log.

### 4.1.4 — Portabilidade de dados (S · 2h)
- Exportação JSON de todos os dados do tenant.
- **DoD:** /lgpd/export gera ZIP.

### 4.1.5 — Privacy Policy + Termos atualizados (M · 3h)
- Revisão jurídica.
- Versionamento (aceitação por versão).
- **DoD:** publicados e ativos.

### 4.1.6 — Incident response playbook (S · 3h)
- Em caso de vazamento: comunicar ANPD em 72h.
- Template de comunicação ao titular.
- **DoD:** runbook publicado.

## 4.2 — OAB compliance (~10h)

### 4.2.1 — Provimento 205/2021 (publicidade) (M · 4h)
- Validação automática: site/landing não pode prometer resultado, comparar honorários, etc.
- Lint rule para conteúdo público.
- **DoD:** validador funciona em landing builder.

### 4.2.2 — Provimento 226/2023 (publicidade) (S · 2h)
- Idem.

### 4.2.3 — Retenção mínima 5 anos pós-baixa processual (S · 2h)
- Backup retention rule.
- **DoD:** processo baixado em 2020 ainda recuperável.

### 4.2.4 — Sigilo profissional reforçado (M · 2h)
- Tags `[CONFIDENCIAL]` que excluem dados de logs.
- **DoD:** auditoria mostra conteúdo confidencial não em logs.

## 4.3 — ISO 27001 + 27701 readiness (~20h)

### 4.3.1 — ISMS (Information Security Management System) (L · 8h)
- Documentação: políticas (acesso, senha, backup, incident response, vendor), procedimentos, evidências.
- **DoD:** 30+ docs publicados em wiki interno.

### 4.3.2 — Acesso baseado em least-privilege (M · 4h)
- Audit de quem tem acesso a quê. Reduzir.
- **DoD:** matriz de acesso atualizada.

### 4.3.3 — Backup tested mensalmente (M · 4h)
- Cron mensal restaura backup em ambiente isolado e valida integridade.
- **DoD:** evidências de 3 restores bem-sucedidos.

### 4.3.4 — Pentest anual (M · 4h setup, $$$ contratação externa)
- Contratar empresa especializada (Securetics, Conviso, Tempest).
- Remediação completa.
- **DoD:** relatório limpo OU plano de remediação.

## 4.4 — Multi-região e disaster recovery (~15h)

### 4.4.1 — Read replicas em múltiplas regiões (L · 6h)
- Supabase suporta read replicas. Configurar para sa-east-1.
- Latência < 100ms em todo BR.
- **DoD:** RTT médio < 100ms de SP, RJ, Recife.

### 4.4.2 — Backup off-region (M · 4h)
- Backup diário para S3 em região diferente.
- Encryption at rest.
- **DoD:** restore from S3 testado.

### 4.4.3 — Runbook disaster recovery (M · 3h)
- RTO 4h, RPO 1h.
- Playbook detalhado.
- Drill semestral.
- **DoD:** drill executado e documentado.

### 4.4.4 — Statuspage público (S · 2h)
- statuspage.io ou custom.
- Auto-update via health check.
- **DoD:** status.jurify.com.br público.

## 4.5 — Mobile app (Capacitor) (~15h)

### 4.5.1 — Build iOS + Android (L · 8h)
- Capacitor já está no projeto.
- Build pipeline (Fastlane ou EAS).
- App Store + Google Play submission.
- **DoD:** TestFlight + Play Internal Testing.

### 4.5.2 — Modo offline básico (M · 4h)
- Cache de processos ativos + próximas audiências.
- Sync ao reconectar.
- **DoD:** advogado consulta processos em audiência sem internet.

### 4.5.3 — Notificações push native (S · 3h)
- FCM já no projeto.
- Configurar iOS push (APNs).
- **DoD:** push funciona em ambas plataformas.

**DoD Fase 4:** ISO 27001 ready (audit interno OK), LGPD compliance certificável, mobile app em store, disaster recovery testado.

---

# FASE 5 — Growth e expansão (semanas 17-24, ~120h)

> **Objetivo:** transformar Jurify em plataforma com ecossistema (não apenas SaaS isolado).

## 5.1 — API pública v1 (~30h)

### 5.1.1 — REST API documentada (L · 12h)
- OpenAPI 3.0 spec.
- Endpoints: leads, processos, agendamentos, documentos, honorários, conversas.
- Auth via API keys com scopes.
- Rate limit por key.
- **DoD:** doc em developers.jurify.com.br.

### 5.1.2 — Webhooks (M · 6h)
- Customer subscribe para eventos: lead.created, processo.updated, agendamento.created, etc.
- Retry com exponential backoff.
- **DoD:** demo webhook recebe eventos.

### 5.1.3 — SDK Node + Python (M · 8h)
- npm `@jurify/sdk` + pypi `jurify`.
- **DoD:** ambos publicados.

### 5.1.4 — Postman collection + exemplos (S · 4h)
- **DoD:** collection compartilhável.

## 5.2 — Integrações legacy (sistemas tradicionais) (~25h)

### 5.2.1 — Aurora / Sajus / E-Saj / PJe (L · 12h)
- Importador one-time de dados desses sistemas.
- Sync continuous quando API permite.
- **DoD:** demo importa 100 processos de cada.

### 5.2.2 — Outlook / Office 365 calendar (M · 6h)
- Equivalente do Google Calendar para escritórios MS.
- **DoD:** advogado conecta Outlook, eventos sync.

### 5.2.3 — Drive / OneDrive / Dropbox para docs (M · 4h)
- Upload de docs diretamente do provider.
- **DoD:** upload de Drive ok.

### 5.2.4 — Bling / Conta Azul / Omie (sistemas financeiros) (M · 3h)
- Sync de NF + financeiro.
- **DoD:** opção em /configuracoes/integracoes.

## 5.3 — Marketplace de templates (~20h)

### 5.3.1 — Escritórios compartilham petições (L · 10h)
- Catálogo público com filtros (área, tribunal, tipo).
- Rating, downloads, comentários.
- Royalty: criador ganha 30% de cada uso pago.
- **DoD:** 100+ templates publicados (seed com 50 do próprio Jurify).

### 5.3.2 — Marketplace de jurisprudência analisada (M · 6h)
- Análises de acórdãos por especialistas (publicação paga).
- **DoD:** 20+ análises publicadas.

### 5.3.3 — Marketplace de cursos / certificações (M · 4h)
- Cursos integrados (criados por advogados influenciadores).
- Certificação "Jurify Master".
- **DoD:** 5 cursos lançados.

## 5.4 — Comunidade e content (~20h)

### 5.4.1 — Blog SEO (M · 6h)
- Plataforma própria (não Medium).
- 50+ artigos seeded.
- **DoD:** /blog ativo com 50 posts.

### 5.4.2 — Discord / Telegram comunidade (S · 4h)
- Server moderado.
- Categorias por área.
- **DoD:** 100+ membros.

### 5.4.3 — Webinars mensais (M · 6h)
- Lives com advogados influencers / juízes.
- **DoD:** 1 por mês durante 6 meses.

### 5.4.4 — Newsletter (S · 4h)
- Postmark broadcast.
- Curadoria de mudanças legislativas + tips Jurify.
- **DoD:** 1k+ subscribers.

## 5.5 — Programa de partners e expansão (~15h)

### 5.5.1 — Programa de embaixadores OAB (M · 6h)
- Advogado embaixador → comissão por indicação.
- **DoD:** 10+ embaixadores ativos.

### 5.5.2 — Reseller para consultorias (M · 4h)
- Empresa consulting revende Jurify white-label.
- **DoD:** 3 resellers com contrato.

### 5.5.3 — Convênios com OABs estaduais (M · 3h)
- Desconto para OAB-membros via convênio oficial.
- **DoD:** 2 convênios assinados.

### 5.5.4 — Expansão lusofonia (M · 2h setup, dependente tradução)
- Portugal: adaptar para CPC português, OA (Ordem dos Advogados).
- Angola/Moçambique: avaliar viabilidade.
- **DoD:** Portugal sandbox.

## 5.6 — Pricing e packaging (~10h)

### 5.6.1 — Tiers refinados (M · 4h)
- **Starter** (solo, 1 advogado, R$ 97/mês): WhatsApp básico, 100 leads, 1 IA, sem campanhas.
- **Pro** (escritório pequeno, 5 advogados, R$ 297/mês): tudo + campanhas + jurisprudência + portal cliente.
- **Business** (escritório médio, 25 advogados, R$ 997/mês): tudo + departamentos + API + SLA.
- **Enterprise** (50+ advogados, custom): tudo + on-premise option + custom integrations.
- **DoD:** pricing page atualizada + Stripe products.

### 5.6.2 — Free trial 14 dias (M · 3h)
- (já tem trial 45d — avaliar reduzir para 14d com call de onboarding incluso).
- **DoD:** experimento A/B.

### 5.6.3 — Annual discount + Anual invoice (S · 3h)
- 2 meses grátis em pagamento anual.
- NF anual.
- **DoD:** checkout suporta.

**DoD Fase 5:** API pública usada por 10+ developers; mobile app com 1k+ downloads; marketplace com 100+ templates; 3 resellers; pricing simplificado.

---

# Sequência de execução recomendada

```
Sem 1:    Fase 0 completa (destravamento)
Sem 2-3:  Fase 1 (estabilização)
Sem 4-6:  Fase 2 (excelência core)
Sem 7-12: Fase 3 (diferenciais jurídicos — 10 frentes em paralelo se time crescer)
Sem 13-16:Fase 4 (compliance + mobile)
Sem 17-24:Fase 5 (growth)
```

**Total:** 24 semanas (~6 meses) com 1 dev sênior full-time. Com 2-3 devs, pode comprimir para 3-4 meses.

---

# KPIs de monitoramento contínuo

Implementar dashboard executivo (Metabase/Grafana) acompanhando:

| KPI | Meta 10/10 | Como medir |
|---|---|---|
| Crash-free sessions | ≥ 99,9% | Sentry |
| FCP | < 1s | Lighthouse CI |
| LCP | < 1,5s | Lighthouse CI |
| API p99 latency | < 500ms | Edge function logs |
| Edge function error rate | < 0,1% | Supabase logs |
| WhatsApp handoff success | ≥ 95% | `audit_log` query |
| Agendamento sem retrabalho | ≥ 90% | `agendamentos.flow` |
| Trial → paid conversion | ≥ 30% | Stripe + Postmark |
| Monthly churn | < 3% | Stripe |
| NPS | ≥ 8 | In-app survey |
| Onboarding completion | ≥ 80% in 24h | `onboarding_state` |
| DAU/MAU | ≥ 60% | audit_log activity |
| Support tickets / 100 users | < 5/month | help desk |
| MRR growth | ≥ 15% MoM | Stripe |
| CAC payback | < 6 meses | Stripe + Ads |

---

# Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Google OAuth verification rejeita app | M | A | Submeter cedo (Fase 2). Backup: limitar a 100 usuários inicialmente, expandir conforme aprovação |
| Kapso instabilidade | M | A | Manter abstração com switchable provider (Twilio, Zenvia, WhatsApp Cloud API direto) |
| OpenAI rate limit / preço | A | M | Cache de respostas frequentes, fine-tune para reduzir tokens, fallback Anthropic Claude |
| ANPD fiscalização | B | A | LGPD compliance da Fase 4 ANTES de escalar marketing |
| Concorrente lança feature similar | A | M | Vantagem é integração + IA específica BR; mover rápido em diferenciais jurídicos (Fase 3) |
| Custo Supabase escala | M | M | Monitorar via Cost Center; otimizar queries; considerar reservar dedicated compute |
| Dev burnout (1 pessoa) | A | A | Documentação contínua + contratação 2º dev na Fase 2-3 |
| Stripe revoga conta | B | A | Backup: Asaas / Mercado Pago já como segundo provider (Fase 3) |

---

# Dependências críticas

1. **CEO disponível ~30min/sem** para painéis externos, decisões de pricing, e validações de feature.
2. **Postmark, Stripe, Kapso, Google Cloud** com billing ativo e limites adequados.
3. **Acesso ao Supabase project** com role admin.
4. **Branch `main` protegida** desde Fase 0 (OP-7).
5. **Sentry + Slack/Discord** ativos para alertas reais.

---

# Apêndice — Como medir "10/10"

Em qualquer momento, podemos rodar este teste:

1. **Conta nova de tenant**: signup → onboarding → conectar Google Calendar → conectar WhatsApp via Kapso → criar lead → conversar via WhatsApp → handoff entre agentes → agendar reunião → reunião acontece → enviar contrato via ZapSign → cliente assina → cobrar honorário via Pix → emitir NF.
2. **Tudo isso em < 30 minutos** de uma pessoa nova.
3. **Sem que ela precise abrir documentação além do onboarding inline**.
4. **Sem que precise contatar suporte**.
5. **Sem nenhum erro visível**.

Quando isso acontecer, somos 10/10.

---

**Próximo passo:** apresentar este plano ao CEO e priorizar a execução. Sugestão: começar AGORA pela Fase 0 (já há causa-raiz mapeada de tudo).
