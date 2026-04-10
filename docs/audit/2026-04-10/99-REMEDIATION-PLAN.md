# Jurify — Plano de Remediação

**Data:** 2026-04-10
**Baseado em:** auditoria completa em `docs/audit/2026-04-10/`
**Entregável:** épico + stories prontos para `@pm *execute-epic`

Dois planos separados:
1. **Plano de correção** — P0s e P1s bloqueantes. Precisa ser feito antes de go-live.
2. **Plano de otimização** — melhorias de qualidade, performance e maturidade. Pós go-live.

---

# PARTE 1 — Plano de Correção (P0 + P1 bloqueantes)

## Sprint 0 — Emergency Fix (1 dia)

Tudo aqui é "código já está quebrado ou inseguro, conserta antes de qualquer outra coisa".

### EPIC-FIX-01: Desbloquear o build

**Story 0.1 — Consertar lint e type-check** (@dev, 30 min)
- [ ] `src/features/agendamentos/components/forms/NovoAgendamentoForm.tsx:113` — remover type assertion desnecessário
- [ ] `src/features/whatsapp/components/WhatsAppWidget.tsx:115` — consertar warning react-refresh (export só componentes ou adicionar `// eslint-disable-next-line react-refresh/only-export-components` com justificativa)
- [ ] `src/features/ai-agents/components/chat/chatQuickActions.tsx:1` — remover import `React` não usado
- [ ] Rodar `npm run lint && npm run type-check` até exit 0
- **AC:** CI green. Atualizar MEMORY.md só depois de confirmar.

**Story 0.2 — Rotacionar todos os secrets** (@devops, 2h)
- [ ] Gerar novas chaves: Supabase service role, Supabase anon, OpenAI, Stripe (secret + webhook), Kapso, Postmark, ZapSign (quando configurar)
- [ ] Atualizar Vercel env vars (prod + staging separadamente — ver story 0.3)
- [ ] Atualizar Supabase Edge Function secrets
- [ ] Revogar chaves antigas
- [ ] Remover JWT hardcoded em `supabase/migrations/20260307000007_prazos_alerts_scheduler.sql:18` — criar nova migration que substitui o valor por referência a secret via `current_setting()` ou remover a linha se pg_cron não está ativo
- [ ] Adicionar check no pre-commit hook para pegar qualquer token `eyJ*` em migrations
- **AC:** `git log -S 'sk_' --all | wc -l` não cresce após o commit. Nenhum token plaintext em código ou SQL. Documentar rotação em `SECURITY.md` com data.

**Story 0.3 — Isolar staging de produção** (@devops + @data-engineer, 4h)
- [ ] Criar projeto Supabase separado para staging
- [ ] Rodar todas as migrations no novo projeto
- [ ] Atualizar `.github/workflows/deploy-staging.yml` com novas env vars
- [ ] Remover TODO comentado no topo do arquivo
- [ ] Verificar que deploy de staging não toca no banco de prod
- **AC:** Dois projetos Supabase distintos. Env vars distintas no Vercel (prod vs preview). Um write em staging não aparece em prod.

**Story 0.4 — Ligar Sentry em produção** (@devops, 30 min)
- [ ] Adicionar `VITE_SENTRY_DSN` nas env vars do Vercel (prod + staging)
- [ ] Adicionar `SENTRY_AUTH_TOKEN` para upload de source maps
- [ ] Forçar um erro em staging e confirmar que aparece no Sentry
- [ ] Adicionar release tag no build (já está no vite.config.ts, só verificar)
- **AC:** Erro artificial em staging aparece no Sentry em <30s com source map resolvido.

---

## Sprint 1 — Correções de Segurança (2-3 dias)

### EPIC-FIX-02: Fechar buracos de segurança críticos

**Story 1.1 — Consertar RLS do google_calendar_tokens** (@data-engineer, 1h)
- [ ] Criar migration que dropa a policy atual `USING (true)` em `google_calendar_tokens`
- [ ] Criar nova policy tenant-scoped: `USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)`
- [ ] Adicionar policy separada `TO service_role USING (true)` para as edge functions
- [ ] Verificar com query de teste que usuário A não consegue ler tokens de usuário B
- **AC:** Teste de integração RLS que tenta cross-tenant read passa (bloqueado).

**Story 1.2 — Reconciliar Google OAuth com colunas criptografadas** (@data-engineer + @dev, 4h)
- [ ] Ler `20260406000002_drop_plaintext_secrets.sql` e entender exatamente o estado atual do schema
- [ ] Inspecionar em dev: a tabela tem `access_token`, `access_token_encrypted`, ambos?
- [ ] Atualizar `supabase/functions/google-calendar/oauth.ts:117-129` para escrever apenas nas colunas encrypted via Web Crypto
- [ ] Atualizar `supabase/functions/google-calendar/google-oauth.ts:31-50` da mesma forma
- [ ] Testar fluxo OAuth end-to-end em staging
- **AC:** OAuth funciona em staging, tokens só existem encrypted no banco. Documentar o estado em `docs/integrations/google-calendar.md`.

**Story 1.3 — Reduzir scope Google OAuth** (@dev, 15 min)
- [ ] Trocar `calendar` por `calendar.events` em `supabase/functions/google-calendar/oauth.ts:14`
- [ ] Verificar que escrita/leitura de eventos continua funcionando
- **AC:** App só pede permissão de eventos, não acesso completo ao calendário.

**Story 1.4 — Eliminar fallback HMAC global do WhatsApp webhook** (@dev, 2h)
- [ ] `supabase/functions/whatsapp-webhook/index.ts:770-775` — remover fallback para `KAPSO_WEBHOOK_SECRET` global
- [ ] Se tenant não tem segredo configurado, **rejeitar 401** (não processar)
- [ ] Atualizar UI de configuração para forçar segredo por tenant antes de habilitar webhook
- [ ] Documentar migration: avisar tenants existentes que precisam gerar segredo próprio
- **AC:** Webhook sem per-tenant secret retorna 401. Tenants configurados continuam funcionando.

**Story 1.5 — Resolver 9 vulnerabilidades high do npm audit** (@devops, 2h)
- [ ] Rodar `npm audit --json` e listar todas
- [ ] Atualizar Vite para a versão que corrige o dev-server file read
- [ ] Para `@capacitor/assets` → tar (não-corrigível direto), avaliar se `@capacitor/assets` é usado — se não, remover; se sim, pin versão segura de tar via overrides
- [ ] Rodar `npm run test` e `npm run build` para verificar que nada quebrou
- **AC:** `npm audit --audit-level=high` exit 0.

**Story 1.6 — Migrar JWTs de localStorage para httpOnly cookies** (@dev + @architect, 1-2 dias)
- [ ] Configurar Supabase client com cookie storage ou usar refresh via edge function
- [ ] Testar fluxo completo de login/logout/refresh
- [ ] Verificar que `document.cookie` não expõe o token (httpOnly)
- [ ] Atualizar testes de auth
- [ ] **Alternativa pragmática se for muito invasivo:** reforçar CSP para remover `'unsafe-inline'` de style-src, adicionar sanitização estrita em campos user-provided (nome de lead, mensagem WhatsApp, nome de arquivo), adicionar monitor de XSS attempts
- **AC:** Ou tokens em httpOnly cookies, ou surface de XSS é demonstravelmente fechada.

---

## Sprint 2 — Correções de Banco e Schema (1 dia)

### EPIC-FIX-03: Estabilizar schema

**Story 2.1 — Reconstruir ou eliminar mv_leads_metrics** (@data-engineer, 1h)
- [ ] Decidir: a MV ainda é usada? `get_dashboard_metrics` já substituiu? Se sim, dropar MV e a função `get_leads_metrics()`
- [ ] Se ainda for necessária: reescrever com novos valores de status, adicionar `REFRESH MATERIALIZED VIEW CONCURRENTLY` em trigger ou cron
- **AC:** Ou MV removida, ou retornando dados corretos com teste de sanidade.

**Story 2.2 — Auditar SECURITY DEFINER em RPCs** (@data-engineer, 2h)
- [ ] `get_dashboard_metrics`, `get_leads_por_area`, `check_prazos_vencendo` — todas são SECURITY DEFINER recebendo `_tenant_id` do frontend
- [ ] Adicionar validação no início de cada RPC: `IF _tenant_id != (auth.jwt()->>'tenant_id')::uuid THEN RAISE EXCEPTION 'unauthorized'; END IF;`
- [ ] Ou mudar para SECURITY INVOKER e deixar RLS filtrar
- **AC:** Nenhuma RPC SECURITY DEFINER confia em parâmetro de tenant sem verificar contra JWT.

**Story 2.3 — Verificar status real do pg_cron e deploys dos schedulers** (@devops + @data-engineer, 1h)
- [ ] Conectar ao Supabase dashboard → ver extensões ativas → confirmar se pg_cron está ou não
- [ ] Se não está: desabilitar schedulers nas migrations e mover lógica para edge function disparada por cron externo (Vercel Cron, Supabase Scheduled Functions, GitHub Actions)
- [ ] Se está: verificar que os jobs `prazos_alerts`, `automation_tasks_cleanup` estão rodando e com qual identidade
- [ ] Corrigir discrepância entre MEMORY.md e realidade, atualizar memory
- **AC:** Schedulers ou estão comprovadamente rodando, ou comprovadamente migrados para alternativa.

**Story 2.4 — Remover edge functions órfãs ou adicionar ao deploy** (@devops, 15 min)
- [ ] `auto-followup` e `weekly-report` — decidir: são usados? Adicionar ao workflow de deploy ou deletar
- [ ] `n8n-webhook-forwarder` — referenciado por `TesteRealAgenteIA.tsx` mas não existe: criar função ou remover componente
- **AC:** Zero edge functions órfãs. Zero referências a funções inexistentes.

---

## Sprint 3 — Testes Reais (3-5 dias)

### EPIC-FIX-04: Substituir testes fraudulentos por testes reais

Este é o maior trabalho. Os números de testes atuais são basicamente inúteis para os caminhos que importam.

**Story 3.1 — Reescrever testes de Stripe webhook** (@qa + @dev, 1 dia)
- [ ] Extrair `mapPriceToPlanId` e `mapStripeStatus` do edge function `supabase/functions/stripe-webhook/` para módulo exportado
- [ ] Importar esse módulo real no teste (não redeclarar)
- [ ] Adicionar testes que montam um payload Stripe completo e passam pelo handler real
- [ ] Cobrir: checkout.session.completed, invoice.paid, subscription.updated, subscription.deleted, charge.refunded
- [ ] Cobrir assinatura HMAC (válida, inválida, expirada)
- **AC:** Se uma mudança na lógica do edge function não atualizar os testes, eles quebram.

**Story 3.2 — Reescrever testes de WhatsApp webhook** (@qa + @dev, 1 dia)
- [ ] Mesma abordagem: extrair normalizers, importar no teste
- [ ] Cobrir: mensagem inbound, outbound, status update, tenant resolution, IA trigger, handoff regex
- **AC:** Mudanças no normalizer quebram os testes.

**Story 3.3 — Reescrever teste de RBAC** (@qa + @dev, 4h)
- [ ] Integration test que faz query real no Supabase (staging) com diferentes roles
- [ ] Cobrir: admin cross-tenant blocked, lawyer own-dept only, client read-only etc
- **AC:** Teste falha se uma policy RLS for removida.

**Story 3.4 — Testes para as 50+ edge functions** (@qa, 2 dias)
- [ ] Criar framework de teste para edge functions (Deno test ou Vitest chamando HTTP local)
- [ ] Cobrir top 10 mais críticas: stripe-webhook, whatsapp-webhook, google-calendar/oauth, kapso-manager, ai-orchestrator, check-prazos, send-email, assign-lead, create-checkout-session, process-payment
- [ ] Gate mínimo: cada edge function tem pelo menos 1 teste de happy path e 1 de error path
- **AC:** Coverage de edge functions >0%. Plan para chegar a 50% nas próximas sprints.

**Story 3.5 — Substituir o Proxy chainable por mock Supabase real** (@qa + @dev, 1 dia)
- [ ] Remover o Proxy de `src/tests/__helpers__/hookTestSetup.ts`
- [ ] Usar `@supabase/supabase-js` real apontado para Supabase local (`supabase start`) ou MSW interceptando HTTP
- [ ] Reescrever os ~40 hook tests afetados incrementalmente (os mais críticos primeiro: `useLeads`, `useAuth`, `useConversations`, `useAgendamentos`)
- **AC:** Mudar retorno do banco quebra os testes relevantes.

**Story 3.6 — Reativar security.test.ts** (@qa, 1h)
- [ ] Investigar por que está excluído do vitest config
- [ ] Consertar ou reescrever
- [ ] Remover da exclusão
- **AC:** `npm run test` inclui security.test.ts e passa.

**Story 3.7 — Instalar Playwright browsers e rodar e2e em CI** (@devops + @qa, 4h)
- [ ] `npx playwright install` em ambiente local (documentar em README)
- [ ] Adicionar passo de install no workflow de CI
- [ ] Consertar os `if (visible) then expect` silent-pass patterns
- [ ] Remover `waitForTimeout` arbitrários, usar `waitForSelector`/`waitForResponse`
- **AC:** E2E suite roda em CI em cada PR e falha de verdade quando algo quebra.

---

# PARTE 2 — Plano de Otimização (Pós go-live)

Estas são melhorias que podem esperar até depois do emergency fix, mas que um senior dev esperaria ver antes de chamar o produto de "maduro".

## Otimização 1 — Performance quick wins (1 dia total)

**Story O1.1 — Memoizar AuthContext value** (@dev, 15 min) ⭐ QUICK WIN
- [ ] `contexts/AuthContext.tsx:228` — envolver value em `useMemo`, funções em `useCallback`
- **Impacto:** 59 componentes param de re-renderizar em cada tick de auth. Impact/effort = alto.

**Story O1.2 — Consertar Google Fonts render-blocking** (@dev, 5 min) ⭐ QUICK WIN
- [ ] `index.html:79` — usar padrão `media="print" onload="this.media='all'"`
- **Impacto:** FCP melhora mensuravelmente.

**Story O1.3 — Defer Sentry init** (@dev, 30 min) ⭐ QUICK WIN
- [ ] `App.tsx:18,27` — mover `initSentry()` para dynamic import após first paint
- **Impacto:** 456 KB saem do critical path.

**Story O1.4 — Eliminar select('*') restantes** (@dev, 1h)
- [ ] `ApiKeysManager.tsx:49` e 3 outros locais
- [ ] Adicionar regra ESLint custom para bloquear `select('*')` (prevenir regressão)
- **AC:** MEMORY.md passa a ser verdadeiro nesse ponto.

**Story O1.5 — Code-split recharts** (@dev, 2h)
- [ ] Bundle monolítico de 460 KB — migrar para import dinâmico em cada dashboard
- **Impacto:** Rota de dashboards fica 460 KB mais leve.

**Story O1.6 — Ajustar refetch intervals** (@dev, 1h)
- [ ] `useMultiAgentSystem` tem `refetchInterval: 30s` — verificar se é necessário
- [ ] `TimelineConversas` tem `setInterval` raw — trocar por websocket/realtime
- **Impacto:** Carga backend reduzida, custo Supabase reduzido.

## Otimização 2 — Arquitetura e limpeza (2-3 dias)

**Story O2.1 — Resolver 4 circular imports** (@architect + @dev, 4h)
- [ ] `useLeads ↔ useLeadsQuery ↔ useLeadsCRUD` (2 ciclos)
- [ ] `useAgendaAutomation ↔ useAgendaTasks`
- [ ] `MultiAgentSystem → AnalystAgent → BaseAgent` (layering inversion)
- **Fix:** extrair tipos compartilhados para arquivo neutro, ou inverter dependência.

**Story O2.2 — Decompor `SistemaSection.tsx`** (@architect + @dev, 2h)
- [ ] God-component que puxa 7 componentes de 3 features diferentes
- [ ] Criar barrel exports nas 3 features, usar composição
- **AC:** SistemaSection importa apenas de `@/features/*/index.ts`.

**Story O2.3 — Eliminar ~54 módulos órfãos** (@dev, 3h)
- [ ] Lista completa em `01-architecture/ARCHITECTURE.md`
- [ ] Deletar: `pages/Index.tsx`, `features/crm/ContatosTable.tsx`, `features/crm/FollowUpSequenceEditor.tsx`, hooks órfãos (`useAgendaMetrics`, `useAgendaReminders`, `useAgentPipeline`, `useApiKeys`, `useCRMTags`, `useFeatureFlag`, `useLeadsQuery`, `useSystemHealth`), feature `widget`, `sonner.tsx` wrapper
- **Impacto:** ~3-5 kLOC de código morto saem do bundle.

**Story O2.4 — Decompor os 14 componentes >400 linhas que escaparam** (@architect + @dev, 2 dias)
- [ ] Worst offenders: `useWhatsAppConversations.ts` (553), `useEntityCRUD.ts` (468), `ProcessosManager.tsx` (454), `useGoogleCalendar.ts` (441), `MissionControl.tsx` (426), `RuleEditor.tsx` (416)
- [ ] Aplicar a mesma metodologia dos 7 já feitos (sub-componentes em subdiretórios)
- **AC:** Zero arquivos de produção >400 LOC. MEMORY.md passa a ser verdadeiro.

**Story O2.5 — Decompor `whatsapp-webhook/index.ts` (2101 linhas)** (@dev, 1 dia)
- [ ] Extrair: normalizers, tenant resolution, IA trigger, handoff regex, message formatting, status sync
- [ ] Cada módulo com teste unitário próprio
- **AC:** Arquivo principal <300 linhas, lógica em módulos testáveis.

## Otimização 3 — Qualidade de código (1-2 dias)

**Story O3.1 — Substituir 46 `as unknown as` por Zod parsers** (@dev, 1 dia)
- [ ] Concentrados em hooks que tocam o boundary Supabase/domain
- [ ] Criar Zod schemas em `src/schemas/` para cada tipo de domain
- [ ] Parsear na fronteira, tipo flui corretamente
- **Impacto:** type safety real na fronteira Supabase, não assumida.

**Story O3.2 — Reduzir `: any` em produção** (@dev, 4h)
- [ ] 38 casos, a maioria em `useEntityCRUD.ts` `dynamicSupabase`
- [ ] Alguns são legítimos (escape valve documentado), outros não
- [ ] Fazer passagem: substituir onde é fácil, adicionar `// eslint-disable-next-line` + justificativa onde é necessário
- **AC:** Cada `: any` restante tem justificativa escrita.

## Otimização 4 — UX polish (2 dias)

**Story O4.1 — Migrar 18 forms para shadcn FormMessage** (@ux-design-expert + @dev, 1 dia)
- [ ] Lista em `03-ux/UX.md`: `NovaTarefaForm`, `NovoContratoForm`, `NovoAgendamentoForm`, `NovoProcessoForm`, `NovoPrazoForm`, `NovoAgenteForm`, `NovoHonorarioForm`, `DepartamentoForm`, `TagForm`, `Auth`, e `settings/configuracoes/*Section.tsx`
- [ ] Ganho: `aria-invalid` e `aria-describedby` automáticos, acessibilidade WCAG
- **AC:** 24/24 forms usando FormMessage.

**Story O4.2 — Adicionar aria-label em buttons icon-only** (@dev, 2h)
- [ ] `ConexoesManager.tsx:237`, `DepartamentosManager.tsx:152`, `UsuariosManager.tsx:302`, `CustomIntegrations.tsx:91,94,97`
- [ ] Padrão: `<Button><MoreHorizontal /><span className="sr-only">Ações</span></Button>`
- **AC:** Zero `MoreHorizontal` sem texto acessível.

**Story O4.3 — Wrapper overflow-x-auto em tabelas** (@dev, 2h)
- [ ] `TarefasPage.tsx:162`, `ContatosTable.tsx:185`, `PermissionsMatrix`, `UsersList`, `NotificacoesSection`
- **AC:** Todas tabelas responsivas em viewport 360px.

## Otimização 5 — DevOps / SRE maturity (2-3 dias)

**Story O5.1 — Alertas e paging** (@devops, 1 dia)
- [ ] Webhook Discord/Slack configurado no Sentry
- [ ] Regras de alerta: erro crítico em produção, taxa de erro >1%, edge function falhando
- [ ] Runbook básico: quem responde, como acessar logs, como fazer rollback
- **AC:** Erro fake em staging dispara notificação em <1min.

**Story O5.2 — Backup database real e restaurável** (@devops, 4h)
- [ ] Verificar `scripts/backup-database.cjs` — funciona?
- [ ] Configurar backup diário automático (Supabase já tem, mas documentar onde e como restaurar)
- [ ] Testar restore em ambiente separado (a primeira vez que você testa restore NÃO deve ser em emergência real)
- **AC:** Backup comprovadamente restaurável.

**Story O5.3 — Runbook de deploy e rollback** (@devops + @pm, 4h)
- [ ] `docs/runbook/deploy.md`: passos exatos para deploy manual
- [ ] `docs/runbook/rollback.md`: como reverter deploy, como reverter migration
- [ ] `docs/runbook/incident.md`: fluxo de resposta a incidente
- **AC:** Um dev novo consegue seguir e fazer rollback sem precisar perguntar.

**Story O5.4 — Preview environments por PR** (@devops, 4h)
- [ ] Configurar Vercel para comentar URL de preview em cada PR
- [ ] Garantir que preview aponta para Supabase de staging (não prod)
- **AC:** Cada PR tem URL testável automaticamente.

**Story O5.5 — Pre-commit scanning reforçado** (@devops, 2h)
- [ ] Adicionar check para: `eyJ` (JWTs), `sk_live_`, `sk_test_` (Stripe), `SUPABASE_SERVICE_ROLE_KEY=` value (Supabase), chaves Postmark, chaves OpenAI
- [ ] Rodar em pre-commit hook e em CI
- **AC:** Teste artificial de commit com secret é bloqueado.

## Otimização 6 — Integrações pendentes (varia por integração)

**Story O6.1 — Stripe checkout com price IDs reais** (@devops + @pm, 2h)
- [ ] Criar produtos no Stripe (Pro, Enterprise)
- [ ] Pegar price IDs
- [ ] Configurar `VITE_STRIPE_PRICE_PRO` e `VITE_STRIPE_PRICE_ENTERPRISE` no Vercel
- [ ] Testar checkout end-to-end em staging
- **AC:** Assinatura nova cria customer no Stripe e entitlement no Jurify.

**Story O6.2 — Google Calendar config** (@devops, 1h — depende de 1.2 e 1.3)
- [ ] Criar projeto no Google Cloud Console
- [ ] Configurar OAuth consent screen
- [ ] `VITE_GOOGLE_CLIENT_ID` no Vercel, `GOOGLE_CLIENT_SECRET` no Supabase
- [ ] Testar fluxo completo
- **AC:** Um usuário consegue conectar Google Calendar e criar eventos a partir de agendamentos.

**Story O6.3 — ZapSign setup** (@devops + @dev, 2h)
- [ ] Conta ZapSign criada (ou confirmar que já existe)
- [ ] `ZAPSIGN_API_KEY` configurada
- [ ] Testar assinatura de contrato end-to-end
- **AC:** Contrato enviado para assinatura, retorna status correto no webhook.

---

# Ordem de execução recomendada

```
Sprint 0 (1 dia)        → EPIC-FIX-01 (desbloquear build + rotação + staging + Sentry)
   ↓
Sprint 1 (2-3 dias)     → EPIC-FIX-02 (segurança crítica)
   ↓                       ↓
Sprint 2 (1 dia)        → EPIC-FIX-03 (banco)   ║ Pode ir paralelo com Sprint 1 se tiver 2 devs
   ↓
Sprint 3 (3-5 dias)     → EPIC-FIX-04 (testes reais)
   ↓
=== GO-LIVE POSSÍVEL AQUI ===
   ↓
Otimizações 1 (1 dia)   → Quick wins de performance
Otimizações 2-5 (6 dias)→ Arquitetura, qualidade, UX, DevOps maturity (paralelizáveis)
Otimizações 6 (varia)   → Integrações pendentes (conforme demanda de cliente)
```

**Estimativa total:**
- Correções obrigatórias: **7-10 dias** com 1-2 devs focados
- Otimizações pós go-live: **~10 dias** adicionais

---

# Como executar com AIOX

Cada story acima é candidata a virar uma story formal em `docs/stories/` e ser executada via:

```
@pm *create-epic (EPIC-FIX-01, EPIC-FIX-02, etc.)
@sm *draft {story-id}
@po *validate-story-draft
@dev *develop-story
@qa *qa-gate
@devops *push
```

Para máxima paralelização: EPIC-FIX-02 e EPIC-FIX-03 podem rodar em branches separadas com dois devs. EPIC-FIX-04 depende dos anteriores apenas para não trabalhar em cima de código instável.

---

# Invariantes após correção

Quando as correções estiverem prontas, o projeto deve satisfazer:

- [ ] `npm run lint` → exit 0, zero warnings
- [ ] `npm run type-check` → exit 0
- [ ] `npm run test` → exit 0, inclui security.test.ts
- [ ] `npm run build` → exit 0, sem warnings
- [ ] `npm audit --audit-level=high` → exit 0
- [ ] Zero tokens/secrets em `git log -S 'eyJ' --all`
- [ ] Staging e prod apontam para Supabase projects diferentes
- [ ] Sentry captura erro fake em staging em <30s
- [ ] Cross-tenant read em `google_calendar_tokens` bloqueado
- [ ] Fluxo Google OAuth completo funciona em staging
- [ ] Fluxo Stripe checkout completo funciona em staging
- [ ] Fluxo WhatsApp webhook funciona com per-tenant HMAC (global fallback removido)
- [ ] Testes críticos (Stripe, WhatsApp, RBAC, edge functions top 10) importam código real, não redeclaram
- [ ] MEMORY.md atualizado com o estado real do projeto

Só então o Jurify pode ser honestamente chamado de "pronto para produção".
