# Auditoria Completa Jurify — 2026-04-17

**Escopo:** Arquitetura, Segurança, Fluxo de IA, CRM/Features, Integrações, Banco de Produção LIVE
**Método:** 6 agentes paralelos (Opus 4.7) + verificação direta via Supabase Management API
**Branch:** `main` · **Commits desde 2026-04-10:** 7 · **Build:** lint 0, typecheck 0

---

## Score Geral: **74 / 100**

| Dimensão | Score | Ponderação |
|---|---:|---:|
| Segurança | 88 | 20% |
| Arquitetura & Qualidade de Código | 84 | 15% |
| Integrações (Código) | 85 | 10% |
| Integrações (Operacional) | 35 | 10% |
| Banco de Produção (live) | 72 | 15% |
| Fluxo de Agentes de IA | 71 | 15% |
| CRM / Completude de Features | 67 | 15% |

**Leitura:** a plataforma tem **código de qualidade enterprise** (hardening 32/32 de 2026-04-10 se manteve) mas está **presa em configuração operacional** e **tem gaps de produto** que impedem cobrança real e atuação jurídica ponta-a-ponta.

---

## O que está 100% funcionando

- **WhatsApp + IA autônoma** (Kapso v2, orchestrator, 5 agentes, parser PT-BR de agendamentos, handoff por 12 regex, auto-reativa após 2h)
- **Pipeline Kanban** com drag-drop e haptics mobile
- **RBAC departamental** + email verification + RLS tenant-scoped em 75 de 76 tabelas
- **Audit log imutável LGPD** + PII redaction em edge logs (CPF/CNPJ/RG/Bearer)
- **1474 testes passando**, 0 CVEs, 0 `any` em código de produção (exceto 3 justificados)
- **Dashboard real** com Sankey/Funnel/Revenue e RPC `get_dashboard_metrics` tenant-safe
- **37 rotas lazy** com retry, feature-based clean (zero hook→page/feature)

---

## O que falta apenas credenciamento do usuário (não é código)

| Credencial | Impacto | Esforço |
|---|---|---|
| `VITE_STRIPE_PRICE_PRO/ENTERPRISE` + `STRIPE_WEBHOOK_SECRET` | Checkout real destravado | 15min |
| `VITE_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Observabilidade prod | 10min |
| `ZAPSIGN_API_KEY` + `ZAPSIGN_API_URL` | Assinatura digital operacional | 10min |
| `POSTMARK_SERVER_TOKEN` | Emails transacionais entregam | 5min |
| `VITE_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Google Cloud OAuth app) | Calendar/Drive operacional | 30min |
| `FCM_SERVER_KEY`, `OCR_SPACE_API_KEY` | Push mobile + OCR de PDFs | 10min |
| Rotacionar `WHATSAPP_VERIFY_TOKEN` (último update jan/2026) | Higiene de secrets | 5min |
| Criar **projeto Supabase separado para staging** | Para de escrever em prod durante testes | 30min |
| Webhook Discord/Slack no Sentry | Alertas prod | 15min |

**Total credenciamento: ~2h** de trabalho do usuário. Isso sozinho leva o operacional de 35 → 90.

---

## Achados críticos que a memória do projeto afirmava estar resolvidos mas **NÃO estão** (stale memory)

| Afirmação da memória | Realidade LIVE |
|---|---|
| "n8n-webhook-forwarder morto removido" | **AINDA DEPLOYED** no Supabase (v77, ACTIVE) |
| "defense-in-depth RLS confirmado" | **45/76 tabelas com RLS não-forced** (owner bypassa) |
| "mv_leads_metrics dropado" | Confirmado ✓ |
| "auto-routing leads" | **Ausente do frontend** (grep `autoRout|routeLead|assignLeadToDepartment` = 0 matches em src/) |
| "Zero queries sem limit" | Substancialmente verdadeiro ✓ |
| "Husky pre-commit reforçado" | **Diretório `.husky/` não existe** nesta máquina (hook só roda em CI) |

---

## Findings P0 (BLOQUEIAM EXCELÊNCIA)

### Segurança & Dados
1. **`audit_log_archive` sem RLS** (live DB) — tabela de auditoria arquivada exposta. `pg_class.relrowsecurity=false, policy_count=0`.
2. **JWT anon + HEALTH_CHECK_TOKEN literais comitados** em `docs/setup_secrets.sh:84-85` e `.env.production.example:9`.
3. **Husky pre-commit ausente localmente** — scanner de secrets existe, mas não enforça. Os dois P0 acima teriam sido bloqueados.

### Billing & Observabilidade
4. **`subscriptions` + `pagamentos` + `subscription_plans` com 0 rows em prod** — Stripe webhook deployed, mas nenhum pagamento persistido. Pipeline de receita quebrada silenciosamente.
5. **Sentry DSN ausente em prod** — zero telemetria de erro; quebras passam invisíveis.
6. **`VITE_STRIPE_PRICE_PRO/ENTERPRISE` placeholder** — UI detecta e mostra `not_configured`, checkout não funcional.

### Infra
7. **Staging aponta para o ref do Supabase de produção** — workflow de staging corrompe dados reais.
8. **Fallback global Kapso removido, mas `webhook_secret` por tenant não provisionado** — qualquer tenant sem secret individual retorna 401, mudos.

### Produto (Legal SaaS)
9. **`processos/` sem integração com tribunal/CNJ/Escavador/Jusbrasil** — Legal SaaS brasileiro pedindo número do processo manualmente é gap de produto. Diferencial competitivo ausente.
10. **Auto-scheduling da IA:** `responsavel_id` FK criada (20260413000004) mas `process-message.ts:894-902` não preenche; `hasScheduleConflict` filtra por tenant, **ignora responsável** → dois advogados colidem artificialmente; **zero integração com Google Calendar** no INSERT de agendamento (advogado não vê no calendário).

---

## Findings P1 priorizados (19)

**RLS/Segurança (5):** `legal_knowledge` com policy pública `USING (true)` + `tenant_id` nullable (leak cross-tenant de base jurídica) · `webhook_events` com RLS on e 0 policies (frágil) · `audit_log.tenant_id`/`user_roles.tenant_id` nullable · 5 edge functions zombie deployed sem código (`n8n-webhook-forwarder`, `whatsapp-contract`, `agentes-ia-api-test`, `evolution-manager`, `google-oauth-exchange`) · 15 auth users vs 10 profiles (5 órfãos identity).

**IA pipeline (6):** rate-limit WhatsApp é global 120/min (um tenant spam derruba todos) · budget fail-open em erro de DB · orchestrator cai em `recepcionista` quando agent inválido (cliente jurídico ativo recebe saudação genérica) · handoff 12-regex sem cooldown (auto-reativa 2h reabre mesmo conversa sensível) · commands slash hard-coded em code · 3 pipes paralelos de AI (webhook inline, `ai-agent-processor`, `assistant`) divergindo em budget/quota/log.

**Integrações (5):** OpenAI sem retry/backoff (1 blip derruba agentes) · Postmark falha silenciosa em stripe-webhook (só `console.warn`) · ZapSign sem callback (estados out-of-sync) · secrets `STRIPE_WEBHOOK_SECRET`/`POSTMARK_SERVER_TOKEN`/`ZAPSIGN_API_KEY`/`GOOGLE_CLIENT_SECRET` ausentes na Vault do Supabase · pg_cron unverified (jobs de prazos/followups/weekly podem estar parados).

**Produto (3):** `contracts/DetalhesContrato.tsx:104` placeholder PDF viewer · onboarding 4 steps não cobre escritório/equipe/plano/branding · auto-routing departamento ausente do frontend (backend existe).

---

## Findings P2/P3 (36) — enumerados no relatório técnico completo

Resumo: over-indexing em `leads` (33 índices para 76 rows), 9 tabelas do motor de automação vazias (feature morta), 4 tabelas Google Calendar vazias, 5 tabelas knowledge-base com overhead pgvector sem uso, useEntityCRUD 468 linhas, 17 imports cross-feature sem barrel, 5 secondary lazy sem retry, placeholders visíveis em `SegurancaSection:214` e `ConfiguracoesPage:149`.

---

# Plano 100/100 — Caminho para a Excelência

Organizado em 4 ondas. Cada onda entrega valor independente.

## 🌊 Onda 0 — Credenciamento (2h, depende só do usuário)

Não requer código. Ações operacionais:

- [ ] Criar produtos/prices reais no Stripe (Pro + Enterprise) → setar `VITE_STRIPE_PRICE_PRO/ENTERPRISE` na Vercel
- [ ] Gerar `STRIPE_WEBHOOK_SECRET` novo no Dashboard Stripe → secret do Supabase + registrar eventos (`customer.subscription.*`, `invoice.payment_*`, `charge.refunded`)
- [ ] Criar projeto Sentry → `VITE_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` + Discord/Slack alert rule
- [ ] Criar conta ZapSign + `ZAPSIGN_API_KEY` → secret Supabase
- [ ] Criar domínio + sender no Postmark + `POSTMARK_SERVER_TOKEN` → secret Supabase
- [ ] Criar OAuth app Google Cloud (scopes: calendar.events) + `VITE_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- [ ] Gerar `ENCRYPTION_KEY` (`openssl rand -base64 32`) → secret Supabase
- [ ] Rotacionar `WHATSAPP_VERIFY_TOKEN` (janeiro → abril gap de 3 meses)
- [ ] Criar projeto Supabase separado para staging → atualizar `.github/workflows/deploy-staging.yml`
- [ ] Provisionar `webhook_secret` por tenant em `configuracoes_integracoes` (via script — executar para os 9 tenants existentes)

**Impacto:** Integrações 35 → **90**. Observabilidade 45 → **85**.

## 🌊 Onda 1 — Hardening crítico (1 sprint, ~40h código)

### Segurança
- [ ] `ALTER TABLE audit_log_archive ENABLE ROW LEVEL SECURITY; FORCE;` + policy `FOR ALL TO service_role USING(true)` (migration `20260417000001_fix_audit_archive_rls.sql`)
- [ ] Instalar husky local: `npm i -D husky && npx husky init && echo "npm run check:secrets && npm run lint" > .husky/pre-commit`
- [ ] Remover JWT anon literal de `docs/setup_secrets.sh:84` e `.env.production.example:9` → placeholders
- [ ] Rotacionar `HEALTH_CHECK_TOKEN` (exposto em docs)
- [ ] `ALTER TABLE legal_knowledge ALTER COLUMN tenant_id SET NOT NULL;` + dropar policy `USING(true)` + criar policy tenant-scoped
- [ ] `ALTER TABLE` forçar RLS nas 45 tabelas com `relforcerowsecurity=false` (script gerado por consulta ao `pg_class`)
- [ ] Backfill `tenant_id NOT NULL` em `audit_log`, `user_roles`
- [ ] Adicionar policy explícita em `webhook_events` (service-role only, documentada)

### Infra / zombies
- [ ] Deletar 5 edge functions zombie via `supabase functions delete n8n-webhook-forwarder whatsapp-contract agentes-ia-api-test evolution-manager google-oauth-exchange`
- [ ] Investigar 5 auth users sem profile → criar profile ou revogar access

### Pipeline AI (P0)
- [ ] Fix `process-message.ts` agendamento: resolver `responsavel_id` via nome + fallback admin
- [ ] Fix `schedule-parser.ts hasScheduleConflict`: adicionar filtro `.eq('responsavel_id', ...)`
- [ ] Wire Google Calendar: após INSERT em `agendamentos`, chamar `google-calendar` edge fn para criar evento
- [ ] Rate limit per-tenant no `whatsapp-webhook` (bucket `whatsapp-webhook:${tenantId}`)

### Billing — destravar receita
- [ ] Testar checkout end-to-end com Stripe **test** key → verificar que `subscriptions` e `pagamentos` persistem após webhook
- [ ] Se falhar: debugar handler em `stripe-webhook/index.ts` e `_shared/stripe-logic.ts`

**Impacto:** Segurança 88 → **96**. DB 72 → **86**. IA 71 → **82**. Billing passa a funcionar.

## 🌊 Onda 2 — Produto & excelência (2 sprints, ~80h)

### Diferencial Legal SaaS
- [ ] **Integração tribunal/CNJ:** avaliar Escavador, Codilo, ou Jusbrasil API. Pelo menos para puxar andamentos automáticos dado o número do processo. **Maior diferencial competitivo pendente.**
- [ ] **PDF viewer de contratos:** substituir `Em breve` por `react-pdf` viewer embarcado em `DetalhesContrato.tsx:104`
- [ ] **ZapSign webhook/callback** para status de assinatura em vez de polling

### Onboarding completo
- [ ] Expandir `onboarding/steps.tsx` de 4 para 6 steps: Dados Escritório + Convite Equipe + Escolha Plano + WhatsApp + Agentes + Branding/Done
- [ ] Remover placeholders visíveis (`SegurancaSection:214`, `ConfiguracoesPage:149`, `PlaceholderClassManager`)

### Robustez AI
- [ ] Retry + exponential backoff em `chat-completion`, `ai-agent-processor`, `media-processor` (OpenAI)
- [ ] Budget fail-CLOSED para tenants com histórico de estouro (lista de tenants high-risk)
- [ ] Handoff cooldown: após handoff, bloquear re-ativação automática por 24h ou até humano marcar resolvido
- [ ] Migrar slash commands para tabela `slash_commands` editável por admin
- [ ] Unificar 3 pipes AI (webhook, ai-agent-processor, assistant) atrás de lib compartilhada
- [ ] Quota mensal por **tokens** (não por rows de `agent_ai_logs`)

### Observabilidade
- [ ] Cron externo (Vercel Cron ou GH Actions) para `process-prazos-alerts`, `auto-followup`, `weekly-report`, `cleanup-agent-memory`
- [ ] Alert rules Sentry: error rate > 1%, p95 > 500ms, unhandled errors
- [ ] Teste formal de cobertura RLS: enumerar `pg_class` vs `pg_policy` e comparar com whitelist

### CRM completude
- [ ] Auto-routing lead → departamento no frontend (backend existe)
- [ ] Honorários: dashboard de recebíveis, export CSV, recurring billing UI
- [ ] Reports: botão export CSV/PDF
- [ ] Documentos: viewer (PDF/Word) + organização por pastas/tags

**Impacto:** CRM 67 → **88**. IA 82 → **92**. Observabilidade 85 → **95**.

## 🌊 Onda 3 — Performance & polimento (1 sprint, ~40h)

- [ ] Consolidar índices duplicados em `leads` (remover ~10 de 33 redundantes)
- [ ] VACUUM FULL em tabelas com bloat >70%: `whatsapp_conversations`, `conexoes_whatsapp`, `rate_limits`, `configuracoes_integracoes`, `system_settings`
- [ ] Drop de 5 tabelas knowledge-base vazias com overhead pgvector (ou popular com dados reais)
- [ ] Decidir fate do motor de automação (9 tabelas mortas): remover ou lançar feature
- [ ] Decidir fate Google Calendar tables vazias (4 tabelas) após Onda 0 ativar integração
- [ ] Criar `supabase/seed.sql` canônico (substituir seeds dispersos em migrations)
- [ ] LGPD export expandido: incluir processos, prazos, honorários, documentos, WhatsApp
- [ ] 6 `React.lazy` secundários → `lazyWithRetry` (Dashboard Sankey, PrazosDashboard, FlowEditor, etc.)
- [ ] Tipar `queryModifier` em `useEntityCRUD` com `PostgrestFilterBuilder` (remove 3 `any`)
- [ ] ESLint `no-restricted-imports` bloqueando `@/features/*/components/**` (força barrel exports)
- [ ] Remover `ErrorBoundary` duplicado entre `main.tsx` e `App.tsx`
- [ ] Mover `WhatsAppWizard` de `features/conexoes/` para `features/whatsapp/`
- [ ] Dividir `useEntityCRUD.ts` em `.types.ts` + `.core.ts`
- [ ] Adicionar `npx madge --circular` no CI como guard

**Impacto:** Arquitetura 84 → **94**. DB 86 → **92**.

---

## Projeção de scores pós-plano

| Dimensão | Hoje | Pós-Onda 0 | Pós-Onda 1 | Pós-Onda 2 | Pós-Onda 3 |
|---|---:|---:|---:|---:|---:|
| Segurança | 88 | 89 | **96** | 96 | 97 |
| Arquitetura | 84 | 84 | 85 | 88 | **94** |
| Integrações código | 85 | 85 | 87 | **95** | 96 |
| Integrações operacional | 35 | **90** | 92 | 96 | 96 |
| DB live | 72 | 74 | **86** | 88 | **92** |
| IA Flow | 71 | 74 | 82 | **92** | 93 |
| CRM/Features | 67 | 70 | 72 | **88** | 92 |
| **GERAL** | **74** | **81** | **88** | **93** | **96** |

Excelência 100/100 é um ideal; **96/100 é atingível em ~4 sprints** (8 semanas) com o plano acima. Os 4 pontos restantes ficam em:
- Integração tribunal (roadmap de produto, pode exigir parceria comercial)
- Zero-downtime DB deployments
- Performance sob carga real (precisa tráfego para medir)
- Acessibilidade WCAG AA completa (auditoria dedicada não foi feita)

---

## Recomendação estratégica

**Faça a Onda 0 hoje** (2h, credenciais). Isso já tira a plataforma de "tecnicamente pronto mas comercialmente parado" e coloca em "gerando receita com observabilidade".

**Faça a Onda 1 esta semana** (40h, hardening + billing destravado). Depois desta, a plataforma está 88/100 — **pronta para cobrança real, para onboarding de clientes reais, e para dormir tranquilo**.

**Ondas 2 e 3 são roadmap de produto e polimento** — priorize pelo que gera receita/retenção (tribunal, onboarding, PDF viewer) vs débito técnico (over-indexing, placeholders).

---

## Artefatos desta auditoria

- Este sumário: `docs/audit/2026-04-17/00-EXECUTIVE-SUMMARY.md`
- Relatórios por área dos 6 agentes: transcritos nas notificações desta sessão (não persistidos como arquivos individuais para evitar ruído — toda a ação está neste sumário + checklist)

**Arquivos-chave citados (por P0/P1):**
- `supabase/migrations/20260413000004_agendamentos_responsavel_fk.sql`
- `supabase/functions/whatsapp-webhook/handlers/process-message.ts:894-902`
- `supabase/functions/_shared/schedule-parser.ts:212-235`
- `supabase/functions/_shared/ai-budget.ts:31-32`
- `supabase/functions/agent-orchestrator/index.ts:97-98`
- `src/features/contracts/components/DetalhesContrato.tsx:104`
- `src/features/settings/configuracoes/SegurancaSection.tsx:214`
- `src/features/settings/ConfiguracoesPage.tsx:149`
- `src/features/onboarding/steps.tsx`
- `docs/setup_secrets.sh:84-85`
- `.env.production.example:9`
- `src/hooks/useEntityCRUD.ts:1-468`
