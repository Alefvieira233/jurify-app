# Technical Debt Assessment -- DRAFT

## Para Revisao dos Especialistas

**Projeto:** Jurify Legal SaaS
**Data:** 2026-04-03
**Versao:** DRAFT v1.0
**Autor:** @architect (Aria) -- Brownfield Discovery Phase 4
**Fontes:** system-architecture.md (13 debitos), DB-AUDIT.md (17 debitos), frontend-spec.md (13 debitos)

---

## Executive Summary

| Metrica | Valor |
|---------|-------|
| **Total de debitos** | **43** |
| Criticos (P0) | 3 |
| Altos (P1) | 9 |
| Medios (P2) | 17 |
| Baixos (P3-P4) | 14 |
| **Esforco total estimado** | **~298 horas** |

O Jurify possui uma base madura (audit score 99/100) com arquitetura solida, mas acumula debitos tecnicos em tres eixos principais:

1. **Seguranca (P0/P1):** Credenciais em texto plano (API keys, OAuth tokens), tenant_id nullable em 10 tabelas criticas, e key rotation pendente. Estes representam risco de vazamento de dados entre tenants e exposicao em caso de breach.

2. **Consistencia de dados (P1/P2):** Sistemas duplicados (tags, scores, colunas de conteudo), tabela `leads` com 47 colunas, e ausencia de constraints CHECK em status columns. Geram inconsistencias sutis e dificultam manutencao.

3. **Frontend UX (P1/P2):** i18n 97% incompleto, STATUS_COLORS duplicado em 8 arquivos, acessibilidade limitada (64 ARIA em 512 arquivos), e tabelas nao-responsivas em mobile. Afetam escalabilidade do produto e conformidade a11y.

**Risco cross-cutting principal:** Debitos de seguranca no banco (P0) bloqueiam features que dependem de isolamento multi-tenant confiavel. Debitos de normalizacao (P2) aumentam custo de cada nova feature por duplicacao de logica.

---

## 1. Debitos Criticos (P0) -- Resolver Imediatamente

### DEB-001: Nullable tenant_id em 10 Tabelas Criticas

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-001 |
| Area | Database / Security |
| Severidade | CRITICAL |
| Impacto | Rows com NULL tenant_id criam dados orfaos invisiveis a todos os tenants. INSERT sem tenant_id produz registros que escapam do RLS. Tabelas afetadas: `whatsapp_messages`, `whatsapp_sessions`, `lead_interactions`, `conversation_logs`, `configuracoes_integracoes`, `knowledge_base`, `logs_execucao_agentes`, `hitl_requests`, `pagamentos`, `audit_log`. |
| Esforco | 4 horas |
| Dependencias | Nenhuma -- pode ser resolvido imediatamente |
| Bloqueado por | -- |
| Bloqueia | DEB-002 (api_keys tenant scoping depende de padrao NOT NULL), DEB-014 (partitioning precisa de tenant_id confiavel) |
| Specialist Review | Confirmado por @data-engineer (DB-AUDIT Phase 2) |

### DEB-002: API Keys Armazenadas em Texto Plano + Sem Tenant Scoping

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-012 |
| Area | Database / Security |
| Severidade | CRITICAL |
| Impacto | `key_value` armazena API keys como texto plano. `validar_api_key()` faz comparacao direta de strings. Tabela `api_keys` nao tem `tenant_id` -- globalmente acessivel com service_role key. Se o banco for comprometido, todas as API keys sao expostas. |
| Esforco | 4 horas |
| Dependencias | DEB-001 (padrao NOT NULL tenant_id deve estar estabelecido) |
| Bloqueado por | DEB-001 |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer (DB-AUDIT Phase 2) |

### DEB-003: OpenAI API Key Rotation Pendente

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-008 |
| Area | Security |
| Severidade | CRITICAL |
| Impacto | Key precisa rotacao. Se comprometida, atacantes podem consumir budget de AI e acessar dados legais sensiveis via assistente. Unico ponto pendente do audit score 99/100. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado (MEMORY.md documenta pendencia) |

---

## 2. Debitos Altos (P1) -- Proximo Sprint

### DEB-004: OAuth Tokens do Google Calendar em Texto Plano

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-013 |
| Area | Database / Security |
| Severidade | HIGH |
| Impacto | `access_token` e `refresh_token` armazenados sem criptografia em `google_calendar_tokens`. RLS restringe acesso por user_id, mas breach expoe todos os tokens OAuth, permitindo acesso a calendarios Google de todos os usuarios vinculados. |
| Esforco | 4 horas |
| Dependencias | Edge Functions `encrypt-data`/`decrypt-data` ja existem |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-005: Indexes Ausentes em whatsapp_messages

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-011 |
| Area | Database / Performance |
| Severidade | HIGH |
| Impacto | Tabela de alto volume sem indexes compostos para o padrao de query mais comum: `conversation_id + created_at DESC` (chat UI e webhook handler). Tambem falta `(tenant_id, lead_id)` para queries por lead. Degradacao de performance proporcional ao volume de mensagens. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | DEB-014 (partitioning precisa de indexes definidos antes) |
| Specialist Review | Confirmado por @data-engineer |

### DEB-006: STATUS_COLORS Duplicado em 8 Arquivos

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-001 |
| Area | Frontend / Design System |
| Severidade | HIGH |
| Impacto | Definicoes de cores de status inconsistentes entre ContatosTable, ProcessosManager, HonorariosManager, SuportePage, CRM LeadDetailPanel, TicketDetailDialog, ProcessoDetalhes e constants.ts. Badges de status mudam de cor entre features. |
| Esforco | 4 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | DEB-031 (hardcoded colors) |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-007: i18n Migration Incompleta (~97% Hardcoded)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-002 |
| Area | Frontend / i18n |
| Severidade | HIGH |
| Impacto | Apenas 4 de ~130 arquivos de componentes usam `useTranslation()`. ~70+ ocorrencias de strings em portugues hardcoded em todos os 30 modulos de features, 7 schemas Zod, sidebar labels, page titles. Bloqueia expansao multi-idioma. |
| Esforco | 40 horas |
| Dependencias | Nenhuma -- framework i18next ja esta configurado |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |
| Nota | Relacionado a DEB-SYS-010. Prioridade depende de planos de expansao internacional. |

### DEB-008: Keyboard Navigation Limitada

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-004 |
| Area | Accessibility |
| Severidade | HIGH |
| Impacto | Apenas 8 ocorrencias de `tabIndex`/`onKeyDown` em 512 arquivos. Power users nao conseguem navegar tabelas, kanban, ou chat por teclado. Gap de conformidade a11y. 64 ARIA attributes em 37 arquivos e insuficiente para a escala do app. |
| Esforco | 16 horas |
| Dependencias | DEB-009 (skip-to-content deve ser implementado junto) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-009: Skip-to-Content e Focus Management Ausentes

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-005 |
| Area | Accessibility |
| Severidade | HIGH |
| Impacto | Usuarios de screen reader precisam navegar por toda a sidebar a cada pagina. Sem reset de foco na navegacao entre rotas. Violacao basica de acessibilidade web (WCAG 2.1 Level A). |
| Esforco | 4 horas |
| Dependencias | Implementar junto com DEB-008 |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-010: CHECK Constraints Ausentes em Status Columns

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-005 |
| Area | Database / Constraints |
| Severidade | HIGH |
| Impacto | Todas as colunas de status sao `text` sem CHECK constraints em 10 tabelas core (`leads`, `contratos`, `processos`, `agendamentos`, etc.). Permite valores invalidos a nivel de banco. Ja causou problemas (migration `20260323` unificou status de leads). |
| Esforco | 4 horas |
| Dependencias | DEB-006 (STATUS_COLORS no frontend deve estar alinhado com valores validos do banco) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-011: Sentry/Monitoring Nao Configurado no Vercel

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-009 |
| Area | Observability |
| Severidade | HIGH |
| Impacto | `VITE_SENTRY_DSN` e `SENTRY_AUTH_TOKEN` nao configurados no Vercel. Erros em producao podem nao ser capturados. Source maps nao sao enviados ao Sentry nos builds de producao. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-012: Edge Functions Ausentes no Deploy List

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-011 |
| Area | CI/CD |
| Severidade | HIGH |
| Impacto | `deploy-production.yml` deploia lista fixa de funcoes. Functions como `send-push-notification`, `process-prazos-alerts`, `process-followup-queue`, `extract-document-text`, `ingest-document-from-file`, `media-processor` existem no repo mas nao no deploy list. Podem nao estar em producao. |
| Esforco | 2 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

---

## 3. Debitos Medios (P2) -- Backlog Priorizado

### DEB-013: Sistemas de Tags Duplicados

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-002 |
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Impacto | Tres representacoes de tags: `tags`/`lead_tags` (PT, com categoria/ordem), `crm_tags`/`crm_lead_tags` (EN, simples), e `leads.tags` (text array). Risco de inconsistencia de dados. |
| Esforco | 6 horas |
| Dependencias | Decisao arquitetural sobre qual sistema sobrevive |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer. Pergunta pendente: qual sistema unificar? |

### DEB-014: Colunas Duplicadas em whatsapp_messages (content vs message_text)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-004 |
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Impacto | Vestigio da migracao Evolution API -> Kapso (2026-03-25). Codigo pode escrever em uma coluna e ler da outra, causando perda de dados ou inconsistencia. |
| Esforco | 3 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-015: Soft-Delete Inconsistente

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-008 |
| Area | Database / Data Integrity |
| Severidade | MEDIUM |
| Impacto | Apenas `leads` tem soft-delete completo (`ativo` + `arquivado_em` + `motivo_arquivamento`). Outras tabelas core (`contratos`, `processos`, `agentes_ia`) tem apenas `ativo` boolean. Muitas tabelas deletam permanentemente, arriscando gaps no audit trail e conformidade LGPD. |
| Esforco | 8 horas |
| Dependencias | Decisao arquitetural sobre padrao (`deleted_at` vs `ativo` boolean) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Pergunta pendente para @data-engineer: adotar `deleted_at` timestamptz ou manter `ativo` boolean? |

### DEB-016: Tabela leads Excessivamente Larga (47 Colunas)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-010 |
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Impacto | 47 colunas cobrindo CRM, pipeline, follow-up, archival e scoring. Cada SELECT traz todas as colunas. Combinado com `custom_fields` e `metadata` JSONB, rows podem ser muito grandes. |
| Esforco | 12 horas |
| Dependencias | DEB-001 (tenant_id NOT NULL), DEB-019 (scores duplicados devem ser resolvidos antes da extracao) |
| Bloqueado por | DEB-001 |
| Bloqueia | -- |
| Specialist Review | Pergunta pendente para @data-engineer: view `v_leads_operacional` ja mitiga impacto em reads? |

### DEB-017: N+1 Query no assistant Edge Function

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-015 |
| Area | Database / Performance |
| Severidade | MEDIUM |
| Impacto | 4+ queries sequenciais para dados de dashboard no `assistant/index.ts` (linhas 511-526). Deveria usar `get_dashboard_metrics()` ou novo RPC dedicado. |
| Esforco | 2 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-018: Indexes Ausentes em crm_followups

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-016 |
| Area | Database / Performance |
| Severidade | MEDIUM |
| Impacto | Queries por `(tenant_id, status, scheduled_at)`, `(lead_id, status)`, e `(assigned_to, status)` sem indexes compostos. Afeta fila de follow-ups, paginas de detalhe de leads e dashboards. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-019: Retention Policy Ausente em Tabelas de Log

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-017 |
| Area | Database / Scalability |
| Severidade | MEDIUM |
| Impacto | `data-retention-cleanup` Edge Function existe mas sem enforcement a nivel de banco. Se falhar ou nao for agendada, tabelas de log crescem indefinidamente. `agent_ai_logs` armazena `full_result` e `system_prompt` como texto -- potencialmente rows muito grandes. |
| Esforco | 3 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | DEB-034 (partitioning precisa de retention definida) |
| Specialist Review | Confirmado por @data-engineer |

### DEB-020: Query Key Factory Pattern Ausente

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-001 |
| Area | Server State |
| Severidade | MEDIUM |
| Impacto | Query keys dispersos em 73 hooks como arrays inline. Risco de colisao de keys, cache stale apos mutations, dificuldade de rastrear invalidacao de cache. |
| Esforco | 8 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Documentado em ADR-002 e MEMORY.md como tech debt v1.3 |

### DEB-021: Chamadas Diretas ao Supabase em Componentes

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-003 |
| Area | Architecture |
| Severidade | MEDIUM |
| Impacto | Alguns componentes chamam `supabase.from()` diretamente ao inves de hooks. Bypassa cache do React Query, cria fluxo de dados inconsistente e dificulta testes. |
| Esforco | 12 horas |
| Dependencias | DEB-020 (query key factory facilita migracao) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-022: `supabaseUntyped` Escape Hatch em Uso

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-006 |
| Area | Type Safety |
| Severidade | MEDIUM |
| Impacto | `supabaseUntyped` bypassa o tipo `Database` gerado para tabelas como `agent_memories`, `workflow_queue`, `departamento_membros`. Perde seguranca de tipo em compile-time. |
| Esforco | 4 horas |
| Dependencias | Regenerar Supabase types |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-023: EmptyState Component Subutilizado

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-003 |
| Area | Frontend / UX |
| Severidade | MEDIUM |
| Impacto | Componente `EmptyState` compartilhado usado em apenas 5 de 30 features. 25+ features usam markup inline ad-hoc para estados vazios, gerando aparencia inconsistente. |
| Esforco | 8 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-024: Tabelas Nao Responsivas em Mobile

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-006 |
| Area | Responsiveness |
| Severidade | MEDIUM |
| Impacto | ContatosTable, ProcessosManager, ContratosManager, HonorariosManager, EquipeManager, UsuariosManager -- colunas overflow ou cortam em mobile. Sem view alternativa em card. Critico se app mobile Capacitor for publicado. |
| Esforco | 20 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-025: Draft Persistence Nao Utilizado

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-007 |
| Area | Frontend / UX |
| Severidade | MEDIUM |
| Impacto | `useDraftPersistence` hook existe mas usado apenas em `NovoAgenteForm`. Usuarios perdem dados de formulario em navegacao acidental, troca de aba ou crash. Afeta LeadForm, NovoContratoForm, NovoProcessoForm, NovoPrazoForm, NovoHonorarioForm. |
| Esforco | 8 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-026: React.memo Ausente em Componentes de Lista

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-008 |
| Area | Performance |
| Severidade | MEDIUM |
| Impacto | ContatosTable rows, ProcessosManager cards, ContratosManager cards, NotificationsPanel items re-renderizam em cada mudanca de filtro/busca. Jank visivel em datasets grandes. Apenas 19 arquivos usam React.memo. |
| Esforco | 6 horas |
| Dependencias | DEB-029 (virtual scrolling pode ser aplicado junto) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-027: Hardcoded Color Values vs Design Tokens

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-009 |
| Area | Design System |
| Severidade | MEDIUM |
| Impacto | 12 feature files usando `text-gray-*`/`bg-gray-*`, 20+ usando `text-white` em vez de design tokens. Dark mode pode quebrar nesses componentes. Overrides com `!important` no index.css sao sintoma deste problema. |
| Esforco | 8 horas |
| Dependencias | DEB-006 (STATUS_COLORS deve ser centralizado primeiro) |
| Bloqueado por | DEB-006 |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-028: Virtual Scrolling Ausente em Listas Grandes

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-013 |
| Area | Performance |
| Severidade | MEDIUM |
| Impacto | Apenas MessageView usa `@tanstack/react-virtual`. ContatosTable (todos os leads renderizados), ArquivadosView, NotificationsPanel -- renderizar 500+ items causa degradacao de performance visivel. |
| Esforco | 12 horas |
| Dependencias | DEB-026 (React.memo deve ser aplicado junto) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert. Pergunta pendente: qual o dataset maximo esperado por tenant? |

### DEB-029: Rate Limiting Duplicado (2 Implementacoes)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-012 |
| Area | Code Quality |
| Severidade | MEDIUM |
| Impacto | Duas implementacoes separadas: `_shared/rate-limiter.ts` (Supabase-backed, 374 linhas) e `_shared/security.ts` (in-memory, 48 linhas). Functions podem usar uma ou ambas. |
| Esforco | 4 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

---

## 4. Debitos Baixos (P3-P4) -- Tech Debt Backlog

### DEB-030: Scores Duplicados na Tabela leads

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-003 |
| Area | Database / Normalization |
| Severidade | LOW |
| Impacto | `leads` tem `score` e `lead_score` (ambos integer nullable). Alem disso, `crm_lead_scores` armazena historico. Ambiguidade sobre qual coluna e autoritativa. |
| Esforco | 2 horas |
| Dependencias | DEB-016 (resolver junto com extracao de satellite tables) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-031: Foreign Keys Ausentes em Tabelas Utilitarias

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-006 |
| Area | Database / Referential Integrity |
| Severidade | LOW |
| Impacto | `api_keys`, `allowed_columns`, `assistant_audit`, `assistant_conversations`, `logs_atividades`, `google_calendar_settings`, `google_calendar_sync_logs` sem FK constraints para `tenants` ou `profiles`. Dados orfaos possiveis em delecao de user/tenant. |
| Esforco | 3 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-032: Naming Convention Misto (Portugues/Ingles)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-007 |
| Area | Database / Convention |
| Severidade | LOW |
| Impacto | Tabelas e colunas misturam PT (`agendamentos`, `nome_completo`) com EN (`leads`, `last_login`). Aumenta carga cognitiva e risco de bugs. Nao e recomendavel renomear existentes. |
| Esforco | 1 hora (ADR apenas) |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-033: Colunas responsavel Duplicadas (Text + UUID)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-009 |
| Area | Database / Normalization |
| Severidade | LOW |
| Impacto | `contratos` e `agendamentos` tem `responsavel` (text) e `responsavel_id` (uuid FK). Campo text e legado; dados podem ser inconsistentes entre os dois. |
| Esforco | 2 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer |

### DEB-034: Estrategia de Partitioning Ausente

| Campo | Valor |
|-------|-------|
| ID Original | DEB-DB-014 |
| Area | Database / Scalability |
| Severidade | LOW |
| Impacto | `whatsapp_messages`, `agent_ai_logs`, `audit_log`, `security_audit`, `webhook_logs`, `conversation_logs` crescerao indefinidamente. Em escala (100+ tenants, milhoes de mensagens), performance degradara mesmo com indexes. |
| Esforco | 8 horas |
| Dependencias | DEB-001 (tenant_id NOT NULL), DEB-005 (indexes definidos), DEB-019 (retention policy) |
| Bloqueado por | DEB-001, DEB-019 |
| Bloqueia | -- |
| Specialist Review | Confirmado por @data-engineer. Pergunta pendente: volume atual de rows? |

### DEB-035: Normalize/Fetch Patterns Duplicados em Hooks

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-002 |
| Area | Code Quality |
| Severidade | LOW |
| Impacto | Multiplos hooks contem logica de normalizacao similar (default values, date parsing, status mapping). Inconsistencias sutis e aumento de burden de manutencao. |
| Esforco | 6 horas |
| Dependencias | DEB-020 (query key factory facilita refatoracao) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-036: Sentry Bundle Size (445KB)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-004 |
| Area | Performance |
| Severidade | LOW |
| Impacto | 2o maior chunk. ~445KB (gzipped ~120KB) no download inicial. Maioria dos usuarios nunca dispara error reporting. |
| Esforco | 4 horas |
| Dependencias | DEB-011 (configurar Sentry primeiro, depois otimizar bundle) |
| Bloqueado por | DEB-011 |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-037: Recharts Bundle Size (457KB)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-005 |
| Area | Performance |
| Severidade | LOW |
| Impacto | Maior chunk individual. Usado apenas em dashboard/reports. Ja isolado em manual chunk. |
| Esforco | 3 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-038: i18n Single Locale (Perspective Sistemica)

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-010 |
| Area | Internationalization |
| Severidade | LOW |
| Impacto | Framework i18next instalado mas apenas locale `pt` existe. Duplicado com DEB-007 (perspectiva UX), mas aqui representa o debito a nivel de sistema: nenhum teste de i18n, nenhum CI check para strings nao traduzidas. |
| Esforco | Incluido em DEB-007 (40h) |
| Dependencias | DEB-007 |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-039: Capacitor Transitive Vulnerabilities

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-007 |
| Area | Security |
| Severidade | LOW |
| Impacto | 12 vulnerabilidades transitivas via `@capacitor/*`. Sem fix upstream. CI usa `--audit-level=critical` para evitar false positives. |
| Esforco | 2 horas (monitoramento) |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-040: Diretorio services/ Vazio

| Campo | Valor |
|-------|-------|
| ID Original | DEB-SYS-013 |
| Area | Architecture |
| Severidade | LOW |
| Impacto | `src/services/` contem apenas `__tests__/`. Service layer pattern iniciado mas nunca desenvolvido. Todo acesso a dados via hooks diretos. |
| Esforco | 0 horas (decisao apenas) |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado |

### DEB-041: Reducao de Motion Nao Suportada

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-010 |
| Area | Accessibility |
| Severidade | LOW |
| Impacto | Sem `@media (prefers-reduced-motion: reduce)`. Usuarios com disturbios vestibulares nao podem desabilitar animacoes. |
| Esforco | 2 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-042: Breadcrumbs Nao Interativos

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-011 |
| Area | Navigation |
| Severidade | LOW |
| Impacto | Segmentos de breadcrumb nao sao clicaveis. Usuarios nao podem navegar para niveis superiores da hierarquia. |
| Esforco | 2 horas |
| Dependencias | Nenhuma |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

### DEB-043: Error Handling Inconsistente entre Features

| Campo | Valor |
|-------|-------|
| ID Original | DEB-UX-012 |
| Area | Frontend / UX |
| Severidade | LOW |
| Impacto | Algumas paginas mostram erro inline com retry; outras mostram apenas toast; algumas nao mostram nada. Sem padrao consistente entre features. |
| Esforco | 6 horas |
| Dependencias | DEB-023 (EmptyState padronizado facilita padronizar ErrorState tambem) |
| Bloqueado por | -- |
| Bloqueia | -- |
| Specialist Review | Confirmado por @ux-design-expert |

---

## 5. Matriz de Priorizacao Preliminar

| # | ID | Debito | Area | Sev. | Horas | Prior. | Deps |
|---|---------|--------|------|------|-------|--------|------|
| 1 | DEB-001 | tenant_id NOT NULL em 10 tabelas | DB/Security | CRIT | 4 | P0 | -- |
| 2 | DEB-002 | API keys plaintext + sem tenant | DB/Security | CRIT | 4 | P0 | DEB-001 |
| 3 | DEB-003 | OpenAI key rotation | Security | CRIT | 1 | P0 | -- |
| 4 | DEB-004 | OAuth tokens plaintext | DB/Security | HIGH | 4 | P1 | -- |
| 5 | DEB-005 | Indexes whatsapp_messages | DB/Perf | HIGH | 1 | P1 | -- |
| 6 | DEB-006 | STATUS_COLORS duplicado | FE/Design | HIGH | 4 | P1 | -- |
| 7 | DEB-007 | i18n 97% incompleto | FE/i18n | HIGH | 40 | P1 | -- |
| 8 | DEB-008 | Keyboard navigation limitada | A11y | HIGH | 16 | P1 | DEB-009 |
| 9 | DEB-009 | Skip-to-content ausente | A11y | HIGH | 4 | P1 | -- |
| 10 | DEB-010 | CHECK constraints status | DB/Constr | HIGH | 4 | P1 | -- |
| 11 | DEB-011 | Sentry nao configurado Vercel | Obs. | HIGH | 1 | P1 | -- |
| 12 | DEB-012 | Edge Functions missing deploy | CI/CD | HIGH | 2 | P1 | -- |
| 13 | DEB-013 | Tags duplicadas (3 sistemas) | DB/Norm | MED | 6 | P2 | -- |
| 14 | DEB-014 | content vs message_text | DB/Norm | MED | 3 | P2 | -- |
| 15 | DEB-015 | Soft-delete inconsistente | DB/Integ | MED | 8 | P2 | -- |
| 16 | DEB-016 | leads 47 colunas | DB/Norm | MED | 12 | P2 | DEB-001, DEB-030 |
| 17 | DEB-017 | N+1 assistant | DB/Perf | MED | 2 | P2 | -- |
| 18 | DEB-018 | Indexes crm_followups | DB/Perf | MED | 1 | P2 | -- |
| 19 | DEB-019 | Retention policy logs | DB/Scale | MED | 3 | P2 | -- |
| 20 | DEB-020 | Query key factory | State | MED | 8 | P2 | -- |
| 21 | DEB-021 | Supabase calls diretas | Arch | MED | 12 | P2 | DEB-020 |
| 22 | DEB-022 | supabaseUntyped | Types | MED | 4 | P2 | -- |
| 23 | DEB-023 | EmptyState subutilizado | FE/UX | MED | 8 | P2 | -- |
| 24 | DEB-024 | Tabelas nao responsivas | Resp. | MED | 20 | P2 | -- |
| 25 | DEB-025 | Draft persistence | FE/UX | MED | 8 | P2 | -- |
| 26 | DEB-026 | React.memo ausente | Perf | MED | 6 | P2 | -- |
| 27 | DEB-027 | Hardcoded colors | Design | MED | 8 | P2 | DEB-006 |
| 28 | DEB-028 | Virtual scrolling | Perf | MED | 12 | P2 | DEB-026 |
| 29 | DEB-029 | Rate limiting duplicado | Quality | MED | 4 | P2 | -- |
| 30 | DEB-030 | Scores duplicados leads | DB/Norm | LOW | 2 | P3 | -- |
| 31 | DEB-031 | FKs tabelas utilitarias | DB/RI | LOW | 3 | P3 | -- |
| 32 | DEB-032 | Naming PT/EN misto | DB/Conv | LOW | 1 | P4 | -- |
| 33 | DEB-033 | responsavel text duplicado | DB/Norm | LOW | 2 | P3 | -- |
| 34 | DEB-034 | Partitioning strategy | DB/Scale | LOW | 8 | P3 | DEB-001, DEB-019 |
| 35 | DEB-035 | Normalize patterns dupl. | Quality | LOW | 6 | P3 | DEB-020 |
| 36 | DEB-036 | Sentry bundle 445KB | Perf | LOW | 4 | P4 | DEB-011 |
| 37 | DEB-037 | Recharts bundle 457KB | Perf | LOW | 3 | P4 | -- |
| 38 | DEB-038 | i18n sistema | i18n | LOW | 0* | P4 | DEB-007 |
| 39 | DEB-039 | Capacitor vulns | Security | LOW | 2 | P4 | -- |
| 40 | DEB-040 | services/ vazio | Arch | LOW | 0 | P4 | -- |
| 41 | DEB-041 | reduced-motion | A11y | LOW | 2 | P3 | -- |
| 42 | DEB-042 | Breadcrumbs nao clicaveis | Nav | LOW | 2 | P3 | -- |
| 43 | DEB-043 | Error handling inconsist. | FE/UX | LOW | 6 | P3 | DEB-023 |

\* Esforco incluido em DEB-007

---

## 6. Riscos Cross-Cutting

| Risco | Areas Afetadas | Debitos Relacionados | Impacto |
|-------|----------------|---------------------|---------|
| **Vazamento de dados entre tenants** | DB, Security, Backend | DEB-001, DEB-002, DEB-004, DEB-013 (tags sem tenant em `crm_tags`) | CRITICO: tenant_id nullable + API keys sem escopo = potencial cross-tenant data leak |
| **Inconsistencia de dados CRM** | DB, Frontend, Hooks | DEB-013, DEB-014, DEB-016, DEB-030, DEB-033 | ALTO: Duplicacoes criam dados divergentes, displays inconsistentes, e bugs sutis em reports |
| **Degradacao de performance em escala** | DB, Frontend | DEB-005, DEB-018, DEB-019, DEB-028, DEB-034 | MEDIO: Tabelas de alto volume sem indexes e sem retention + listas sem virtualizacao |
| **Dark mode quebrado** | Frontend, Design | DEB-006, DEB-027 | MEDIO: Hardcoded colors + STATUS_COLORS duplicado = aparencia inconsistente em dark mode |
| **Conformidade a11y insuficiente** | Frontend, Legal | DEB-008, DEB-009, DEB-041 | MEDIO: Escritorios de advocacia podem ter obrigacoes legais de acessibilidade |
| **Observabilidade em producao** | CI/CD, Monitoring | DEB-011, DEB-012, DEB-019 | MEDIO: Sentry nao configurado + functions nao deploiadas = pontos cegos em producao |
| **Credenciais expostas** | DB, Security | DEB-002, DEB-003, DEB-004 | CRITICO: 3 tipos de credenciais em texto plano ou pendentes de rotacao |

---

## 7. Dependencias entre Debitos

```
LEGENDA: A --> B significa "A deve ser resolvido antes de B"

=== Cadeia Critica de Seguranca ===
DEB-001 (tenant_id NOT NULL) --> DEB-002 (API keys + tenant scoping)
DEB-001 (tenant_id NOT NULL) --> DEB-016 (leads extraction)
DEB-001 (tenant_id NOT NULL) --> DEB-034 (partitioning)

=== Cadeia de Performance DB ===
DEB-019 (retention policy) --> DEB-034 (partitioning)
DEB-005 (indexes whatsapp) --> DEB-034 (partitioning)

=== Cadeia de Design System ===
DEB-006 (STATUS_COLORS central) --> DEB-027 (hardcoded colors)
DEB-010 (CHECK constraints) <--> DEB-006 (valores validos alinhados)

=== Cadeia de Acessibilidade ===
DEB-009 (skip-to-content) --> DEB-008 (keyboard navigation completa)

=== Cadeia de Performance Frontend ===
DEB-026 (React.memo) --> DEB-028 (virtual scrolling)

=== Cadeia de Normalizacao DB ===
DEB-030 (scores duplicados) --> DEB-016 (leads extraction)

=== Cadeia de State Management ===
DEB-020 (query key factory) --> DEB-021 (supabase calls diretas)
DEB-020 (query key factory) --> DEB-035 (normalize patterns)

=== Cadeia de Observabilidade ===
DEB-011 (Sentry config Vercel) --> DEB-036 (Sentry bundle optimization)

=== Cadeia de UX Consistency ===
DEB-023 (EmptyState) --> DEB-043 (error handling patterns)
```

### Ordem Recomendada de Execucao

**Sprint 1 (P0 + quick wins P1):**
1. DEB-003 -- OpenAI key rotation (1h)
2. DEB-001 -- tenant_id NOT NULL (4h)
3. DEB-002 -- API keys hashing + tenant (4h)
4. DEB-005 -- Indexes whatsapp_messages (1h)
5. DEB-011 -- Sentry config Vercel (1h)
6. DEB-012 -- Edge Functions deploy list (2h)

**Sprint 2 (P1 core):**
1. DEB-004 -- OAuth tokens encryption (4h)
2. DEB-010 -- CHECK constraints (4h)
3. DEB-006 -- STATUS_COLORS centralizado (4h)
4. DEB-009 -- Skip-to-content (4h)
5. DEB-008 -- Keyboard navigation (16h)
6. DEB-018 -- Indexes crm_followups (1h)

**Sprint 3 (P2 normalization):**
1. DEB-014 -- Consolidar content columns (3h)
2. DEB-013 -- Consolidar tag systems (6h)
3. DEB-017 -- Fix N+1 assistant (2h)
4. DEB-019 -- Retention policy (3h)
5. DEB-020 -- Query key factory (8h)

**Sprint 4+ (P2 UX + remaining):**
- DEB-007 (40h), DEB-024 (20h), DEB-021 (12h), DEB-028 (12h), etc.

---

## 8. Perguntas para Especialistas

### Para @data-engineer (Fase 5)

1. **Backfill tenant_id (DEB-001):** Qual a estrategia de backfill para rows com NULL tenant_id? Podemos inferir o tenant de tabelas relacionadas (ex: `whatsapp_messages.tenant_id` de `whatsapp_conversations.tenant_id`)? Ha rows sem relacao que precisam ser deletadas?

2. **API keys hashing (DEB-002):** Qual algoritmo de hash recomendado? SHA-256 com salt e suficiente ou devemos usar bcrypt/argon2? A funcao `validar_api_key()` precisa ser reescrita -- qual o impacto nos consumers atuais?

3. **Tag system unification (DEB-013):** Qual sistema deve sobreviver: `tags`/`lead_tags` (PT, com categoria/ordem) ou `crm_tags`/`crm_lead_tags` (EN, simples)? Ou criar sistema novo unificado? Qual o volume de dados em cada sistema?

4. **Soft-delete pattern (DEB-015):** Recomenda adotar `deleted_at` timestamptz universalmente, ou manter `ativo` boolean? Requisitos LGPD de retencao de dados influenciam esta decisao?

5. **leads extraction (DEB-016):** A view `v_leads_operacional` ja mitiga o impacto das 47 colunas em reads? O refactoring de satellite tables vale o esforco agora ou deve esperar escala maior?

6. **exec_sql() function:** Esta funcao deve ser removida? Mesmo com gating de admin, permite SQL arbitrario e e uma superficie de ataque significativa. Qual caso de uso legitimo a justifica?

7. **legal_knowledge sem tenant_id:** E intencional (knowledge base compartilhada entre tenants) ou oversight? Se compartilhada, como prevenir que estrategias legais de um tenant sejam expostas a outro?

8. **Partitioning timeline (DEB-034):** Qual o volume atual de rows em `whatsapp_messages` e `agent_ai_logs`? Em que volume devemos implementar partitioning?

### Para @ux-design-expert (Fase 6)

1. **STATUS_COLORS alignment (DEB-006 + DEB-010):** Ao centralizar STATUS_COLORS, devemos alinhar com os CHECK constraints do banco? Ou o frontend deve ser mais flexivel que o banco?

2. **i18n migration strategy (DEB-007):** Qual a prioridade real? Se o mercado e 100% brasileiro no curto prazo, podemos tratar como P3? Ou a consistencia de patterns justifica migrar agora?

3. **Mobile tables (DEB-024):** Qual padrao responsivo recomendado para tabelas legais? Horizontal scroll wrapper, card view alternativa, ou colunas hidden? Considerar que processos juridicos tem muitos campos criticos.

4. **EmptyState vs custom (DEB-023):** As 25 features com empty states inline tem contexto visual que o EmptyState generico nao captura? Ou e apenas falta de adocao?

5. **Draft persistence scope (DEB-025):** Quais formularios devem ter prioridade? LeadForm e NovoContratoForm sao os mais longos -- devemos comecar por eles?

6. **Virtual scrolling threshold (DEB-028):** Qual o dataset maximo esperado por tenant para leads, contratos e processos? Precisamos de virtual scrolling abaixo de 500 items?

7. **Accessibility compliance level:** WCAG 2.1 AA e requisito legal/contratual para clientes de escritorios de advocacia? Isso elevaria DEB-008, DEB-009 e DEB-041 para P0.

---

## 9. Proximos Passos

- [ ] Review do @data-engineer (Fase 5) -- respostas as 8 perguntas acima
- [ ] Review do @ux-design-expert (Fase 6) -- respostas as 7 perguntas acima
- [ ] QA Review geral (Fase 7) -- validacao do assessment completo
- [ ] Consolidacao final (Fase 8) -- incorporar feedback dos especialistas
- [ ] Criacao de epics/stories para Sprint 1 (P0) -- @pm
- [ ] Decisoes arquiteturais pendentes: soft-delete pattern, tag unification, exec_sql(), legal_knowledge scoping

---

*Documento gerado por @architect (Aria) durante Brownfield Discovery Phase 4.*
*Proximo: @data-engineer (Phase 5 -- DB Specialist Review), @ux-design-expert (Phase 6 -- UX Specialist Review).*
