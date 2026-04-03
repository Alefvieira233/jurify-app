# Technical Debt Assessment — FINAL

**Projeto:** Jurify Legal SaaS
**Data:** 2026-04-03
**Versao:** 1.0 (Final)
**Validado por:** @architect (Aria), @data-engineer (Dara), @ux-design-expert (Uma), @qa (Quinn)

---

## Executive Summary

| Metrica | Valor |
|---------|-------|
| **Total de debitos** | **48** |
| Criticos (P0) | 3 |
| Altos (P1) | 9 |
| Medios (P2) | 21 |
| Baixos (P3-P4) | 15 |
| **Esforco total estimado** | **~321 horas** |
| Assessment Score | 82/100 (DB) · 7/10 (UX) |
| QA Gate | **APPROVED** (1 condicao atendida) |

O Jurify possui base madura (audit score 99/100) com arquitetura solida, mas acumula 48 debitos tecnicos em tres eixos:

1. **Seguranca (P0/P1):** Credenciais em texto plano (API keys, OAuth tokens, integration keys), tenant_id nullable em 10 tabelas criticas, key rotation pendente. 4 tipos de credenciais expostas em caso de breach. **Cadeia critica:** DEB-012 (deploy encrypt/decrypt functions) bloqueia resolucao de criptografia.

2. **Consistencia de dados (P1/P2):** Sistemas duplicados (tags, scores, colunas de conteudo), tabela `leads` com 47 colunas, ausencia de CHECK constraints em status columns. Geram inconsistencias e dificultam manutencao.

3. **Frontend UX (P1/P2):** i18n 97% incompleto, STATUS_COLORS duplicado em 8 arquivos, acessibilidade limitada (skip-to-content ausente, aria-live em apenas 2 locais), tabelas nao-responsivas em 5 de 6 tabelas criticas. Afetam conformidade a11y e mobile readiness.

**Risco cross-cutting principal:** DEB-012 (Edge Functions ausentes no deploy) e bloqueador implicito para toda a cadeia de criptografia (DEB-004, DEB-DB-NEW-001). Sem `encrypt-data`/`decrypt-data` em producao, credenciais nao podem ser cifradas.

---

## Inventario Completo de Debitos

### Criticos (P0) — Resolver Imediatamente

#### DEB-001: Nullable tenant_id em 10 Tabelas Criticas

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | CRITICAL |
| Validado por | @data-engineer |
| Impacto | Rows com NULL tenant_id criam dados orfaos invisiveis a todos os tenants. INSERT sem tenant_id produz registros que escapam do RLS. Tabelas: `whatsapp_messages`, `whatsapp_sessions`, `lead_interactions`, `conversation_logs`, `configuracoes_integracoes`, `knowledge_base`, `logs_execucao_agentes`, `hitl_requests`, `pagamentos`, `audit_log`. Confirmado via `types.ts` (L4838, L4936, L2876, L1535, L1339, L2734, L3369, L2542, L3501, L702). |
| Esforco | 5 horas (4h migracao + 1h auditoria de INSERTs em Edge Functions) |
| Dependencias | Nenhuma — pode ser resolvido imediatamente |
| Bloqueia | DEB-002, DEB-DB-NEW-001, DEB-016, DEB-034 |
| Sprint | 1 |
| Estrategia de backfill | Inferir tenant_id via JOINs em tabelas relacionadas (ex: `whatsapp_messages` via `whatsapp_conversations.tenant_id`). Rows sem relacao mover para `_orphaned_{table}`. Migracao atomica: backfill UPDATE + ALTER COLUMN SET NOT NULL. |
| Risco de regressao | ALTO — INSERTs sem tenant_id falharao. Auditar Edge Functions antes da migracao. |

#### DEB-002: API Keys em Texto Plano + Sem Tenant Scoping

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | CRITICAL |
| Validado por | @data-engineer |
| Impacto | `key_value` armazena API keys como texto plano. `validar_api_key()` faz comparacao direta. Tabela `api_keys` nao tem `tenant_id`. Se banco comprometido, todas as API keys sao expostas. `types.ts` L550-578 confirma: sem Relationships, sem tenant_id. |
| Esforco | 4 horas |
| Dependencias | DEB-001 (padrao NOT NULL tenant_id) |
| Bloqueia | — |
| Sprint | 1 |
| Solucao definitiva | SHA-256 com salt aleatorio por key (`gen_random_bytes(16)`). Schema: `key_hash TEXT, salt TEXT, key_prefix TEXT` (8 chars para identificacao visual). Funcao `validar_api_key()` reescrita para hash+compare. |
| Risco de regressao | MEDIO — Deploy `validar_api_key_v2()` em paralelo, migrar consumers, drop antiga. |

#### DEB-003: OpenAI API Key Rotation Pendente

| Campo | Valor |
|-------|-------|
| Area | Security |
| Severidade | CRITICAL |
| Validado por | @architect |
| Impacto | Key precisa rotacao. Se comprometida, atacantes consomem budget de AI e acessam dados legais via assistente. Unico ponto pendente do audit score 99/100. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueia | — |
| Sprint | 1 |

---

### Altos (P1) — Proximo Sprint

#### DEB-004: OAuth Tokens do Google Calendar em Texto Plano

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | HIGH |
| Validado por | @data-engineer |
| Impacto | `access_token` e `refresh_token` sem criptografia em `google_calendar_tokens` (L2444-2477). Breach expoe tokens OAuth de todos os usuarios. |
| Esforco | 4 horas |
| Dependencias | **DEB-012** (deploy de `encrypt-data`/`decrypt-data` em producao — bloqueador real) |
| Bloqueia | — |
| Sprint | 2 |
| Risco de regressao | MEDIO — Migracao deve ler plaintext, criptografar, salvar ciphertext. Atualizar `useGoogleCalendar` e Edge Function `google-calendar` para descriptografar. |

#### DEB-005: Indexes Ausentes em whatsapp_messages

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | **MEDIUM** (rebaixado de HIGH — @data-engineer) |
| Validado por | @data-engineer |
| Impacto | Index principal `(conversation_id, timestamp DESC)` ja existe (migration 20260207). Falta apenas `(tenant_id, lead_id)` para queries por lead. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueia | DEB-034 |
| Sprint | 1 (quick win) |
| Justificativa do rebaixamento | Parcialmente mitigado pelo index existente que cobre o padrao principal de chat. |

#### DEB-006: STATUS_COLORS Duplicado em 8 Arquivos

| Campo | Valor |
|-------|-------|
| Area | Frontend / Design System |
| Severidade | HIGH |
| Validado por | @ux-design-expert |
| Impacto | Cores de status inconsistentes entre ContatosTable, ProcessosManager, HonorariosManager, SuportePage, CRM LeadDetailPanel, TicketDetailDialog, ProcessoDetalhes e constants.ts. |
| Esforco | 4 horas |
| Dependencias | Nenhuma |
| Bloqueia | DEB-027 (hardcoded colors), DEB-UX-NEW-003 (contraste) |
| Sprint | 2 |
| Solucao definitiva | Criar `src/constants/statusConfig.ts` com `Record<EntityType, Record<StatusValue, { label, color, icon }>>`. CSS custom properties `--status-{name}-bg/text` com valores por tema. Componente `<StatusBadge>`. Alinhar com CHECK constraints do banco (DEB-010). |

#### DEB-007: i18n Migration Incompleta (~97% Hardcoded)

| Campo | Valor |
|-------|-------|
| Area | Frontend / i18n |
| Severidade | **MEDIUM** (rebaixado de HIGH — @ux-design-expert) |
| Validado por | @ux-design-expert |
| Impacto | 4 de ~130 componentes usam `useTranslation()`. Mercado 100% brasileiro atual. Framework i18next funcional. |
| Esforco | 40 horas |
| Dependencias | Nenhuma |
| Bloqueia | — |
| Sprint | 4+ (incremental) |
| Justificativa do rebaixamento | Nenhum usuario impactado hoje. Migracao mecanica mas cara. Abordagem recomendada: (1) migrar sidebar/titles agora (2h), (2) migrar componentes ao tocar, (3) sprint dedicado quando expansao internacional confirmada. |

#### DEB-008: Keyboard Navigation Limitada

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | HIGH |
| Validado por | @ux-design-expert |
| Impacto | 8 ocorrencias de `tabIndex`/`onKeyDown` em 512 arquivos. Power users e a11y bloqueados. Gap WCAG 2.1 Level A. |
| Esforco | 16 horas |
| Dependencias | DEB-009 (skip-to-content primeiro) |
| Bloqueia | — |
| Sprint | 2 |

#### DEB-009: Skip-to-Content e Focus Management Ausentes

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | HIGH |
| Validado por | @ux-design-expert |
| Impacto | Usuarios de screen reader percorrem sidebar inteira. Sem reset de foco em navegacao. Violacao WCAG 2.1 Level A basica. |
| Esforco | 4 horas |
| Dependencias | Implementar junto com DEB-008 |
| Bloqueia | — |
| Sprint | 2 |
| Solucao definitiva | `<a href="#main-content" className="sr-only focus:not-sr-only ...">` no Layout.tsx. Hook `useFocusOnRouteChange()` com `pathname` como dep. |

#### DEB-010: CHECK Constraints Ausentes em Status Columns

| Campo | Valor |
|-------|-------|
| Area | Database / Constraints |
| Severidade | HIGH |
| Validado por | @data-engineer |
| Impacto | Todas as colunas de status sao `text` sem CHECK em 10 tabelas core. Historico de problemas (migration 20260323). |
| Esforco | 4 horas |
| Dependencias | DEB-006 (alinhar valores com frontend) |
| Bloqueia | — |
| Sprint | 2 |
| Risco de regressao | MEDIO — Auditar `SELECT DISTINCT status FROM {table}` antes de criar constraints. |

#### DEB-011: Sentry/Monitoring Nao Configurado no Vercel

| Campo | Valor |
|-------|-------|
| Area | Observability |
| Severidade | HIGH |
| Validado por | @architect |
| Impacto | `VITE_SENTRY_DSN` e `SENTRY_AUTH_TOKEN` nao configurados. Erros em producao nao capturados. Source maps nao enviados. |
| Esforco | 1 hora |
| Dependencias | Nenhuma |
| Bloqueia | DEB-036 |
| Sprint | 1 |

#### DEB-012: Edge Functions Ausentes no Deploy List

| Campo | Valor |
|-------|-------|
| Area | CI/CD |
| Severidade | HIGH |
| Validado por | @qa (expandido de 6 para **14 funcoes**) |
| Impacto | `deploy-production.yml` deploia lista fixa. **14 funcoes** ausentes: `admin-create-user`, `agentes-ia-api`, `create-portal-session`, `data-retention-cleanup`, `decrypt-data`, `encrypt-data`, `extract-document-text`, `generate-document`, `health`, `ingest-document-from-file`, `process-followup-queue`, `process-prazos-alerts`, `send-push-notification`, `send-whatsapp-message`. Nota: `customer-portal` no deploy list nao existe como diretorio (deveria ser `create-portal-session`). **Criticamente, `encrypt-data` e `decrypt-data` sao pre-requisitos para DEB-004 e DEB-DB-NEW-001.** |
| Esforco | 3 horas (ajustado de 2h pelo escopo expandido) |
| Dependencias | Nenhuma |
| Bloqueia | **DEB-004, DEB-DB-NEW-001** (criptografia depende de encrypt/decrypt em producao) |
| Sprint | 1 |

#### DEB-024: Tabelas Nao Responsivas em Mobile

| Campo | Valor |
|-------|-------|
| Area | Responsiveness |
| Severidade | **HIGH** (elevado de MEDIUM — @ux-design-expert) |
| Validado por | @ux-design-expert |
| Impacto | 5 de 6 tabelas criticas sem suporte mobile: ProcessosManager, ContratosManager, HonorariosManager, EquipeManager, UsuariosManager. Apenas ContatosTable tem `overflow-x-auto`. Inutilizaveis em telas <768px. Capacitor ja configurado com hooks nativos — app mobile e realidade proxima. |
| Esforco | 20 horas |
| Dependencias | Nenhuma |
| Bloqueia | — |
| Sprint | 3 |
| Solucao definitiva | Componente `<ResponsiveTable>` com 3 niveis: desktop (tabela completa), tablet (overflow-x-auto + colunas hidden), mobile (card view via `useIsMobile()`). |

#### DEB-DB-NEW-001: configuracoes_integracoes.api_key em Texto Plano

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | HIGH |
| Validado por | @data-engineer (novo — Phase 5) |
| Impacto | Campo `api_key: string` (NOT NULL) armazena API keys de integracoes externas (Kapso, etc.) em texto plano. Tambem `verify_token` em plaintext. Combinado com `tenant_id: string | null` (nullable!), tem dois problemas simultaneos: credenciais expostas e isolamento fragil. Breach expoe todas as API keys de integracoes de todos os tenants. |
| Esforco | 3 horas |
| Dependencias | **DEB-012** (deploy de encrypt-data/decrypt-data), DEB-001 (tenant_id NOT NULL) |
| Bloqueia | — |
| Sprint | 2 |
| Solucao | Criptografar via Edge Functions `encrypt-data`/`decrypt-data`. Incluir tabela no backfill de DEB-001. Atualizar Edge Functions que leem `configuracoes_integracoes` para descriptografar em runtime. |

---

### Medios (P2) — Backlog Priorizado

#### DEB-013: Sistemas de Tags Duplicados

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | Tres representacoes: `tags`/`lead_tags` (PT, categoria/ordem), `crm_tags`/`crm_lead_tags` (EN, simples), `leads.tags` (text array). |
| Esforco | 6 horas |
| Sprint | 3 |
| Decisao definitiva | Manter `tags`/`lead_tags` como sistema unico (mais feature-rich). Migrar dados de `crm_tags` -> `tags`, backfill `leads.tags[]` para junction table, drop tabelas duplicadas. |
| Risco de regressao | ALTO — Usar feature flag para transicao gradual. Manter tabelas antigas read-only por 1 sprint. |

#### DEB-014: Colunas Duplicadas em whatsapp_messages

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | `content` (L4818) e `message_text` (L4827) coexistem. Vestigio da migracao Evolution -> Kapso. |
| Esforco | 3 horas |
| Sprint | 3 |
| Risco de regressao | MEDIO — Coalesce antes do drop: `UPDATE SET content = COALESCE(content, message_text)`. Grep codebase por `message_text`. |

#### DEB-015: Soft-Delete Inconsistente

| Campo | Valor |
|-------|-------|
| Area | Database / Data Integrity |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | Apenas `leads` tem soft-delete completo. Outras tabelas core tem apenas `ativo` boolean ou deletam permanentemente. Gaps no audit trail e conformidade LGPD. |
| Esforco | 8 horas |
| Sprint | 3 |
| Decisao definitiva | Adotar `deleted_at timestamptz` como padrao + manter `ativo` boolean (semantica separada: desabilitado vs removido). Partial index `WHERE deleted_at IS NULL`. Trigger `on_soft_delete` para audit_log. Nao adicionar em tabelas de log. |

#### DEB-016: Tabela leads Excessivamente Larga (47 Colunas)

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | 47 colunas + 2 JSONB. View `v_leads_operacional` mitiga parcialmente mas ainda faz `SELECT *`. |
| Esforco | 2 horas (quick win: column projection nos hooks) |
| Sprint | 4+ |
| Decisao definitiva | **Adiar satellite tables para v1.4.** Column projection nos hooks (`select("id, nome, email, status, ...")`) como quick win imediato. Trigger para agir: 50K+ rows ou queries >200ms. |

#### DEB-017: N+1 Query no assistant Edge Function

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | 4 queries sequenciais em `assistant/index.ts` L510-530. Deveria usar `get_dashboard_metrics()`. |
| Esforco | 2 horas |
| Sprint | 3 |

#### DEB-019: Retention Policy Ausente em Tabelas de Log

| Campo | Valor |
|-------|-------|
| Area | Database / Scalability |
| Severidade | MEDIUM |
| Validado por | @data-engineer |
| Impacto | `data-retention-cleanup` Edge Function existe mas sem enforcement a nivel de banco. `agent_ai_logs` armazena `full_result` e `system_prompt` como texto potencialmente muito grande. |
| Esforco | 3 horas |
| Sprint | 3 |
| Bloqueia | DEB-034 |

#### DEB-020: Query Key Factory Pattern Ausente

| Campo | Valor |
|-------|-------|
| Area | Server State |
| Severidade | MEDIUM |
| Validado por | @architect |
| Impacto | Query keys dispersos em 73 hooks como arrays inline. Risco de colisao, cache stale, dificuldade de rastreio. |
| Esforco | 8 horas |
| Sprint | 3 |
| Bloqueia | DEB-021, DEB-035 |

#### DEB-021: Chamadas Diretas ao Supabase em Componentes

| Campo | Valor |
|-------|-------|
| Area | Architecture |
| Severidade | MEDIUM |
| Validado por | @architect |
| Impacto | Componentes chamam `supabase.from()` diretamente, bypassa cache do React Query. |
| Esforco | 12 horas |
| Dependencias | DEB-020 |
| Sprint | 4 |

#### DEB-022: `supabaseUntyped` Escape Hatch em Uso

| Campo | Valor |
|-------|-------|
| Area | Type Safety |
| Severidade | MEDIUM |
| Validado por | @architect |
| Impacto | Bypassa tipo `Database` para tabelas como `agent_memories`, `workflow_queue`, `departamento_membros`. |
| Esforco | 4 horas |
| Sprint | 3 |

#### DEB-023: EmptyState Component Subutilizado

| Campo | Valor |
|-------|-------|
| Area | Frontend / UX |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert |
| Impacto | Usado em 5 de 30 features. 25 features usam markup ad-hoc. Componente ja aceita icon, title, description e children. |
| Esforco | 8 horas |
| Sprint | 3 |
| Bloqueia | DEB-043 |

#### DEB-025: Draft Persistence Nao Utilizado

| Campo | Valor |
|-------|-------|
| Area | Frontend / UX |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert |
| Impacto | `useDraftPersistence` usado em 1 de 15 formularios. Usuarios perdem dados em navegacao acidental. |
| Esforco | 8 horas |
| Sprint | 3 |
| Prioridade de formularios | 1. LeadForm (17 campos), 2. NovoContratoForm (upload), 3. NovoProcessoForm (17 campos), 4. NovoPrazoForm, 5. NovoHonorarioForm. ~1.5h por formulario. |

#### DEB-026: React.memo Ausente em Componentes de Lista

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert |
| Impacto | Rows/cards re-renderizam em cada filtro/busca. Jank visivel em datasets grandes. 19 arquivos usam React.memo. |
| Esforco | 6 horas |
| Sprint | 4 |
| Bloqueia | DEB-028 |

#### DEB-027: Hardcoded Color Values vs Design Tokens

| Campo | Valor |
|-------|-------|
| Area | Design System |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert |
| Impacto | 33 ocorrencias de `text-gray-*`/`bg-gray-*` em 17 arquivos + 64+ `text-white` em 30 arquivos. Dark mode quebra. |
| Esforco | 8 horas |
| Dependencias | DEB-006 |
| Sprint | 3 |
| Solucao | Search/replace sistematico: `text-gray-500` -> `text-muted-foreground`, `bg-gray-100` -> `bg-muted`, etc. Adicionar eslint-plugin-tailwindcss para prevenir regressoes. |

#### DEB-028: Virtual Scrolling Ausente em Listas Grandes

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert |
| Impacto | Apenas MessageView usa `@tanstack/react-virtual`. ContatosTable, ArquivadosView, NotificationsPanel renderizam 500+ items com degradacao. |
| Esforco | 12 horas |
| Dependencias | DEB-026 |
| Sprint | 4 |

#### DEB-029: Rate Limiting Duplicado (2 Implementacoes)

| Campo | Valor |
|-------|-------|
| Area | Code Quality |
| Severidade | MEDIUM |
| Validado por | @architect |
| Impacto | `_shared/rate-limiter.ts` (Supabase-backed, 374 linhas) e `_shared/security.ts` (in-memory, 48 linhas) coexistem. |
| Esforco | 4 horas |
| Sprint | 3 |

#### DEB-042: Breadcrumbs Nao Interativos

| Campo | Valor |
|-------|-------|
| Area | Navigation |
| Severidade | **MEDIUM** (elevado de LOW — @ux-design-expert) |
| Validado por | @ux-design-expert |
| Impacto | Breadcrumbs.tsx usa spans estaticos sem `<Link>`. Em app com 47 rotas e 3 niveis de profundidade, friccao real de navegacao. Componente shadcn/ui `BreadcrumbLink` ja suporta — basta usar. |
| Esforco | 2 horas |
| Sprint | 3 (quick win) |

#### DEB-DB-NEW-002: agent_ai_logs Armazena Prompts com Dados Sensiveis sem Redacao PII

| Campo | Valor |
|-------|-------|
| Area | Database / Compliance |
| Severidade | MEDIUM |
| Validado por | @data-engineer (novo — Phase 5) |
| Impacto | `system_prompt`, `user_prompt`, `full_result` armazenam prompts com dados legais sensiveis (nomes, processos, estrategias). Sem redacao PII. Risco LGPD Art. 18 e etica profissional (sigilo, Art. 34 Estatuto OAB). Tabela tem `tenant_id NOT NULL` (bom), mas dados nao sao redacted. |
| Esforco | 4 horas |
| Sprint | 3 |
| Solucao | Implementar funcao de redacao PII no INSERT trigger (mascarar CPF, nomes, numeros de processo). Ou criptografar at-rest via Supabase Vault. Considerar TTL agressivo (tabela separada `agent_ai_log_details` com retention curta). |

#### DEB-UX-NEW-001: aria-live Ausente em Feedback Dinamico

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert (novo — Phase 6) |
| Impacto | Apenas 2 ocorrencias de `aria-live` no codebase (ProtectedRoute.tsx e teste). Nenhum formulario anuncia erros para screen readers. Nenhuma lista anuncia contagem de resultados apos filtro. |
| Esforco | 6 horas |
| Sprint | 2 |
| Solucao | Modificar `FormMessage` em `form.tsx` para incluir `aria-live="polite"`. Criar `<ScreenReaderAnnounce>`. Adicionar contagem de resultados em listas filtraveis. |

#### DEB-UX-NEW-003: Contraste de Cores em Status Badges

| Campo | Valor |
|-------|-------|
| Area | Accessibility / Design |
| Severidade | MEDIUM |
| Validado por | @ux-design-expert (novo — Phase 6) |
| Impacto | Badges usam cores claras (amber-100, blue-100) com texto escuro sobre cards brancos. Algumas combinacoes falham WCAG AA (4.5:1). Overrides `!important` no index.css indicam cores nao projetadas para ambos os temas. |
| Esforco | 4 horas |
| Dependencias | DEB-006 (resolver junto na centralizacao) |
| Sprint | 2 |
| Solucao | Auditar contraste com axe-core. Definir pares de cores (bg + text) garantidos AA em ambos os temas. Tokens CSS `--status-{name}-bg/text`. |

---

### Baixos (P3-P4) — Tech Debt Backlog

#### DEB-018: Indexes Ausentes em crm_followups

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | **LOW** (rebaixado de MEDIUM — @data-engineer) |
| Validado por | @data-engineer |
| Impacto | Indexes `(tenant_id, status)` e `(scheduled_at) WHERE status='pending'` ja existem (migration 20260215). Faltam apenas compostos adicionais `(tenant_id, status, scheduled_at)` e `(lead_id, status)`. |
| Esforco | 1 hora |
| Sprint | 2 (quick win) |

#### DEB-030: Scores Duplicados na Tabela leads

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | LOW |
| Validado por | @data-engineer |
| Impacto | `score` e `lead_score` (ambos integer nullable) + `crm_lead_scores` historico. Ambiguidade. |
| Esforco | 2 horas |
| Sprint | 3 |

#### DEB-031: Foreign Keys Ausentes em Tabelas Utilitarias

| Campo | Valor |
|-------|-------|
| Area | Database / Referential Integrity |
| Severidade | LOW |
| Validado por | @data-engineer |
| Impacto | `api_keys`, `allowed_columns`, `assistant_audit`, etc. sem FK para `tenants`/`profiles`. |
| Esforco | 3 horas |
| Sprint | 4 |

#### DEB-032: Naming Convention Misto (Portugues/Ingles)

| Campo | Valor |
|-------|-------|
| Area | Database / Convention |
| Severidade | LOW |
| Validado por | @data-engineer |
| Impacto | Tabelas misturam PT/EN. Nao recomendavel renomear. |
| Esforco | 1 hora (ADR apenas) |
| Sprint | 4 |
| Decisao definitiva | Apenas documentar convencao para novas tabelas via ADR. |

#### DEB-033: Colunas responsavel Duplicadas (Text + UUID)

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | LOW |
| Validado por | @data-engineer |
| Impacto | `contratos` tem `responsavel` (text) e `responsavel_id` (uuid FK). Campo text e legado. |
| Esforco | 2 horas |
| Sprint | 3 |

#### DEB-034: Estrategia de Partitioning Ausente

| Campo | Valor |
|-------|-------|
| Area | Database / Scalability |
| Severidade | LOW |
| Validado por | @data-engineer |
| Impacto | Tabelas de alto volume crescerao indefinidamente. |
| Esforco | 8 horas |
| Dependencias | DEB-001, DEB-005, DEB-019 |
| Sprint | Futuro (quando monitoramento indicar necessidade) |
| Thresholds | `whatsapp_messages`: 250K rows. `agent_ai_logs`: 100K rows. `audit_log`: 500K rows. Criar pg_cron job para monitorar `n_live_tup` semanalmente. |

#### DEB-035: Normalize/Fetch Patterns Duplicados em Hooks

| Campo | Valor |
|-------|-------|
| Area | Code Quality |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | Logica de normalizacao similar em multiplos hooks. |
| Esforco | 6 horas |
| Dependencias | DEB-020 |
| Sprint | 4 |

#### DEB-036: Sentry Bundle Size (445KB)

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | 2o maior chunk. ~120KB gzipped. |
| Esforco | 4 horas |
| Dependencias | DEB-011 |
| Sprint | 4 |

#### DEB-037: Recharts Bundle Size (457KB)

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | Maior chunk individual. Ja isolado em manual chunk. |
| Esforco | 3 horas |
| Sprint | 4 |

#### DEB-038: i18n Single Locale (Perspective Sistemica)

| Campo | Valor |
|-------|-------|
| Area | Internationalization |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | Nenhum teste de i18n, nenhum CI check para strings nao traduzidas. |
| Esforco | 0 horas (incluido em DEB-007) |
| Dependencias | DEB-007 |
| Sprint | 4+ |

#### DEB-039: Capacitor Transitive Vulnerabilities

| Campo | Valor |
|-------|-------|
| Area | Security |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | 12 vulnerabilidades transitivas via `@capacitor/*`. Sem fix upstream. |
| Esforco | 2 horas (monitoramento) |
| Sprint | 4 |

#### DEB-040: Diretorio services/ Vazio

| Campo | Valor |
|-------|-------|
| Area | Architecture |
| Severidade | LOW |
| Validado por | @architect |
| Impacto | `src/services/` contem apenas `__tests__/`. Service layer pattern nunca desenvolvido. |
| Esforco | 0 horas (decisao apenas) |
| Sprint | 4 |

#### DEB-041: Reducao de Motion Nao Suportada

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | LOW |
| Validado por | @ux-design-expert |
| Impacto | Sem `@media (prefers-reduced-motion: reduce)`. Necessario antes de publicacao em app store. |
| Esforco | 2 horas |
| Sprint | 4 |

#### DEB-043: Error Handling Inconsistente entre Features

| Campo | Valor |
|-------|-------|
| Area | Frontend / UX |
| Severidade | LOW |
| Validado por | @ux-design-expert |
| Impacto | Mix de erro inline, toast, ou nada. Sem padrao consistente. |
| Esforco | 6 horas |
| Dependencias | DEB-023 |
| Sprint | 4 |

#### DEB-UX-NEW-002: ErrorState Component Nao Adotado

| Campo | Valor |
|-------|-------|
| Area | Frontend / UX |
| Severidade | LOW |
| Validado por | @ux-design-expert (novo — Phase 6) |
| Impacto | `ErrorState.tsx` existe mas tem 0 usages em features. Complemento de DEB-043. |
| Esforco | 4 horas |
| Dependencias | DEB-043 |
| Sprint | 4 |

---

## Matriz de Priorizacao Final

| # | ID | Debito | Area | Sev. | Horas | Sprint | Deps | Validado |
|---|-----|--------|------|------|-------|--------|------|----------|
| 1 | DEB-001 | tenant_id NOT NULL em 10 tabelas | DB/Security | CRIT | 5 | 1 | — | @data-engineer |
| 2 | DEB-002 | API keys plaintext + sem tenant | DB/Security | CRIT | 4 | 1 | DEB-001 | @data-engineer |
| 3 | DEB-003 | OpenAI key rotation | Security | CRIT | 1 | 1 | — | @architect |
| 4 | DEB-004 | OAuth tokens plaintext | DB/Security | HIGH | 4 | 2 | DEB-012 | @data-engineer |
| 5 | DEB-005 | Indexes whatsapp_messages | DB/Perf | MED | 1 | 1 | — | @data-engineer |
| 6 | DEB-006 | STATUS_COLORS duplicado | FE/Design | HIGH | 4 | 2 | — | @ux-design-expert |
| 7 | DEB-007 | i18n 97% incompleto | FE/i18n | MED | 40 | 4+ | — | @ux-design-expert |
| 8 | DEB-008 | Keyboard navigation | A11y | HIGH | 16 | 2 | DEB-009 | @ux-design-expert |
| 9 | DEB-009 | Skip-to-content ausente | A11y | HIGH | 4 | 2 | — | @ux-design-expert |
| 10 | DEB-010 | CHECK constraints status | DB/Constr | HIGH | 4 | 2 | DEB-006 | @data-engineer |
| 11 | DEB-011 | Sentry nao configurado | Obs. | HIGH | 1 | 1 | — | @architect |
| 12 | DEB-012 | Edge Functions missing deploy (14) | CI/CD | HIGH | 3 | 1 | — | @qa |
| 13 | DEB-013 | Tags duplicadas (3 sistemas) | DB/Norm | MED | 6 | 3 | — | @data-engineer |
| 14 | DEB-014 | content vs message_text | DB/Norm | MED | 3 | 3 | — | @data-engineer |
| 15 | DEB-015 | Soft-delete inconsistente | DB/Integ | MED | 8 | 3 | — | @data-engineer |
| 16 | DEB-016 | leads 47 colunas (column projection) | DB/Norm | MED | 2 | 4+ | — | @data-engineer |
| 17 | DEB-017 | N+1 assistant | DB/Perf | MED | 2 | 3 | — | @data-engineer |
| 18 | DEB-018 | Indexes crm_followups | DB/Perf | LOW | 1 | 2 | — | @data-engineer |
| 19 | DEB-019 | Retention policy logs | DB/Scale | MED | 3 | 3 | — | @data-engineer |
| 20 | DEB-020 | Query key factory | State | MED | 8 | 3 | — | @architect |
| 21 | DEB-021 | Supabase calls diretas | Arch | MED | 12 | 4 | DEB-020 | @architect |
| 22 | DEB-022 | supabaseUntyped | Types | MED | 4 | 3 | — | @architect |
| 23 | DEB-023 | EmptyState subutilizado | FE/UX | MED | 8 | 3 | — | @ux-design-expert |
| 24 | DEB-024 | Tabelas nao responsivas | Resp. | HIGH | 20 | 3 | — | @ux-design-expert |
| 25 | DEB-025 | Draft persistence | FE/UX | MED | 8 | 3 | — | @ux-design-expert |
| 26 | DEB-026 | React.memo ausente | Perf | MED | 6 | 4 | — | @ux-design-expert |
| 27 | DEB-027 | Hardcoded colors | Design | MED | 8 | 3 | DEB-006 | @ux-design-expert |
| 28 | DEB-028 | Virtual scrolling | Perf | MED | 12 | 4 | DEB-026 | @ux-design-expert |
| 29 | DEB-029 | Rate limiting duplicado | Quality | MED | 4 | 3 | — | @architect |
| 30 | DEB-030 | Scores duplicados leads | DB/Norm | LOW | 2 | 3 | — | @data-engineer |
| 31 | DEB-031 | FKs tabelas utilitarias | DB/RI | LOW | 3 | 4 | — | @data-engineer |
| 32 | DEB-032 | Naming PT/EN misto (ADR) | DB/Conv | LOW | 1 | 4 | — | @data-engineer |
| 33 | DEB-033 | responsavel text duplicado | DB/Norm | LOW | 2 | 3 | — | @data-engineer |
| 34 | DEB-034 | Partitioning strategy | DB/Scale | LOW | 8 | Futuro | DEB-001, DEB-019 | @data-engineer |
| 35 | DEB-035 | Normalize patterns dupl. | Quality | LOW | 6 | 4 | DEB-020 | @architect |
| 36 | DEB-036 | Sentry bundle 445KB | Perf | LOW | 4 | 4 | DEB-011 | @architect |
| 37 | DEB-037 | Recharts bundle 457KB | Perf | LOW | 3 | 4 | — | @architect |
| 38 | DEB-038 | i18n sistema | i18n | LOW | 0* | 4+ | DEB-007 | @architect |
| 39 | DEB-039 | Capacitor vulns | Security | LOW | 2 | 4 | — | @architect |
| 40 | DEB-040 | services/ vazio | Arch | LOW | 0 | 4 | — | @architect |
| 41 | DEB-041 | reduced-motion | A11y | LOW | 2 | 4 | — | @ux-design-expert |
| 42 | DEB-042 | Breadcrumbs nao clicaveis | Nav | MED | 2 | 3 | — | @ux-design-expert |
| 43 | DEB-043 | Error handling inconsist. | FE/UX | LOW | 6 | 4 | DEB-023 | @ux-design-expert |
| 44 | DEB-044 | configuracoes_integracoes api_key | DB/Security | HIGH | 3 | 2 | DEB-012, DEB-001 | @data-engineer |
| 45 | DEB-045 | PII em agent_ai_logs | DB/Compliance | MED | 4 | 3 | — | @data-engineer |
| 46 | DEB-046 | aria-live ausente | A11y | MED | 6 | 2 | — | @ux-design-expert |
| 47 | DEB-047 | ErrorState nao adotado | FE/UX | LOW | 4 | 4 | DEB-043 | @ux-design-expert |
| 48 | DEB-048 | Contraste status badges | A11y/Design | MED | 4 | 2 | DEB-006 | @ux-design-expert |

\* Esforco incluido em DEB-007

**Nota:** Na matriz acima, os novos debitos dos especialistas receberam IDs sequenciais definitivos: DEB-DB-NEW-001 -> DEB-044, DEB-DB-NEW-002 -> DEB-045, DEB-UX-NEW-001 -> DEB-046, DEB-UX-NEW-002 -> DEB-047, DEB-UX-NEW-003 -> DEB-048.

---

## Plano de Execucao (4 Sprints)

### Sprint 1: Security & Critical (Semana 1-2)

**Objetivo:** Eliminar riscos de seguranca e gaps criticos de observabilidade.

**Debitos:**
- DEB-003: OpenAI key rotation (1h)
- DEB-001: tenant_id NOT NULL em 10 tabelas (5h)
- DEB-002: API keys hashing + tenant scoping (4h)
- DEB-005: Index whatsapp_messages (tenant_id, lead_id) (1h)
- DEB-011: Sentry config Vercel (1h)
- DEB-012: Edge Functions deploy list — 14 funcoes (3h)

**Horas totais:** 15h

**Criterios de Sucesso:**
- 0 tabelas com tenant_id nullable em colunas core
- `INSERT INTO api_keys (...) SELECT key_value` retorna hashes, nao plaintext
- `validar_api_key()` funciona com novo schema (hash+salt)
- OpenAI assistente funcional apos rotacao
- Sentry recebendo erros de producao com source maps
- `curl /functions/v1/{fn}` retorna 200/401 (nao 404) para todas as 14 funcoes

**Rollback:**
- DEB-001: Reverter migracao (ALTER COLUMN DROP NOT NULL). Manter tabela `_orphaned_*` por 30 dias.
- DEB-002: Manter `validar_api_key_v1()` em paralelo por 1 sprint.
- DEB-012: Revert do `deploy-production.yml` se funcoes causarem erros.

**Sequencia critica:**
1. DEB-003 (independente, fazer primeiro)
2. DEB-012 (desbloqueia Sprint 2)
3. DEB-011 (independente)
4. DEB-005 (independente, quick win)
5. DEB-001 (auditoria de Edge Functions INSERTs -> backfill -> ALTER NOT NULL)
6. DEB-002 (depende de DEB-001)

---

### Sprint 2: Data Integrity & Design System (Semana 3-4)

**Objetivo:** Completar cadeia de criptografia, alinhar design system, iniciar a11y.

**Debitos:**
- DEB-004: OAuth tokens encryption (4h)
- DEB-044: configuracoes_integracoes api_key encrypt (3h)
- DEB-010: CHECK constraints em status columns (4h)
- DEB-006: STATUS_COLORS centralizado (4h)
- DEB-048: Contraste de cores em status badges (4h)
- DEB-009: Skip-to-content (4h)
- DEB-046: aria-live em feedback dinamico (6h)
- DEB-008: Keyboard navigation (16h)
- DEB-018: Indexes crm_followups complementares (1h)

**Horas totais:** 46h

**Criterios de Sucesso:**
- `SELECT access_token FROM google_calendar_tokens` retorna ciphertext
- `SELECT api_key FROM configuracoes_integracoes` retorna ciphertext
- `INSERT INTO leads (status) VALUES ('invalido')` falha (constraint violation)
- STATUS_COLORS definido em 1 arquivo (source of truth)
- Skip-to-content visivel ao Tab na pagina
- `aria-live` em FormMessage e listas filtraveis
- Tab navigation completa em ContatosTable, KanbanOperacional

**Rollback:**
- DEB-004/DEB-044: Manter leitura dual (plaintext fallback + ciphertext) por 1 sprint.
- DEB-010: DROP CONSTRAINT se valores invalidos detectados em producao.
- DEB-006: Feature flag para rollback para STATUS_COLORS locais.

**Paralelizacao:**
- Backend (1 dev): DEB-004 + DEB-044 (criptografia) + DEB-010 + DEB-018
- Frontend (1 dev): DEB-006 + DEB-048 + DEB-009 + DEB-046 + DEB-008

---

### Sprint 3: Normalization, UX & Compliance (Semana 5-6)

**Objetivo:** Normalizar dados duplicados, melhorar consistencia UX, compliance LGPD.

**Debitos:**
- DEB-024: Tabelas responsivas (20h)
- DEB-014: Consolidar content/message_text (3h)
- DEB-013: Consolidar tag systems (6h)
- DEB-017: Fix N+1 assistant (2h)
- DEB-019: Retention policy logs (3h)
- DEB-045: PII redaction em agent_ai_logs (4h)
- DEB-020: Query key factory (8h)
- DEB-022: supabaseUntyped (4h)
- DEB-015: Soft-delete consistente (8h)
- DEB-023: EmptyState adocao (8h)
- DEB-025: Draft persistence em 5 formularios (8h)
- DEB-027: Hardcoded colors -> tokens (8h)
- DEB-042: Breadcrumbs interativos (2h)
- DEB-029: Rate limiting consolidacao (4h)
- DEB-030: Scores duplicados (2h)
- DEB-033: responsavel text duplicado (2h)

**Horas totais:** 92h

**Criterios de Sucesso:**
- 1 sistema de tags unico (`tags`/`lead_tags`)
- `whatsapp_messages` sem coluna `message_text`
- `soft_delete` policy em 5 tabelas core
- PII redacted em novos registros de `agent_ai_logs`
- 30/30 features usando `EmptyState`
- 6/15 formularios com draft persistence
- 0 hardcoded `gray-*` classes
- Tabelas usaveis em mobile (card view < 768px)
- Breadcrumbs clicaveis

**Rollback:**
- DEB-013: Manter `crm_tags` read-only por 1 sprint apos migracao. Feature flag.
- DEB-014: Coalesce antes do drop: `UPDATE SET content = COALESCE(content, message_text)`.
- DEB-024: Responsive e aditivo, sem rollback necessario.

**Paralelizacao:**
- Backend DB (1 dev): DEB-014, DEB-013, DEB-017, DEB-019, DEB-045, DEB-015, DEB-030, DEB-033, DEB-029
- Frontend (1 dev): DEB-024, DEB-023, DEB-025, DEB-027, DEB-042
- Full-stack (overlap): DEB-020, DEB-022

---

### Sprint 4: Tech Debt & Polish (Semana 7-8)

**Objetivo:** Performance, bundle, estado do codigo, e debitos restantes.

**Debitos:**
- DEB-007: i18n migration incremental — sidebar/titles (2h de 40h total)
- DEB-016: leads column projection (2h)
- DEB-021: Supabase calls diretas -> hooks (12h)
- DEB-026: React.memo em componentes de lista (6h)
- DEB-028: Virtual scrolling (12h)
- DEB-031: FKs tabelas utilitarias (3h)
- DEB-032: Naming convention ADR (1h)
- DEB-035: Normalize patterns (6h)
- DEB-036: Sentry bundle optimization (4h)
- DEB-037: Recharts bundle optimization (3h)
- DEB-039: Capacitor vulns monitoring (2h)
- DEB-040: services/ decisao (0h)
- DEB-041: Reduced motion (2h)
- DEB-043: Error handling patterns (6h)
- DEB-047: ErrorState adocao (4h)

**Horas totais:** 65h (+ 38h restantes de DEB-007 para sprints futuros)

**Criterios de Sucesso:**
- ContatosTable renderiza 1000 leads < 32ms (30fps)
- Virtual scrolling em 4+ listas
- Sentry chunk < 200KB
- Build time < 25s (nao degradar)
- `reduced-motion` media query ativa
- ErrorState adotado em 15+ features com queries

**Rollback:**
- DEB-028: Virtual scrolling e aditivo, pode ser desativado por feature flag.
- DEB-021: Migracao incremental, sem rollback global necessario.

---

## Dependencias entre Debitos

```
LEGENDA: A --> B significa "A deve ser resolvido antes de B"

=== Cadeia Critica de Seguranca ===
DEB-012 (Edge Functions deploy) --> DEB-004 (OAuth encrypt)
DEB-012 (Edge Functions deploy) --> DEB-044 (config api_key encrypt)
DEB-001 (tenant_id NOT NULL) --> DEB-002 (API keys hash + tenant)
DEB-001 (tenant_id NOT NULL) --> DEB-044 (config api_key encrypt)
DEB-001 (tenant_id NOT NULL) --> DEB-016 (leads extraction)
DEB-001 (tenant_id NOT NULL) --> DEB-034 (partitioning)

=== Cadeia de Performance DB ===
DEB-019 (retention policy) --> DEB-034 (partitioning)
DEB-005 (indexes whatsapp) --> DEB-034 (partitioning)

=== Cadeia de Design System ===
DEB-006 (STATUS_COLORS central) --> DEB-027 (hardcoded colors)
DEB-006 (STATUS_COLORS central) --> DEB-048 (contraste badges)
DEB-010 (CHECK constraints) <--> DEB-006 (valores alinhados)

=== Cadeia de Acessibilidade ===
DEB-009 (skip-to-content) --> DEB-008 (keyboard nav)

=== Cadeia de Performance Frontend ===
DEB-026 (React.memo) --> DEB-028 (virtual scrolling)

=== Cadeia de Normalizacao DB ===
DEB-030 (scores duplicados) --> DEB-016 (leads extraction)

=== Cadeia de State Management ===
DEB-020 (query key factory) --> DEB-021 (supabase calls diretas)
DEB-020 (query key factory) --> DEB-035 (normalize patterns)

=== Cadeia de Observabilidade ===
DEB-011 (Sentry config) --> DEB-036 (Sentry bundle)

=== Cadeia de UX Consistency ===
DEB-023 (EmptyState) --> DEB-043 (error handling)
DEB-043 (error handling) --> DEB-047 (ErrorState adocao)

=== Cadeia de Compliance ===
DEB-019 (retention policy) + DEB-045 (PII redaction) -- paralelizaveis
DEB-015 (soft-delete) -- independente mas complementar a LGPD
```

---

## Caminho Critico

A sequencia que determina o timeline minimo:

```
Sprint 1:  DEB-012 (3h) --> Sprint 2: DEB-004 (4h) + DEB-044 (3h)
           DEB-001 (5h) --> DEB-002 (4h) --> Sprint 2: DEB-044 (3h)

Sprint 2:  DEB-006 (4h) --> Sprint 3: DEB-027 (8h)
           DEB-009 (4h) --> DEB-008 (16h)

Sprint 3:  DEB-020 (8h) --> Sprint 4: DEB-021 (12h)
           DEB-026 (6h) --> Sprint 4: DEB-028 (12h)
```

**Timeline minimo com 2 devs paralelos:** ~6 semanas (Sprints 1-3 cobrem todos os P0, P1 e maioria dos P2). Sprint 4 e polish.

**Gargalo do caminho critico:** Sprint 2 tem 46h de trabalho. Com 2 devs em paralelo (backend + frontend), reduz para ~23h efetivas (~3 dias de trabalho intenso por dev).

---

## Oportunidades de Paralelizacao

| Grupo Paralelo | Dev | Debitos | Horas |
|----------------|-----|---------|-------|
| **Seguranca DB** | Backend | DEB-001 -> DEB-002 -> DEB-044 -> DEB-004 | 16h seq |
| **Quick wins DB** | Backend (paralelo) | DEB-005, DEB-018, DEB-017 | 4h |
| **Design System** | Frontend | DEB-006 -> DEB-027, DEB-048 | 16h |
| **Acessibilidade** | Frontend | DEB-009 -> DEB-008, DEB-046 | 26h |
| **Normalizacao DB** | Backend | DEB-014, DEB-013, DEB-030, DEB-033, DEB-015 | 21h |
| **UX Consistency** | Frontend | DEB-023, DEB-025, DEB-042, DEB-024 | 38h |
| **Performance FE** | Frontend | DEB-026 -> DEB-028 | 18h |
| **Observabilidade** | DevOps | DEB-011, DEB-012 | 4h |
| **Compliance** | Backend | DEB-045, DEB-019, DEB-029 | 11h |
| **State Management** | Full-stack | DEB-020 -> DEB-021, DEB-022, DEB-035 | 30h |

**Capacidade ideal:** 2 devs (1 backend + 1 frontend) podem executar Sprints 1-3 em paralelo, reduzindo timeline de 8 semanas para ~6 semanas.

---

## Riscos e Mitigacoes

| # | Risco | Probabilidade | Impacto | Mitigacao | Debitos Relacionados |
|---|-------|---------------|---------|-----------|---------------------|
| 1 | Vazamento de dados entre tenants | Media | Critico | Cadeia de seguranca Sprint 1 (DEB-001/002). Verificar storage bucket policies. | DEB-001, DEB-002, DEB-044 |
| 2 | Credenciais expostas em breach | Media | Critico | 4 tipos de credenciais em plaintext. Resolver atomicamente Sprints 1-2. | DEB-002, DEB-003, DEB-004, DEB-044 |
| 3 | Deploy de encrypt/decrypt bloqueado | Alta | Alto | `encrypt-data`/`decrypt-data` ausentes do deploy. Resolver em Sprint 1 (DEB-012) antes de qualquer criptografia. | DEB-012, DEB-004, DEB-044 |
| 4 | Regressao em migracao tenant_id NOT NULL | Media | Alto | Auditar INSERTs em Edge Functions. Funcoes ausentes do deploy podem ter INSERTs sem tenant_id. | DEB-001, DEB-012 |
| 5 | LGPD compliance gap em AI logs | Media | Alto | Dados legais confidenciais em plaintext. Critico para sigilo profissional (Art. 34 OAB). | DEB-045, DEB-019, DEB-015 |
| 6 | Mobile readiness prematura | Baixa | Medio | Capacitor configurado mas tabelas nao responsivas. Publicacao prematura causaria avaliacoes negativas. | DEB-024, DEB-008, DEB-028 |
| 7 | Observabilidade incompleta | Media | Medio | Sentry nao configurado + funcoes nao deploiadas = pontos cegos duplos. | DEB-011, DEB-012 |
| 8 | Tags unification regressao | Media | Medio | Multiplos componentes frontend usam sistemas diferentes. Feature flag obrigatorio. | DEB-013 |

---

## Gaps Conhecidos (do QA Review)

1. **Realtime channels** — nao avaliados na analise de debitos. O codebase tem 14 arquivos usando Realtime/RealtimeChannel. A correcao de memory leaks na v1.2 (ref-based) mitiga o risco principal. Considerar adicionar como debito LOW se houver relatos de desconexoes.

2. **Storage bucket policies** — nao auditados. Upload de documentos (`UploadDocumentoForm`, `UploadContratos`) e media (`media-processor`) existem, mas nao ha avaliacao de validacao MIME, limites de tamanho por tenant, ou se buckets filtram por tenant_id. Gap de seguranca potencial similar a DEB-001.

3. **Webhook signature validation** — nao verificado formalmente. `whatsapp-webhook` e `stripe-webhook` recebem webhooks externos. A auditoria v1.2 abordou HMAC, mas nao ha debito formal com cobertura completa.

4. **Recomendacao:** Avaliar estes 3 gaps como quick-check no Sprint 1 (~2h total). Se gaps reais forem encontrados, adicionar como debitos ao backlog.

---

## Decisoes Arquiteturais Definitivas

As seguintes decisoes foram validadas por especialistas e sao definitivas:

| Decisao | Fonte | Detalhes |
|---------|-------|---------|
| Tag system: manter `tags`/`lead_tags` | @data-engineer | Sistema mais feature-rich (categoria, cor, ordem). Migrar `crm_tags` -> `tags`, eliminar `leads.tags[]`. |
| Soft-delete: `deleted_at timestamptz` + manter `ativo` | @data-engineer | Semantica separada: `ativo=false` = desabilitado, `deleted_at` = removido. LGPD Art. 15 compliance. |
| API key hash: SHA-256 com salt | @data-engineer | Keys com alta entropia, bcrypt desnecessario. `key_prefix` (8 chars) para identificacao visual. |
| leads extraction: adiar para v1.4 | @data-engineer | Column projection (2h) resolve 80% com 15% do esforco. Satellite tables so quando >50K rows. |
| exec_sql(): remover de producao | @data-engineer | Risco SQL injection via admin. Usado apenas em scripts de dev. Manter em desenvolvimento apenas. |
| legal_knowledge: adicionar tenant_id | @data-engineer | Separacao public/private via `source_type`. RLS: usuarios veem docs do tenant + publicos. |
| Partitioning: adiar | @data-engineer | Monitorar com pg_cron. Thresholds definidos (250K/100K/500K rows). |
| STATUS_COLORS: alinhar com CHECK constraints | @ux-design-expert | Frontend reflete valores validos do banco. CSS custom properties por tema. |
| Mobile tables: abordagem hibrida 3 niveis | @ux-design-expert | Desktop (tabela), tablet (overflow-x-auto), mobile (card view). |
| i18n: abordagem incremental | @ux-design-expert | Sidebar/titles agora, componentes ao tocar, sprint dedicado quando expansao confirmada. |

---

## Criterios de Sucesso Globais

| Metrica | Antes | Meta | Como Medir |
|---------|-------|------|-----------|
| Tabelas com tenant_id nullable | 10 | 0 | `SELECT table_name FROM information_schema.columns WHERE column_name='tenant_id' AND is_nullable='YES'` |
| Credenciais em plaintext | 4 tipos | 0 | Auditoria de colunas que armazenam keys/tokens |
| Edge Functions no deploy | ~18 de 32 | 32 de 32 | Comparar dirs em `supabase/functions/` com `deploy-production.yml` |
| Sentry funcional | Nao | Sim | Verificar events no Sentry dashboard |
| STATUS_COLORS definicoes | 8 arquivos | 1 arquivo | `grep -r "STATUS_COLORS\|statusColors" src/ \| wc -l` |
| WCAG 2.1 Level A | ~30% | 80%+ | axe-core audit |
| aria-live occurrences | 2 | 20+ | `grep -r "aria-live" src/ \| wc -l` |
| EmptyState adocao | 5/30 | 30/30 | Grep por import de EmptyState |
| Forms com draft persistence | 1/15 | 6/15 | Grep por useDraftPersistence |
| Hardcoded gray classes | 33 | 0 | `grep -r "text-gray\|bg-gray" src/ \| wc -l` |
| Virtual scrolling adocao | 1 componente | 4+ | Grep por useVirtualizer |
| Build time | ~21s | <25s | `time npm run build` |
| Assessment score | 82/100 (DB) | 95/100 (DB) | Re-executar DB-AUDIT |

---

## Testes Requeridos (do QA Review)

### Testes Antes da Resolucao (Safety Net)

| Area | Teste | Tipo | Prioridade |
|------|-------|------|------------|
| DEB-001 | Snapshot de queries com tenant_id em Edge Functions | Integration | P0 |
| DEB-001 | INSERT sem tenant_id em cada tabela (deve falhar pos-fix) | Integration | P0 |
| DEB-002 | Teste de `validar_api_key()` com key existente (baseline) | Integration | P0 |
| DEB-004 | Teste de `useGoogleCalendar` lendo tokens (baseline pre-encrypt) | Integration | P1 |
| DEB-006 | Snapshot visual de badges por feature (pre/post) | Visual regression | P1 |
| DEB-010 | `SELECT DISTINCT status FROM {table}` para cada tabela | SQL | P1 |
| DEB-013 | Backup dados `crm_tags`/`crm_lead_tags` antes da migracao | Data | P2 |

### Testes de Validacao Pos-Fix

| Debito | Criterio de Aceite |
|--------|-------------------|
| DEB-001 | INSERT com NULL tenant_id retorna constraint violation em todas as 10 tabelas |
| DEB-002 | Nenhuma key legivel no banco; `validar_api_key()` retorna true para key correta |
| DEB-003 | Assistente IA funcional apos rotacao |
| DEB-004 | Tokens ilegiveis no banco; calendario funcional |
| DEB-006 | Badge "novo_lead" com mesma cor em todas as features |
| DEB-008 | Tab navigation completa em ContatosTable, KanbanOperacional |
| DEB-009 | Skip-to-content visivel ao Tab, foco move para main |
| DEB-010 | INSERT com status invalido falha |
| DEB-012 | `curl /functions/v1/{fn}` retorna 200/401 para cada funcao (nao 404) |
| DEB-044 | `configuracoes_integracoes.api_key` retorna ciphertext; integracoes funcionais |
| DEB-045 | `agent_ai_logs.user_prompt` sem CPF/nomes legiveis |

### Benchmarks de Performance

| Metrica | Valor Atual | Meta | Como Medir |
|---------|-------------|------|-----------|
| whatsapp_messages query (500 msgs) | Nao medido | <100ms | `EXPLAIN ANALYZE` |
| crm_followups queue query | Nao medido | <50ms | `EXPLAIN ANALYZE` |
| ContatosTable render (200 leads) | Nao medido | <16ms (60fps) | React DevTools Profiler |
| ContatosTable render (1000 leads) | Nao medido | <32ms (30fps) | React DevTools Profiler |
| Initial bundle size (JS) | ~2.5MB | <2MB | `du -sh dist/assets/*.js` |
| Sentry chunk | ~445KB | <200KB | Vite bundle analyzer |
| Build time | ~21s | <25s | `time npm run build` |

---

## Historico de Validacao

| Fase | Agente | Data | Resultado |
|------|--------|------|-----------|
| Phase 1 | @architect | 2026-04-03 | 13 debitos sistema |
| Phase 2 | @data-engineer | 2026-04-03 | 17 debitos DB, score 82/100 |
| Phase 3 | @ux-design-expert | 2026-04-03 | 13 debitos UX, saude 7/10 |
| Phase 4 | @architect | 2026-04-03 | DRAFT consolidado (43 debitos, ~298h) |
| Phase 5 | @data-engineer | 2026-04-03 | Validacao DB: +2 debitos, 3 ajustes severidade, 8 perguntas respondidas, ~72h DB |
| Phase 6 | @ux-design-expert | 2026-04-03 | Validacao UX: +3 debitos, 3 ajustes severidade, 7 perguntas respondidas, ~150h UX |
| Phase 7 | @qa | 2026-04-03 | QA Gate: APPROVED (4 gaps menores, 1 condicao atendida neste documento) |
| Phase 8 | @architect | 2026-04-03 | Assessment FINAL: 48 debitos, ~321h, todas as revisoes incorporadas |

---

*Documento gerado por @architect (Aria) durante Brownfield Discovery Phase 8 — Consolidacao Final.*
*Proximo: @analyst (Phase 9 — Executive Report), @pm (Phase 10 — Epic + Stories).*
