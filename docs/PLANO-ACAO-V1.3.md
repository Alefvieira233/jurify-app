# Jurify v1.3 — Plano de Acao Pos-Auditoria

> Gerado em 2026-04-05 pela auditoria AIOX (4 agentes paralelos)
> Score atual: 8.5/10 | Target: 9.5/10

---

## Sprint 1 — Seguranca Imediata (1-2 dias)

### 1.1 Rotacionar Supabase Access Token
- **Severidade:** HIGH
- **Esforco:** 2 min
- **Responsavel:** @devops (Gage)
- **Acao:** Gerar novo token em https://supabase.com/dashboard/account/tokens e atualizar no GitHub Actions (`SUPABASE_ACCESS_TOKEN`)
- **Motivo:** Token exposto em conversa de desenvolvimento

### 1.2 Mascarar api_keys.key_value no frontend
- **Severidade:** MEDIUM
- **Esforco:** 1h
- **Responsavel:** @dev (Dex)
- **Acao:** Em `src/hooks/useApiKeys.ts` linha 35, trocar `.select('*')` por `.select('id, nome, tenant_id, ativo, created_at, updated_at')` — nunca retornar `key_value` apos criacao
- **Motivo:** key_value (plaintext) exposto em re-loads

### 1.3 Mascarar configuracoes_integracoes.api_key
- **Severidade:** MEDIUM
- **Esforco:** 1h
- **Responsavel:** @dev (Dex)
- **Acao:** Em `src/hooks/useIntegracoesConfig.ts` linha 46, excluir `api_key` do select. Criar endpoint separado para validacao de chave (sem retornar o valor)
- **Motivo:** Chaves de integracao expostas no frontend state

### 1.4 Configurar SMTP customizado
- **Severidade:** MEDIUM
- **Esforco:** 2h
- **Responsavel:** @devops (Gage)
- **Acao:** Configurar Postmark/Resend como SMTP no Supabase Auth. Isso desbloqueia: rate_limit_email_sent customizavel, templates PT-BR, dominio @jurify.com.br no remetente
- **Entregavel:** Emails de confirmacao, recovery e invite em portugues com branding Jurify

---

## Sprint 2 — Limpeza de Dead Code (1 dia)

### 2.1 Deletar WhatsAppKapsoSetup.tsx (dead code)
- **Severidade:** LOW
- **Esforco:** 15 min
- **Responsavel:** @dev (Dex)
- **Arquivos:**
  - DELETE `src/features/whatsapp/WhatsAppKapsoSetup.tsx` (659 linhas)
  - DELETE `src/features/whatsapp/__tests__/WhatsAppKapsoSetup.test.tsx`
  - REVIEW `src/features/whatsapp/WhatsAppSetup.tsx` — remover lazy import do componente deletado
- **Motivo:** Componente da era Evolution API, nunca roteado em App.tsx, usa acoes que nao existem no kapso-manager

### 2.2 DROP api_keys.key_value column
- **Severidade:** MEDIUM
- **Esforco:** 30 min
- **Responsavel:** @data-engineer (Dara)
- **Acao:** Migration para `ALTER TABLE api_keys DROP COLUMN key_value`. Chaves ja sao validadas via hash (migration 20260403000002)
- **Pre-requisito:** Sprint 1.2 completo (frontend nao usa mais key_value)

### 2.3 Remover comentario orfao em data-retention-cleanup
- **Severidade:** LOW
- **Esforco:** 5 min
- **Responsavel:** @dev (Dex)
- **Acao:** Remover linha 125 de `supabase/functions/data-retention-cleanup/index.ts` (comentario sobre logs_execucao_agentes removida)
- **Re-deploy:** `supabase functions deploy data-retention-cleanup`

### 2.4 Reduzir supabaseUntyped usage
- **Severidade:** LOW
- **Esforco:** 2h
- **Responsavel:** @dev (Dex)
- **Acao:** Regenerar types.ts e substituir `supabaseUntyped` por `supabase` tipado nos 79 arquivos que usam. Priorizar hooks (useLeads, useContratos, useProcessos, etc.)
- **Pre-requisito:** types.ts regenerado (ja feito)

---

## Sprint 3 — Code Splitting (3-5 dias)

### Prioridade Alta (impacto em testabilidade e manutencao)

### 3.1 Split useLeads.ts (551 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 3h
- **Acao:**
  - Extrair `useLeadsCRUD` (create, update, delete mutations)
  - Extrair `useLeadsFilters` (visibility scope, pagination)
  - Manter `useLeads` como facade que compoe os dois
- **Beneficio:** Testabilidade unitaria, reuso em outros modulos

### 3.2 Split LeadForm.tsx (647 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:**
  - Extrair `BasicInfoSection` (nome, email, telefone, CPF)
  - Extrair `JuridicalInfoSection` (area_juridica, valor_causa)
  - Extrair `CRMInfoSection` (pipeline, temperatura, prioridade)
  - Manter `LeadForm` como compositor
- **Beneficio:** Reuso de secoes em outros forms (contratos, processos)

### 3.3 Split IntegracoesConfig.tsx (676 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:**
  - Extrair `GoogleCalendarConfig` (sub-componente)
  - Extrair `WhatsAppConfig` (sub-componente)
  - Extrair `ZapSignConfig` (sub-componente)
  - Extrair `APIKeysConfig` (sub-componente)
- **Beneficio:** Cada integracao isolada, mais facil de manter

### 3.4 Split Auth.tsx (516 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:**
  - Extrair `LoginForm` componente
  - Extrair `RegisterForm` componente
  - Extrair `EmailConfirmationPending` componente
  - Manter `Auth.tsx` como router de estado
- **Beneficio:** Cada fluxo de auth testavel isoladamente

### Prioridade Media

### 3.5 Split ProcessosManager.tsx (588 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Separar list, detail, e create em componentes

### 3.6 Split FlowEditor.tsx (618 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 3h
- **Acao:** Separar editor canvas de node handlers

### 3.7 Split useAgendaAutomation.ts (562 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Separar em hooks focados por responsabilidade

### 3.8 Split ContratosManager.tsx (519 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Separar list/detail/create

### 3.9 Split AgentsPlayground.tsx (540 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Extrair para feature folder com sub-componentes

### 3.10 Split UploadContratos.tsx (537 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Separar upload, preview, processing

### 3.11 Split CRMDashboard.tsx (542 linhas)
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Extrair widgets como componentes independentes

---

## Sprint 4 — Performance e Observabilidade (2-3 dias)

### 4.1 whatsapp-webhook refactoring
- **Responsavel:** @dev (Dex)
- **Esforco:** 3h
- **Acao:** Splittar em `_shared/webhook-kapso.ts` e `_shared/webhook-meta.ts` se passar 500 linhas
- **Motivo:** Edge function mais complexa do projeto (450 linhas)

### 4.2 Consolidar health vs health-check
- **Responsavel:** @dev (Dex)
- **Esforco:** 1h
- **Acao:** Deprecar `/health` simples, manter `/health-check` como canônico
- **Motivo:** 2 endpoints fazendo a mesma coisa

### 4.3 Rate limit config centralizado
- **Responsavel:** @dev (Dex)
- **Esforco:** 2h
- **Acao:** Criar `_shared/rate-limit-config.ts` com todos os limites (atualmente espalhados em 25 funcoes)
- **Beneficio:** Ajustar limites em 1 lugar

### 4.4 Telemetria de Edge Functions
- **Responsavel:** @dev (Dex) + @devops (Gage)
- **Esforco:** 4h
- **Acao:**
  - Adicionar execution time tracking por funcao
  - Token usage por tenant/modelo
  - Error rates por funcao
  - Dashboard no Sentry ou Grafana
- **Beneficio:** Visibilidade de performance em producao

### 4.5 Bundle size optimization
- **Responsavel:** @dev (Dex)
- **Esforco:** 4h
- **Acao:**
  - Sentry: 466KB → avaliar tree-shaking ou lazy load
  - Charts: 470KB → avaliar recharts lite ou lazy load por rota
- **Target:** Reduzir initial load em 30%

---

## Sprint 5 — Tech Debt Backlog (2-3 dias)

### 5.1 Query key factory pattern
- **Responsavel:** @dev (Dex)
- **Esforco:** 4h
- **Acao:** Migrar todos os hooks para usar `queryKeys.ts` factory (ja parcialmente implementado)
- **Motivo:** Invalidacao de cache consistente

### 5.2 npm audit vulnerabilities
- **Responsavel:** @devops (Gage)
- **Esforco:** 2h
- **Acao:** Resolver 12 vulnerabilidades transitivas via @capacitor/*
- **Opcoes:** Upgrade capacitor, override resolutions, ou remover se nao usado

### 5.3 Direct Supabase calls em componentes
- **Responsavel:** @dev (Dex)
- **Esforco:** 3h
- **Acao:** Extrair `.from()` calls restantes em componentes para hooks dedicados (3 arquivos identificados: AIAssistantChat, PerfilSection, ForgotPasswordDialog)

### 5.4 Desabilitar autoconfirm quando SMTP configurado
- **Responsavel:** @devops (Gage)
- **Esforco:** 30 min
- **Pre-requisito:** Sprint 1.4 (SMTP configurado)
- **Acao:** `PATCH /config/auth` com `mailer_autoconfirm: false`
- **Motivo:** Autoconfirm e temporario — com SMTP, emails de confirmacao devem funcionar

---

## Resumo Executivo

| Sprint | Itens | Esforco Total | Impacto |
|--------|-------|--------------|---------|
| **1 — Seguranca** | 4 itens | ~5h | Token rotation + mascarar secrets |
| **2 — Dead Code** | 4 itens | ~4h | 700+ linhas removidas, key_value dropada |
| **3 — Code Splitting** | 11 itens | ~24h | 19 arquivos > 500 linhas → modulos focados |
| **4 — Performance** | 5 itens | ~14h | Observabilidade + bundle -30% |
| **5 — Tech Debt** | 4 itens | ~10h | Query patterns + vulnerabilidades |
| **TOTAL** | **28 itens** | **~57h** | Score: 8.5 → 9.5/10 |

## Criterios de Sucesso

- [ ] 0 secrets expostos no frontend
- [ ] 0 arquivos > 500 linhas (exceto types.ts e testes)
- [ ] 0 supabaseUntyped em hooks principais
- [ ] 0 npm audit HIGH/CRITICAL
- [ ] 100% Edge Functions com telemetria
- [ ] SMTP configurado com emails em PT-BR
- [ ] Bundle initial load < 800KB (gzip)
- [ ] 1300+ testes passando
