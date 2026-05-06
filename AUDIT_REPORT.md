# JURIFY — Auditoria Técnica (Tech Lead + Security)

> **Data:** 06/05/2026
> **Branch auditada:** `claude/analyze-jurify-GTx5Q`
> **Último commit verificado:** `a8c47e1` (04/05/2026 22:03 -03)
> **Método:** Análise de fluxo Input→Output em Edge Functions, RLS, hooks e migrations
> **Escopo:** Kapso (WhatsApp), Google Calendar, Stripe, RBAC, RLS, observabilidade
>
> Substitui o relatório `2026-03-04` (que descrevia a stack Evolution já retirada)
> e o snapshot `JURIFY_FINAL_REPORT.md` de 11/02/2026.

---

## 1. ✅ O que está sólido

### Infraestrutura WhatsApp (Kapso Partner Mode)
- **Modelo**: 1 conta Kapso master (`KAPSO_MASTER_API_KEY`) + 1 customer Kapso por tenant Jurify, isolado via header `X-Kapso-Customer-Id` e `external_customer_id = tenant_id`. Cliente final nunca cola API key. Fallback legado para tenants antigos com `api_key_encrypted`.
- **Arquivo central**: `supabase/functions/_shared/kapso-client.ts:30-67` (`kapsoFetchWithKey` adiciona o header `X-Kapso-Customer-Id` quando presente).
- **Edge functions ativas**: `kapso-manager`, `whatsapp-webhook`, `send-whatsapp-message`/`-template`/`-list`/`-interactive`, `whatsapp-mark-read`, `whatsapp-typing`, `whatsapp-react`, `whatsapp-forward`, `transcribe-whatsapp-audio`, `analyze-whatsapp-sentiment`, `summarize-whatsapp-conversation`, `suggest-whatsapp-reply`, `extract-whatsapp-data`, `whatsapp-business-profile`, `sync-whatsapp-templates`.

### Webhook hardening (`whatsapp-webhook`)
- **HMAC per-tenant obrigatório**: o fallback global `KAPSO_WEBHOOK_SECRET` foi removido em 2026-04-10 (audit P0-3). Cada tenant precisa registrar o webhook via `kapso-manager` para gerar e armazenar `webhook_secret_encrypted` em `configuracoes_integracoes`. Sem secret → 401.
- **Rate limit de duas fases**: bucket global pré-parse (120 req/min) + bucket per-tenant (60 req/min, chaveado por `phone_number_id`). Um tenant abusivo não estoura o bucket global.
- **Comparação timing-safe** de tokens (`timingSafeCompare`) em verificação de Meta `verify_token` e secret simples.
- **Deduplicação dupla**: in-memory (TTL 5 min) + upsert atômico em `webhook_events` via `event_id+source` para evitar race entre `SELECT`+`INSERT`.

### RLS multi-tenant
- **513 políticas** ativas em ~160 tabelas (`20260308000003_secure_all_tables_rls.sql`, `20260417000001_rls_hardening_and_perf.sql`).
- **`configuracoes_integracoes`**: políticas `integracoes_tenant_select/insert/update/delete` em `20260407000002_fix_integracoes_rls_and_constraints.sql` aplicam isolamento por `tenant_id` + role admin/owner; constraint UNIQUE `(tenant_id, nome_integracao)` previne duplicatas.
- **`storage.objects`**: bucket `documents` com RLS para SELECT público + INSERT autenticado (`20260126000000_create_storage.sql`).
- **PII redaction LGPD** ativo em `agent_ai_logs` (CPF, processo, telefone, email).

### Frontend / build
- **TypeScript strict total** (`tsconfig.json`): `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `noImplicitOverride`. ~6 `any` no codebase.
- **ESLint customizado**: bloqueia `.select('*')` (segurança), alerta deep imports cross-feature.
- **Code splitting** em `vite.config.ts` separa vendor, router, Radix, Supabase, Recharts, Calendar, Sentry.
- **Husky pre-commit**: `check:secrets` + `lint`.
- **CI**: lint → type-check → unit/coverage → security audit (`.github/workflows/ci.yml`); deploy production tem pre-deploy gate forte e smoke E2E pós-deploy.

---

## 2. 🔴 Pontos de atenção atuais

### A. RBAC enforced predominantemente client-side
- **Arquivo**: `src/hooks/useRBAC.ts`
- **Risco**: `can()`, `canInDepartment()`, `getLeadVisibilityScope()` rodam no navegador. Usuário malicioso pode contornar checks via console e ainda assim atingir Edge Functions sem reforço equivalente.
- **Mitigação parcial**: RLS no Postgres garante isolamento por `tenant_id`, mas **não** valida granularidade por departamento ou role para todas as operações.
- **Próximo passo**: helper `_shared/rbac.ts` que replique as regras de departamento e seja chamado em Edge Functions sensíveis (assistant, agent-orchestrator, send-whatsapp-*).

### B. Service-role bypass nas Edge Functions
- **Padrão**: a maioria das tabelas tem policies `TO service_role USING (true)` (correto para Edge Functions), porém isso transfere a responsabilidade de validar `tenant_id` para o código TypeScript.
- **Auditoria pendente**: rever as 50 Edge Functions que usam `SUPABASE_SERVICE_ROLE_KEY` e garantir que toda query/mutation filtra por `tenant_id` resolvido a partir do JWT do usuário (não do payload). Exemplo bom: `kapso-manager` resolve `tenant_id` de `profiles` após validar JWT (`kapso-manager/index.ts:484-499`).

### C. Google OAuth sem PKCE
- **Arquivo**: `src/hooks/useGoogleCalendarConnection.ts:77`
- Usa apenas `state` parameter. PKCE protege contra interceptação de `code` em ambientes mobile/Capacitor.
- **Próximo passo**: gerar `code_verifier`/`code_challenge` no client; verificar `code_verifier` na Edge Function de exchange.

### D. Stripe webhook sem rate-limit por tenant
- **Arquivo**: `supabase/functions/stripe-webhook`
- Já valida assinatura HMAC (`STRIPE_WEBHOOK_SECRET`), mas sem rate-limit. Eventos Stripe legítimos não saturam, porém a função não tem isolamento se houver replay.
- **Próximo passo**: aplicar `applyRateLimit` chaveado por `subscription_id`/`customer.id` reutilizando `_shared/rate-limiter.ts`.

### E. Capacidade de injeção em prompts de IA
- **Arquivo**: `supabase/functions/whatsapp-webhook/handlers/process-message.ts` (Coordenador AI)
- Prompt instrui "NUNCA dê orientação jurídica específica", mas não há filtro pós-processamento na resposta da IA. Risco regulatório alto em contexto jurídico.
- **Mitigantes**: `temperature` baixo, `max_tokens` limitado, `sanitizeInput()` em `_shared/security.ts`.
- **Próximo passo**: gateway de saída (lista de termos proibidos + redaction de citações de jurisprudência inventadas).

### F. Variáveis de IA/Kapso podem estar incompletas em produção
- `KAPSO_MASTER_API_KEY`, `OPENAI_API_KEY` e `ENCRYPTION_KEY` precisam estar configuradas em **Supabase → Edge Functions → Secrets**. Se ausentes, o sistema cai em fallbacks ou retorna 500.
- `SETUP-REQUIRED.md` documenta o fluxo, mas não há um *health-check público* que valide o inventário (`get-public-config` foi removida em 06/05/2026 por vazar essa informação a usuários autenticados).

---

## 3. 🟡 Falsos positivos / pendências menores

| Item | Status |
|---|---|
| `dangerouslySetInnerHTML` em `chart.tsx` | Falso positivo (CSS gerado de config estática, sem input do usuário). |
| Sentry DSN exposto em frontend | Aceitável — DSN é público por design. |
| Pastas `.aiox-core`, `.antigravity`, `.codex`, `.cursor`, `.gemini`, `meu-projeto/`, `scenario/` | **Tech debt** — restos de IDEs/IAs órfãs, devem ser removidas e adicionadas ao `.gitignore`. |
| `tsconfig.json` `baseUrl` | Deprecation warning do TS 5.5+, sem efeito funcional. |
| TypeScript `any` (≈6 ocorrências) | Inevitáveis em pontos de integração com cliente Supabase Deno (sem types em runtime). |

---

## 4. 🟠 Configuração de produção (não-código)

```
# Edge Function Secrets (Supabase → Project Settings → Edge Functions)
KAPSO_MASTER_API_KEY    = ...     # Partner Mode (master account)
OPENAI_API_KEY          = sk-...  # Modelos GPT-4o usados pelos agentes
ENCRYPTION_KEY          = ...     # AES-GCM para api_key_encrypted/webhook_secret_encrypted
GOOGLE_CLIENT_ID        = ...     # OAuth Calendar
GOOGLE_CLIENT_SECRET    = ...
STRIPE_WEBHOOK_SECRET   = whsec_...
WHATSAPP_VERIFY_TOKEN   = ...     # somente se usar Meta Cloud API direto

# Frontend (.env)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_CLIENT_ID
VITE_SENTRY_DSN
```

Webhook URL (registrado automaticamente pela ação `finalize`/`register-webhook` do `kapso-manager`):

```
https://<project>.supabase.co/functions/v1/whatsapp-webhook
```

---

## 5. 📐 Sugestões de refatoração

| ID | Alvo | Sugestão |
|---|---|---|
| REF-01 | `whatsapp-webhook/handlers/process-message.ts` (1418 linhas) | Quebrar `processNormalizedMessage` em handlers por intent (slash commands, agendamento, fallback IA). |
| REF-02 | `kapso-manager/index.ts` (904 linhas) | Extrair `KapsoCustomerService`, `WebhookRegistrar`, `KapsoDiagnostics` para arquivos próprios. |
| REF-03 | `src/features/documentos/DocumentosManager.tsx` (656 linhas), `WhatsAppIA.tsx` (500), `NovoContratoForm.tsx` (452) | Quebrar em sub-componentes (Form / Fields / Preview / Actions). |
| REF-04 | Hooks duplicados (`useAgendamentos`, `useAgendaAutomation`, `useAgendaIntelligence`) | Composição via base hook compartilhado. |
| REF-05 | Pastas órfãs no root (vide tabela 3) | Remover + atualizar `.gitignore`. |

---

## 6. 📊 Plano de hardening (próximos PRs)

### PR-A — RBAC server-side (alto impacto)
1. Criar `_shared/rbac.ts` com `canFromJWT(supabase, userId, action, resource)` espelhando `useRBAC`.
2. Aplicar em `assistant`, `agent-orchestrator`, `send-whatsapp-*`, `kapso-manager`.
3. Testes de integração que tentam acessar recurso de outro tenant/role.

### PR-B — Stripe & webhooks
1. `applyRateLimit` per `subscription_id` em `stripe-webhook`.
2. Audit de todas as edge functions que usam service role para confirmar `tenant_id` filter.

### PR-C — OAuth Google + PKCE
1. Gerar `code_verifier`/`code_challenge` em `useGoogleCalendarConnection`.
2. Validar `code_verifier` na Edge Function de exchange.

### PR-D — Output gate de IA
1. `_shared/legal-output-guard.ts` que filtra respostas com termos de "orientação específica".
2. Integrar ao processador de mensagens WhatsApp e ao `assistant`.

### PR-E — Limpeza de tech debt
1. Remover pastas órfãs (`.aiox-core`, `.antigravity`, `.codex`, `.cursor`, `.gemini`, `meu-projeto/`, `scenario/`) e ajustar `.gitignore`.
2. Resolver deprecation `baseUrl` no `tsconfig.json`.

---

## 7. 📋 Mudanças aplicadas neste audit (06/05/2026)

| Commit | Descrição |
|---|---|
| `chore(security): remove temp get-public-config debug edge function` | Removida função debug que expunha inventário de secrets para qualquer usuário autenticado. Zero callers em `src/`. |
| `fix(kapso): scope finalize webhook registration to tenant's customer` | `kapso-manager.finalize` agora passa `customerId` ao `registerWebhook`, prevenindo cross-customer phone-id resolution sob Partner Mode. |
| `chore(kapso): drop stale global KAPSO_WEBHOOK_SECRET references` | Remove referências obsoletas ao env global removido em 2026-04-10; `diagnose` agora valida `webhook_secret_encrypted` per-tenant. |
| `chore(db): drop 'evolution' from conexoes_whatsapp tipo CHECK` | Migration `20260506000001` re-remove `'evolution'` do CHECK regredido em `20260407000002`, defensive remap de eventuais rows residuais. |
| `docs: refresh AUDIT_REPORT and historicize JURIFY_FINAL_REPORT` | Este relatório; `JURIFY_FINAL_REPORT.md` marcado como snapshot histórico de 11/02/2026 (pre-Kapso). |

---

**Resumo:** Plataforma com base de segurança madura (RLS hardened, multi-tenant rigoroso, webhook HMAC per-tenant, rate-limit em duas fases). Os principais vetores residuais são RBAC ainda predominantemente client-side e a confiança em service-role em Edge Functions; os PRs A-D acima fecham essas frentes sem reescrita arquitetural.
