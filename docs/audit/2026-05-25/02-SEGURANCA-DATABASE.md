# 02 — Segurança & Database

**Auditor:** Staff Security / DBA review
**Data:** 2026-05-25
**Projeto Supabase:** `yfxgncbopvnsltjqetxw` (Jurify, sa-east-1, ACTIVE_HEALTHY, Postgres 17.4.1.054)
**Branch:** main · Última migration aplicada em prod: `20260507214704_drop_legacy_for_all_policies_rbac_bypass`
**Snapshot:** 90 tabelas em `public`, 22 auth.users, 17 tenants, 0 órfãos, 77 leads, 815 mensagens WhatsApp, 2108 linhas em `audit_log`

---

## Resumo executivo

A postura geral é **substancialmente melhor do que em 2026-04-10/04-23**. Os fixes pesados da onda de 2026-05-07 (commits c479dab / cba0d9a / c73155e) entregaram:

- **RLS 90/90 tabelas com `relrowsecurity=true` E `relforcerowsecurity=true`** (em 2026-04-17 era 1/76 force RLS — agora 100 %).
- **0 advisors com nível ERROR** no Supabase linter.
- **0 SECURITY DEFINER sem `SET search_path`** (era 71 em 2026-04-17).
- **Audit log imutável** funcional via triggers `prevent_audit_update`/`prevent_audit_delete`.
- **CSP, HSTS, X-Frame-Options, COOP/CORP, Permissions-Policy todos presentes** em `vercel.json` (com `script-src 'self'` sem `unsafe-inline`).
- **TruffleHog full-history + scanner custom** rodam em pre-commit + CI; nenhum JWT/sk_/whsec_/GOCSPX- ativo em `src/` ou `supabase/functions/`.

**Porém ainda há issues reais** que precisam de fix antes de divulgar a 1ª onda de clientes:

| ID | Severidade | Findings |
|----|------------|----------|
| **P0-1** | Crítico | 2 policies legacy `Acesso total autenticado` em `agent_ai_logs` e `agent_executions` permitem **vazamento cross-tenant** de logs de IA e histórico de execuções de agentes. Mesma classe do bug que motivou a migration 20260507000017, só que essas duas tabelas ficaram de fora. |
| **P0-2** | Crítico | `lgpd_consent_log` e `assistant_audit` **não têm triggers de imutabilidade** — admin via JWT pode adulterar consentimento LGPD ou auditoria do assistente IA. Só `audit_log` está protegido. |
| **P1-1** | Alto | Postgres 17.4.1.054 com patches de segurança pendentes (Supabase advisor `vulnerable_postgres_version`). Versão de produção do projeto `Judson APP` na mesma org já está em 17.6.1.113. |
| **P1-2** | Alto | `auth_leaked_password_protection` (HIBP) desabilitado — habilitar é 1 toggle no painel. |
| **P1-3** | Alto | 87 funções `SECURITY DEFINER` executáveis pela role `anon` (sem JWT). Mesmo com `search_path` setado, qualquer endpoint sem JWT pode disparar `apply_rls_defaults`, `cleanup_expired_data`, `expire_trials`, `seed_default_agents`, etc. via `/rest/v1/rpc/<fn>`. |
| **P2-1** | Médio | Extension `vector` instalada no schema `public` (advisor `extension_in_public`). |
| **P2-2** | Médio | 697 advisors `multiple_permissive_policies` + 278 `auth_rls_initplan` — performance/manutenção, ver seção dedicada. |

Nenhuma chave hardcoded foi encontrada em `src/` ou `supabase/` (apenas em docs históricos `docs/security/SECURITY_ALERT_CHAVES_COMPROMETIDAS.md`). Pré-commit hook + GitHub Action com TruffleHog estão ativos.

---

## Supabase advisors (security)

Total: **186 lints**, todos nível **WARN** (zero ERROR).

| Lint | Qtd | Severidade traduzida | Observação |
|------|-----|----------------------|-----------|
| `authenticated_security_definer_function_executable` | 93 | P1 | Toda função SECURITY DEFINER em `public` é chamável por qualquer usuário autenticado via PostgREST `/rest/v1/rpc/<fn>`. Inclui funções administrativas (`apply_rls_defaults`, `expire_trials`, `seed_default_agents`, `cleanup_expired_data`, `complete_job`, `fail_job`). Embora a maioria internamente cheque tenant_id/role, qualquer divergência futura é exploit por abuso de RPC. |
| `anon_security_definer_function_executable` | 89 | P1 | Pior: **87 dessas funções são executáveis sem JWT** (anon). Inclui `validate_api_key_v2`, `audit_trigger_fn`, `current_tenant_id`, `find_lead_by_phone`, `get_current_tenant_id`. Enumeration + DoS via `/rest/v1/rpc/<fn>` sem autenticação. |
| `extension_in_public` | 2 | P2 | `vector` em `public` (recomendado: schema `extensions`). |
| `vulnerable_postgres_version` | 1 | P1 | `17.4.1.054` com patches pendentes — outro projeto da org está em 17.6.1.113. |
| `auth_leaked_password_protection` | 1 | P1 | HIBP desligado no Dashboard → Auth → Providers → Password. |

**Funções SECURITY DEFINER expostas a `anon` que merecem atenção imediata:**
`apply_rls_defaults`, `expire_trials`, `complete_job`, `fail_job`, `claim_next_job`, `seed_default_agents`, `seed_default_agents_v2`, `cleanup_expired_data`, `cleanup_old_webhook_events`, `cleanup_retention_logs`, `archive_old_audit_logs`, `archive_old_whatsapp_messages`, `audit_trigger_fn`, `release_stale_locks`, `mark_overdue_followups`, `detect_inactive_leads`, `propagate_message_sentiment_to_conv`. Cada uma dessas mexe em estado e foi pensada pra cron / trigger, não pra RPC pública.

Apenas **4 funções** restringem corretamente ao `authenticated` apenas (e não a `anon`):
`consume_oauth_pending_state`, `create_oauth_pending_state`, `decrypt_whatsapp_message_content`, `try_acquire_schedule_slot`.

> Fonte: `mcp__claude_ai_Supabase__get_advisors(security)` salvo em
> `C:\Users\User\.claude\projects\e--Jurify\<session>\tool-results\mcp-claude_ai_Supabase-get_advisors-1779750089462.txt`

---

## Supabase advisors (performance)

Total: **1.229 lints** (todos `WARN` ou `INFO`).

| Lint | Qtd | Top tabelas (qtd) |
|------|-----|-------------------|
| `multiple_permissive_policies` | 697 | `agent_ai_logs`(24), `agent_executions`(24), `ai_usage`(24), `api_keys`(24), `configuracoes_integracoes`(24), `departamento_membros`(24), `google_calendar_tokens`(24), `knowledge_base`(24), `lead_interactions`(24), `automation_flow_*`(24) |
| `auth_rls_initplan` | 278 | `profiles`(12), `system_settings`(10), `notification_templates`(9), `user_roles`(9), `user_permissions`(9), `api_keys`(8), `configuracoes_integracoes`(8), `whatsapp_conversations`(8) |
| `unused_index` | 189 | espalhado |
| `unindexed_foreign_keys` | 49 | `agent_ai_logs`(3), `automation_tasks`(2), `conexoes_whatsapp`(2), `feature_overrides`(2), `leads`(2), `reminders`(2), `tarefas`(2), `whatsapp_conversation_notes`(2) |
| `duplicate_index` | 16 | `agendamentos`(2), `assistant_audit`(2), `user_permissions`(2), `whatsapp_conversations`(2) + 8 outras |

`auth_rls_initplan` é regravar `(select auth.uid())` em vez de `auth.uid()` em policies — ganho de escala mas não é vulnerabilidade. `multiple_permissive_policies` indica policies redundantes (PERMISSIVE são OR-ed) — algumas dessas são exatamente o vetor explorado no P0-1.

---

## RLS audit (tabela por tabela das críticas)

### Status global
- `pg_class.relrowsecurity`: **90/90** tabelas
- `pg_class.relforcerowsecurity`: **90/90** tabelas (era 1/76 em 2026-04-17)
- Tabelas SEM `tenant_id`: 9 — todas justificáveis (`features`, `subscription_plans`, `tenants`, `role_permissions`, `rate_limits`, `email_failures`, `webhook_events`, `oauth_pending_states`, `google_calendar_*`). `google_calendar_*` usa `user_id`, e a tabela `tenants` é resolvida por `tenants_select` com `is_admin()`.

### Policies suspeitas encontradas

#### P0-1 — Cross-tenant leak via policies legacy (CRÍTICO)

```sql
-- agent_ai_logs
"Acesso total autenticado logs"  FOR ALL  USING (auth.role() = 'authenticated')
-- agent_executions
"Acesso total autenticado execucoes"  FOR ALL  USING (auth.role() = 'authenticated')
```

Como PostgreSQL combina policies PERMISSIVE com **OR**, qualquer usuário autenticado de qualquer tenant pode `SELECT *` em ambas as tabelas e ver logs de IA e execuções de **todos os 17 tenants em prod**. Em `agent_ai_logs` os logs incluem `query`, `response`, `tools_used`, e em `agent_executions` há `input_data`/`output_data` — provavelmente com **CPF/CNPJ/dados de processos jurídicos** vazando.

Este é exatamente o vetor que a migration `20260507000017_drop_legacy_for_all_policies_rbac_bypass.sql` corrigiu para `agendamentos`, `agentes_ia`, `contratos`, `whatsapp_messages`. **Os fixes ficaram incompletos** — `agent_ai_logs` e `agent_executions` continuam vulneráveis.

**Remediação imediata:**
```sql
DROP POLICY IF EXISTS "Acesso total autenticado logs" ON public.agent_ai_logs;
DROP POLICY IF EXISTS "Acesso total autenticado execucoes" ON public.agent_executions;
```
(As policies estritas `agent_ai_logs_select`, `agent_executions_select` já cobrem o caso correto via tenant_id.)

#### Outras policies overly-permissive (não vulnerabilidades, mas vale revisar)

| Tabela | Policy | Análise |
|--------|--------|---------|
| `features` | `features_read USING (true)` para `authenticated` | OK — catálogo público de features. |
| `subscription_plans` | `subscription_plans_read USING (true)` | OK — catálogo de planos exibido na pricing page. |
| `lgpd_consent_log` | `lgpd_consent_log_service_role_insert WITH CHECK (true)` para service_role | OK. |
| `documents`, `legal_knowledge`, `conversation_state`, `oauth_pending_states`, `processo_andamentos`, `webhook_events`, `whatsapp_*_summaries`, `workflow_jobs`, `whatsapp_meta_templates`, `whatsapp_quick_replies` | `*_service_role USING (true) WITH CHECK (true)` para `{service_role}` | OK por design (service_role bypassa RLS de qualquer forma, mas declarar a policy não afeta segurança). |
| `email_failures`, `rate_limits` | policies que negam `authenticated`/`anon` (USING false) | OK — defense-in-depth. |

### Cobertura de policies
- 0 tabelas sem nenhuma policy.
- `documento_folders`, `documentos_juridicos`, `drive_folders`, `feature_overrides`, `prazos_processuais`, `automation_tasks`, `reminders` têm **apenas 1 policy** — em geral uma `*_tenant` ou `service_role`. Não é vulnerabilidade, mas vale validar se SELECT/INSERT/UPDATE/DELETE estão todos cobertos individualmente para evitar regressão como a do P0-1.

---

## Edge Functions security

**59 edge functions** em `supabase/functions/`. Padrão geral é sólido:

| Aspecto | Implementação | Veredito |
|---------|--------------|----------|
| Service-role check | `_shared/supabase-client.ts → isServiceRole()` com comparação byte-a-byte XOR timing-safe + early `length !== length` return ANTES do loop. Aplicado em `process-prazos-alerts`, `process-meeting-reminders`, `process-followup-queue`, `media-processor`, `weekly-report`, `cleanup-agent-memory`, `tribunal-sync`, `auto-followup`, `ai-agent-processor`. | OK |
| HMAC verification | `whatsapp-webhook` usa `timingSafeCompare` em `_shared/whatsapp-logic.ts`. `stripe-webhook` usa `Stripe.createSubtleCryptoProvider()` (constant-time). `zapsign-webhook` tem `timingSafeEqualBytes`. `health-check`/`data-retention-cleanup` usam `crypto.subtle.timingSafeEqual`. | OK |
| CORS | `_shared/cors.ts` valida origin contra allowlist + regex específica `^https://jurify-[a-z0-9]+-alef-vieiras-projects\.vercel\.app$`. Quando origin desconhecida, retorna `Access-Control-Allow-Origin: null`. Reflete header só se já validado. | OK |
| Logger / PII redaction | `_shared/logger.ts` aplica `redactPII()` em strings (email, CPF, CNPJ, phone, Bearer/JWT) e em campos sensíveis (password, token, cpf, cnpj, email, telefone, secret, encryption_key, credit_card). Profundidade limitada a 6 (DoS-safe). | OK |
| Rate limiting | `_shared/rate-limiter.ts` usado via `applyRateLimit`/`checkRateLimit`. Tabela `rate_limits` com policy `USING (false)` para auth/anon. Worth re-checking distribution. | OK |
| JWT verification | `supabase/config.toml` desativa explicitamente `verify_jwt` apenas em `stripe-webhook`, `whatsapp-webhook`, `zapsign-integration`, `health-check`, `health`. Cada uma tem sua própria validação (HMAC ou bearer token). | OK |
| Input validation | `_shared/security.ts → sanitizeInput()` faz normalização NFKD + homoglyph defense + base64 decode-and-recheck contra patterns de prompt injection. | OK |
| Direct `req.headers.get("authorization")` sem validação | Apenas em `encrypt-data` e `decrypt-data` — verificadas: usam o token só pra criar client com escopo do usuário (não bypass). | OK |
| Hardcoded secrets em código edge | Nenhum JWT/sk_/whsec_/GOCSPX- ativo encontrado. | OK |

### Issues observados

| ID | Severidade | Edge function | Issue |
|----|------------|---------------|-------|
| EF-1 | Info | `stripe-webhook` | Apesar de logar falhas em `email_failures`, o webhook retorna 200 mesmo em falha de email — design intencional (Stripe não retentaria payment events por causa de Postmark). Confirmar que ops monitora `email_failures` regularmente. |
| EF-2 | Info | `whatsapp-webhook` | Removeu `KAPSO_WEBHOOK_SECRET` global em 2026-04-10, agora exige per-tenant em `configuracoes_integracoes`. Tenants criados antes do fix podem estar sem secret — verificar via `SELECT COUNT(*) FROM configuracoes_integracoes WHERE integration_name='whatsapp_kapso' AND webhook_secret IS NULL`. |
| EF-3 | Info | `tribunal-sync`, `auto-followup` etc. | Endpoint só aceita `isServiceRole()` — bom. Se algum dia algum cron for movido pra outro lugar, repensar autenticação. |

Nenhum `fetch()` com URL controlada pelo usuário (SSRF) — apenas URLs construídas (Google/Escavador/Postmark/Kapso). XSS via `dangerouslySetInnerHTML` aparece **apenas** em `src/components/ui/chart.tsx`, com payload computado server-side a partir de `colorConfig` (config controlada pelo dev, não pelo usuário). Sem risco.

---

## Secrets management

| Camada | Status |
|--------|--------|
| `.husky/pre-commit` | Executa `npm run check:secrets && npm run lint`. |
| `scripts/check-secrets.cjs` | Patterns: JWT, OpenAI `sk-`, Stripe `(sk\|pk\|rk)_(live\|test)_`, Google `GOCSPX-`, literal `SUPABASE_SERVICE_ROLE_KEY=eyJ`. Allowlist para fixtures de teste. |
| `.github/workflows/pre-commit-check.yml` | TruffleHog v3.88.0 com `--results=verified,unknown --fail` em PR + push em main/staging/develop. Diff completo `--depth=0`. |
| `git log --all --diff-filter=A -- '*.env*'` | 1 hit histórico (commit d51119bb de 2026-04-06 — comprehensive audit, sem env real). |
| Grep ativo (`eyJ...eyJ...`) em `src/` e `supabase/` | Zero matches. |
| Grep `sk_(live|test)_|GOCSPX-` em `src/`, `supabase/`, `scripts/` (sem `docs/`) | Zero matches em código de runtime; matches só em docs históricos de incidente. |
| JWT/sessão no client | `localStorage` (`storageKey: 'jurify-auth'`) — padrão Supabase. Mitigado por CSP `script-src 'self' https://*.sentry.io https://js.stripe.com` (sem `unsafe-inline`). |

**Vetores de leak ainda possíveis (não confirmados):**
- Logs do Supabase Edge Functions na console: o logger faz `redactPII` mas funções legadas que ainda usam `console.log(...)` direto podem expor — buscar `console.log` ativo em `_shared/` (poucos hits, em `_shared/sentry.ts` e função de debug).
- Variáveis VITE_* expostas no bundle do client: confirmar que apenas `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_STRIPE_PUBLISHABLE_KEY` saem no bundle.

---

## OWASP findings

| OWASP A | Status no Jurify |
|---------|------------------|
| **A01 Broken Access Control** | **P0-1 ABERTO** — `agent_ai_logs`, `agent_executions` com policy cross-tenant. Resto da matriz RBAC está coberta via `has_permission()`/`has_role()` + RLS forçada. |
| **A02 Cryptographic Failures** | OK — `whatsapp_messages.content_encrypted` (dual-read migration 2026-05-07), `api_keys.api_key_hash`, `prepare_credential_encryption`, plaintext secrets removidos. Web Crypto nativo no client. |
| **A03 Injection** | OK — TanStack Query + Supabase client (parametrizado). Sem `execute_sql` no client. `sanitizeInput()` defende prompt injection nos endpoints IA. |
| **A04 Insecure Design** | Pontos a observar: idempotência do `stripe-webhook` (verificada via deduplicação por event_id), idempotência do `whatsapp-webhook` (verificada via `webhook_events.upsert(onConflict)`), state machine de lead status (migration `lead_status_state_machine` aplicada). |
| **A05 Security Misconfiguration** | P1 — Postgres outdated, HIBP off, `extension_in_public` vector. CSP/HSTS/COOP/CORP OK. |
| **A06 Vulnerable Components** | Confirmar `npm audit` = 0 vulnerabilidades — última verificada em 2026-04-23. Auditoria 03 (DevEx) deve revalidar. |
| **A07 ID & Auth Failures** | OK — Supabase Auth com `persistSession + autoRefreshToken`. OTP/MFA configurável no Dashboard (pendente toggle). |
| **A08 Software & Data Integrity** | **P0-2 ABERTO** — `lgpd_consent_log` e `assistant_audit` sem triggers de imutabilidade; admin com JWT pode adulterar registros. |
| **A09 Logging & Monitoring** | Sentry integrado, `audit_log` imutável, `logs_atividades` com RLS admin-only. Falta correlação `traceId` no logger edge (apenas no Sentry). |
| **A10 SSRF** | OK — fetches a URLs constantes (Google, Escavador, Postmark, Kapso, Stripe, Supabase functions). Nenhum hit em `fetch(req.body.url)`. |

XSS: o único uso de `dangerouslySetInnerHTML` é em `src/components/ui/chart.tsx` para gerar `<style>` a partir de configuração estática (`colorConfig`). Sem caminho para input do usuário. CSP sem `unsafe-inline` em `script-src` mitiga residualmente.

CSRF: API requests fazem `Authorization: Bearer <jwt>` via header (não cookie-based) → CSRF não aplica ao backend Supabase. Webhooks externos (Stripe/WhatsApp/ZapSign) usam HMAC.

---

## PII/LGPD

| Controle | Estado |
|----------|--------|
| `audit_log` imutável | OK — `prevent_audit_delete`, `prevent_audit_update` triggers BEFORE. |
| `lgpd_consent_log` imutável | **NÃO** — sem triggers. P0-2. Apenas 1 row existe atualmente. |
| `assistant_audit` imutável | **NÃO** — sem triggers. P0-2. |
| Mascaramento em logs edge | OK — `_shared/logger.ts` aplica `redactPII` em campos sensíveis (CPF, CNPJ, email, telefone, token, secret) com profundidade limitada. |
| Mascaramento em respostas IA | OK — `_shared/security.ts → redactPII()` substitui CPF/RG/Card. |
| `pii_redaction` em DB | Migration `20260404000005_pii_redaction` aplicada. |
| `retention_policy_config` | Migration aplicada. `cleanup_expired_data`, `cleanup_retention_logs` chamadas via cron. |
| `consent_logs` (usuário-level) | Existe RLS (`Users can view own consent logs`) + insert restrita ao próprio `auth.uid()`. |
| LGPD consent ao login | Migration `20260507000011_lgpd_consent_log` aplicada — verificar se o frontend (`/onboarding`, `/login`, `/configuracoes`) está realmente coletando o consent. Apenas 1 row em prod. |
| `whatsapp_messages.content` | Migration `20260507000014_whatsapp_messages_content_encrypted` (dual-read) — content criptografado em coluna nova; deprecation da coluna plaintext pendente. |

**Risco LGPD residual:** auditoria do assistente IA (`assistant_audit`) e log de consentimento (`lgpd_consent_log`) podem ser adulterados por admin de tenant via API Supabase. ANPD considera esse cenário insuficiente — exigem WORM-like.

---

## Database integrity

### Foreign keys & cascade

Verifiquei `leads`, `whatsapp_conversations`, `whatsapp_messages`, `processos`, `agendamentos`, `contratos`, `tarefas`. Cascade patterns:

- Todas têm `tenant_id → tenants(id) ON DELETE CASCADE` (correto — deletar tenant limpa derivados).
- `*_lead_id → leads(id) ON DELETE SET NULL` (correto — apaga lead não destrói histórico).
- `whatsapp_messages.conversation_id → whatsapp_conversations(id) ON DELETE CASCADE` (correto).
- `*_responsavel_id → profiles(id)` SEM ON DELETE — bloqueará delete de profile que tem leads/processos/etc. Pode causar `409` em desativação de usuário. Considerar `ON DELETE SET NULL`.

### Unique constraints

- `whatsapp_messages.message_id` UNIQUE — anti-replay.
- `contratos.numero` UNIQUE — anti-duplicação.
- Migration `20260507000015_unique_constraints_defense_in_depth` aplicada (validar conteúdo na auditoria de produto).

### Indexes em tenant_id

Apenas **3 tabelas** sem index em `tenant_id`: `whatsapp_auto_reply_log`, `whatsapp_conversation_notes`, `whatsapp_conversation_summaries`. Volume baixo hoje (logs/notas/resumos), mas vira problema com escala. **Criar índice composto** (tenant_id, created_at) ou (tenant_id, conversation_id).

### Migrations divergência

- 169 migrations aplicadas em prod (lista completa via `list_migrations`).
- Última: `20260507214704_drop_legacy_for_all_policies_rbac_bypass` (aplicada 2026-05-07).
- Local em `supabase/migrations/`: 169 arquivos + `SQUASH_REFERENCE.md`.
- Não há nenhum arquivo local com timestamp **posterior** ao último aplicado em prod — sem divergência (validar com `supabase migration list` se for fazer release).
- Migrations destrutivas recentes: `20260507000017_drop_legacy_for_all_policies_rbac_bypass.sql` (DROP POLICY × 4). Backup automático Supabase cobre. Sem migration de DROP TABLE / TRUNCATE no batch atual.

---

## Achados P0/P1/P2/P3

### P0 — Bloqueador antes do go-live

1. **P0-1 — Cross-tenant leak em `agent_ai_logs` e `agent_executions`.** Aplicar:
   ```sql
   DROP POLICY IF EXISTS "Acesso total autenticado logs" ON public.agent_ai_logs;
   DROP POLICY IF EXISTS "Acesso total autenticado execucoes" ON public.agent_executions;
   ```
   Estimativa: 5 min. Testar com 2 tenants antes/depois.

2. **P0-2 — Imutabilidade ausente em `lgpd_consent_log` e `assistant_audit`.** Replicar o pattern de `audit_log`:
   ```sql
   CREATE TRIGGER prevent_lgpd_consent_update BEFORE UPDATE ON lgpd_consent_log
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
   CREATE TRIGGER prevent_lgpd_consent_delete BEFORE DELETE ON lgpd_consent_log
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
   -- repetir para assistant_audit
   ```
   Estimativa: 10 min.

### P1 — Alto risco, fechar nesta semana

3. **P1-1 — Upgrade Postgres** de `17.4.1.054` → `17.6.x` via painel Supabase (Project Settings → Infrastructure). Janela de manutenção curta. Validar advisor `vulnerable_postgres_version` some.
4. **P1-2 — Habilitar HIBP** em Authentication → Providers → Password → "Leaked password protection". 1 clique.
5. **P1-3 — Revogar EXECUTE em SECURITY DEFINER administrativas para `anon`.** Para cada uma das 17 funções administrativas críticas listadas:
   ```sql
   REVOKE EXECUTE ON FUNCTION public.<fn>() FROM anon;
   ```
   Considerar `REVOKE FROM authenticated` também para funções de cron (`expire_trials`, `cleanup_*`, `archive_*`, `claim_next_job`, `complete_job`, `fail_job`, `seed_default_agents*`, `apply_rls_defaults`). Manter apenas para `service_role` e `postgres`.

### P2 — Médio, próximo sprint

6. **P2-1 — Mover extension `vector`** de `public` para `extensions`. Requer `DROP EXTENSION vector CASCADE; CREATE EXTENSION vector SCHEMA extensions;` + atualizar `search_path` das funções `match_legal_documents` etc. Cuidado com índices HNSW existentes — testar em branch antes.
7. **P2-2 — Consolidar `multiple_permissive_policies` (697 hits).** Para cada uma das tabelas top (24 hits cada), revisar se há redundância (e.g. 4 policies SELECT idênticas em escopo mas com nomes diferentes). Foco em `agent_ai_logs`, `agent_executions`, `ai_usage`, `api_keys`, `configuracoes_integracoes`, `google_calendar_tokens`, `knowledge_base`, `lead_interactions`, `automation_flow_*`.
8. **P2-3 — Otimizar `auth_rls_initplan` (278 hits).** Reescrever `auth.uid()` → `(SELECT auth.uid())` nas policies dos top 8 tables (`profiles`, `system_settings`, `notification_templates`, `user_roles`, `user_permissions`, `api_keys`, `configuracoes_integracoes`, `whatsapp_conversations`). Ganho de escala 10-100×.
9. **P2-4 — Adicionar índice (tenant_id, …)** em `whatsapp_auto_reply_log`, `whatsapp_conversation_notes`, `whatsapp_conversation_summaries`.

### P3 — Baixo / housekeeping

10. **P3-1 — Remover 16 duplicate indexes** (`agendamentos`, `assistant_audit`, `user_permissions`, `whatsapp_conversations`, etc.).
11. **P3-2 — Dropar 189 unused indexes** após observação adicional (alguns podem ser previstos para queries futuras — usar `pg_stat_user_indexes` com 14d de retenção antes).
12. **P3-3 — Criar 49 índices em FKs** sem índice (`unindexed_foreign_keys`) — só após confirmar volume real.
13. **P3-4 — Reduzir CASCADE em FKs de `responsavel_id`** para `SET NULL` onde aplicável.
14. **P3-5 — Auditar uso de `console.log`** em `_shared/sentry.ts` e qualquer outra função que ainda use console direto sem `createEdgeLogger`.

---

## Recomendações

### Imediato (24h, antes de ativar 1ª onda de clientes)
- Executar **P0-1** e **P0-2** como uma migration combinada (`20260525000001_security_fixes_round_8.sql`).
- Executar **P1-2** (HIBP toggle, 1 clique).
- Executar parte de **P1-3** — revogar EXECUTE FROM anon de pelo menos as 17 funções administrativas críticas.

### Esta semana
- Executar **P1-1** (upgrade Postgres) em janela controlada.
- Smoke test cross-tenant após P0-1: criar 2 tenants, gerar `agent_ai_logs` em ambos, validar que tenant A não enxerga rows de tenant B no SQL Editor com JWT.
- Habilitar Sentry alerts (Discord/Slack) para qualquer 4xx/5xx em endpoints `/rest/v1/rpc/<fn>` — sinaliza tentativa de exploração de funções SECURITY DEFINER.

### Médio prazo
- **Política de release de migrations:** cada nova policy PERMISSIVE deve ser revisada manualmente — usar `pg_policies` view + checklist no PR.
- **Pentest externo** após GA — foco em RPC enumeration, RLS bypass via JWT manipulation, IDOR via UUID em query params.
- **Renovação periódica de chaves** — Stripe (anual), Supabase service_role (semestral), Kapso (semestral), Postmark (anual). Documentar em `docs/security/rotation-calendar.md`.
- **Vault para secrets** — migrar de Supabase Edge Secrets para Doppler ou similar com audit log.
- **Adicionar coluna `audit_log.row_hash` (SHA-256 chained)** para detectar adulteração mesmo de DBA com acesso ao Postgres bruto. WORM-like via PostgreSQL não é completo sem isso.

### Métricas a acompanhar
- Tabelas com RLS+FORCE: 90/90 → manter em **100%**.
- Advisors security `ERROR`: 0 → manter em **0**.
- Funções `SECURITY DEFINER` expostas a `anon`: 87 → meta **0** (apenas service_role + funções com necessidade explícita).
- Multiple permissive policies: 697 → meta **<300** em 60 dias.
- Sentry error rate em endpoints Supabase: definir baseline + alerta de 3σ.
