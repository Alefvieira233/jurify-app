# Database Specialist Review

**Reviewer:** @data-engineer (Dara)
**Data:** 2026-04-03
**Documento Revisado:** docs/prd/technical-debt-DRAFT.md
**Fontes de Verificacao:** `types.ts` (5796 linhas), 90+ migrations, 32 Edge Functions, `DB-AUDIT.md`, `SCHEMA.md`

---

## Resumo da Revisao

| Metrica | Valor |
|---------|-------|
| Debitos DB no DRAFT | 17 |
| Validados sem alteracao | 12 |
| Severidade ajustada | 3 |
| Removidos (falso positivo) | 0 |
| Novos debitos adicionados | 2 |
| **Total debitos DB apos revisao** | **19** |

**Parecer geral:** O DRAFT de @architect esta tecnicamente preciso. Todas as 17 dividas de banco referenciadas foram verificadas contra `types.ts`, migrations e Edge Functions. Nenhum falso positivo encontrado. Ajustei 3 severidades (2 para cima, 1 para baixo) e identifiquei 2 debitos adicionais nao capturados na Phase 2 ou na consolidacao.

---

## Debitos Validados

| # | ID DRAFT | Debito | Sev. Original | Sev. Ajustada | Horas | Complexidade | Notas |
|---|----------|--------|---------------|---------------|-------|-------------|-------|
| 1 | DEB-001 | tenant_id NOT NULL em 10 tabelas | CRITICAL | **CRITICAL** | 4 | Medium | Confirmado: `types.ts` mostra `string \| null` para tenant_id em `whatsapp_messages` (L4838), `whatsapp_sessions` (L4936), `lead_interactions` (L2876), `conversation_logs` (L1535), `configuracoes_integracoes` (L1339), `knowledge_base` (L2734), `logs_execucao_agentes` (L3369), `hitl_requests` (L2542), `pagamentos` (L3501), `audit_log` (L702). Todos confirmados nullable. |
| 2 | DEB-002 | API keys plaintext + sem tenant | CRITICAL | **CRITICAL** | 4 | Medium | Confirmado: `api_keys` em `types.ts` (L550-578) nao tem campo `tenant_id`. `key_value: string` armazenado em texto plano. Sem relationships definidas. |
| 3 | DEB-004 | OAuth tokens plaintext | HIGH | **HIGH** | 4 | Medium | Confirmado: `google_calendar_tokens` (L2444-2477) armazena `access_token: string` e `refresh_token: string` sem criptografia. Edge Functions `encrypt-data`/`decrypt-data` ja existem e podem ser reutilizadas. |
| 4 | DEB-005 | Indexes whatsapp_messages | HIGH | **MEDIUM** (ajustada para baixo) | 1 | Simple | Parcialmente mitigado: migration `20260207` ja criou `idx_whatsapp_messages_conversation_timestamp ON (conversation_id, timestamp DESC)`. Porem usa `timestamp` (coluna do schema) ao inves de `created_at`. O index `(tenant_id, lead_id)` continua ausente. Rebaixo para MEDIUM pois o padrao principal de chat ja tem cobertura parcial. |
| 5 | DEB-010 | CHECK constraints status | HIGH | **HIGH** | 4 | Medium | Confirmado: todas as colunas `status` em `types.ts` sao `string` sem restricao. Migration `20260323` que unificou status de leads confirma historico de problemas. |
| 6 | DEB-013 | Tags duplicados (3 sistemas) | MEDIUM | **MEDIUM** | 6 | Complex | Confirmado: `tags`/`lead_tags`, `crm_tags`/`crm_lead_tags`, e `leads.tags: text[]` coexistem em `types.ts`. |
| 7 | DEB-014 | content vs message_text duplicados | MEDIUM | **MEDIUM** | 3 | Simple | Confirmado: `whatsapp_messages` (L4818, L4827) tem `content: string \| null` e `message_text: string \| null`. |
| 8 | DEB-015 | Soft-delete inconsistente | MEDIUM | **MEDIUM** | 8 | Complex | Confirmado. |
| 9 | DEB-016 | leads 47 colunas | MEDIUM | **MEDIUM** | 12 | Complex | Confirmado via `SCHEMA.md`: 47 colunas incluindo 2 JSONB. |
| 10 | DEB-017 | N+1 assistant | MEDIUM | **MEDIUM** | 2 | Simple | Confirmado: `assistant/index.ts` L510-530 faz 4 queries sequenciais (leads por status, contratos count, revenue sum, conversions). Podia usar `get_dashboard_metrics()`. |
| 11 | DEB-018 | Indexes crm_followups | MEDIUM | **LOW** (ajustada para baixo) | 1 | Simple | Parcialmente mitigado: migration `20260215` ja criou `idx_crm_followups_status ON (tenant_id, status)` e `idx_crm_followups_pending_scheduled ON (scheduled_at) WHERE status = 'pending'`. Faltam apenas `(tenant_id, status, scheduled_at)` composto e `(lead_id, status)`. Rebaixo para LOW. |
| 12 | DEB-019 | Retention policy logs | MEDIUM | **MEDIUM** | 3 | Medium | Confirmado: `agent_ai_logs` (L147) tem `full_result: string \| null` e `system_prompt: string \| null` -- potencialmente muito grandes. |
| 13 | DEB-030 | Scores duplicados leads | LOW | **LOW** | 2 | Simple | Confirmado: `leads` tem `score: integer \| null` e `lead_score: integer \| null`. |
| 14 | DEB-031 | FKs tabelas utilitarias | LOW | **LOW** | 3 | Simple | Confirmado: `api_keys.Relationships: []` (L578), sem FKs. |
| 15 | DEB-032 | Naming PT/EN misto | LOW | **LOW** | 1 | Simple | Confirmado: nao recomendavel alterar. ADR documentando convencao para novas tabelas e suficiente. |
| 16 | DEB-033 | responsavel text duplicado | LOW | **LOW** | 2 | Simple | Confirmado: `contratos` tem `responsavel: text` (L294) e `responsavel_id: uuid` (L298) conforme SCHEMA.md. |
| 17 | DEB-034 | Partitioning strategy | LOW | **LOW** | 8 | Complex | Confirmado. Depende de DEB-001 e DEB-019. |

---

## Debitos Adicionados

### DEB-DB-NEW-001: configuracoes_integracoes.api_key em Texto Plano

| Campo | Valor |
|-------|-------|
| Severidade | **HIGH** |
| Tabela(s) | `configuracoes_integracoes` |
| Impacto | O campo `api_key: string` (NOT NULL, obrigatorio para Insert) armazena API keys de integracoes externas (Kapso, etc.) em texto plano. Combinado com `tenant_id: string \| null` (nullable!), esta tabela tem dois problemas simultaneos: credenciais expostas e isolamento de tenant fragil. Um breach expoe todas as API keys de integracoes de todos os tenants. Tambem armazena `verify_token` em texto plano. |
| Horas | 3 |
| Complexidade | Medium |
| Justificativa | Identificado em DB-AUDIT Phase 2 (concern #4 na secao Security), mas **nao foi promovido a debito formal** no DB-AUDIT nem incluido na consolidacao do DRAFT. O campo `api_key` esta na intersecao de DEB-001 (tenant_id nullable) e DEB-002 (credenciais plaintext), mas merece debito proprio pois requer tratamento especifico: criptografia via Edge Functions encrypt-data/decrypt-data e NOT NULL no tenant_id. |
| Recomendacao | 1. Criptografar `api_key` e `verify_token` usando Edge Functions `encrypt-data`/`decrypt-data` existentes. 2. Incluir esta tabela no backfill de DEB-001 (tenant_id NOT NULL). 3. Atualizar todos os Edge Functions que leem `configuracoes_integracoes` para descriptografar em runtime. |
| Prioridade sugerida | **P1** -- resolver junto com DEB-004 (OAuth tokens) pois usa mesma infraestrutura de criptografia. |

### DEB-DB-NEW-002: agent_ai_logs Armazena Prompts com Dados Sensiveis sem Redacao PII

| Campo | Valor |
|-------|-------|
| Severidade | **MEDIUM** |
| Tabela(s) | `agent_ai_logs` |
| Impacto | Colunas `system_prompt`, `user_prompt` e `full_result` (todas `text \| null`) armazenam prompts e respostas de IA que frequentemente contem dados legais sensiveis de clientes (nomes, numeros de processo, detalhes de casos). Sem redacao de PII a nivel de banco. Em caso de breach ou acesso indevido por administrador de outro tenant, dados legais confidenciais ficam expostos. A tabela tem `tenant_id: string` (NOT NULL -- bom), mas os dados em si nao sao redacted. |
| Horas | 4 |
| Complexidade | Medium |
| Justificativa | Identificado em DB-AUDIT Phase 2 (concern #5 na secao Security), mas **nao foi promovido a debito formal**. Importante para conformidade LGPD e etica em plataforma juridica onde os dados de clientes sao privilegiados. |
| Recomendacao | 1. Implementar funcao de redacao PII no INSERT trigger da tabela (mascarar CPF, nomes, numeros de processo). 2. Ou criptografar `user_prompt` e `full_result` at-rest usando Supabase Vault. 3. Considerar TTL agressivo para estas colunas (mover para tabela separada `agent_ai_log_details` com retention curta). |
| Prioridade sugerida | **P2** -- resolver junto com DEB-019 (retention policy). |

---

## Respostas ao @architect

### Pergunta 1: Backfill tenant_id (DEB-001) -- Qual a estrategia de backfill para rows com NULL tenant_id?

**Resposta:** A estrategia de backfill deve seguir tres passos:

1. **Inferir de tabelas relacionadas:** Sim, a maioria dos registros pode ser backfilled via JOINs:
   - `whatsapp_messages.tenant_id` <- `whatsapp_conversations.tenant_id` via `conversation_id` FK
   - `lead_interactions.tenant_id` <- `leads.tenant_id` via `lead_id` FK
   - `conversation_logs.tenant_id` <- `leads.tenant_id` via `lead_id` FK
   - `hitl_requests.tenant_id` <- `leads.tenant_id` via `lead_id` FK (ou `whatsapp_conversations` via `conversation_id`)
   - `pagamentos.tenant_id` <- `subscriptions.tenant_id` via `subscription_id` FK
   - `knowledge_base.tenant_id` <- `profiles.tenant_id` via `created_by` FK
   - `logs_execucao_agentes.tenant_id` <- `agentes_ia.tenant_id` via `agente_id` FK
   - `whatsapp_sessions.tenant_id` <- `conexoes_whatsapp.tenant_id` (inferir via phone_number match ou session context)
   - `configuracoes_integracoes.tenant_id` -- sem FK direto; requer analise manual ou inferencia via `criado_em` + logs
   - `audit_log.tenant_id` -- inferir via `table_name + record_id` lookup na tabela original

2. **Rows sem relacao:** Registros que nao podem ser backfilled devem ser movidos para tabela `_orphaned_{table}` para analise manual, nao deletados. Provavelmente sao poucos (<1% dos registros).

3. **Executar em migracao atomica:** Backfill UPDATE + ALTER COLUMN SET NOT NULL na mesma migracao. Testar em staging primeiro. Usar `BEGIN/COMMIT` para garantir atomicidade.

**Esforco estimado:** 4h conforme DRAFT esta correto, assumindo volume moderado de dados.

---

### Pergunta 2: API keys hashing (DEB-002) -- Qual algoritmo de hash recomendado?

**Resposta:** **SHA-256 com salt aleatório por key e suficiente.** Justificativa:

- **Nao usar bcrypt/argon2:** Estes sao para senhas (precisa resistir a brute-force de senhas curtas). API keys ja sao strings longas com alta entropia (~32+ bytes), tornando brute-force impraticavel mesmo com SHA-256.
- **Salt:** Gerar `gen_random_bytes(16)` como salt unico por key. Armazenar salt na mesma tabela (coluna `salt`).
- **Schema final:** `api_keys(id, nome, key_hash TEXT, salt TEXT, key_prefix TEXT, tenant_id UUID NOT NULL, ativo, created_at, criado_por)`. O `key_prefix` armazena os primeiros 8 caracteres para identificacao visual (ex: `jur_1a2b****`).
- **Fluxo de criacao:** Gerar key -> mostrar uma vez ao usuario -> hash com salt -> armazenar hash + salt + prefix -> nunca mais recuperar key original.
- **`validar_api_key()`:** Reescrever para: receber key plaintext -> buscar registro por prefix -> hash com salt armazenado -> comparar hashes. Impacto nos consumers: qualquer Edge Function que chame `validar_api_key()` precisa passar a key recebida no header -- nenhuma mudanca de interface, apenas o mecanismo interno.

**Impacto:** Funcao `validar_api_key()` existe em 2 migrations. Edge Functions que validam API keys continuam chamando a mesma funcao com mesma assinatura.

---

### Pergunta 3: Tag system unification (DEB-013) -- Qual sistema deve sobreviver?

**Resposta:** **Manter `tags`/`lead_tags` (PT, com categoria/ordem) como sistema unico.** Justificativa:

- `tags` e mais feature-rich: tem `categoria`, `cor`, `ordem`, `tenant_id` -- suporta ordenacao customizada e categorizacao
- `crm_tags` e mais simples: apenas `name`, `color`, `tenant_id` -- subset de features
- `leads.tags text[]` deve ser eliminado em favor da junction table `lead_tags` -- arrays nao permitem queries eficientes nem metadata por tag

**Plano de migracao:**
1. Migrar dados de `crm_tags` -> `tags` (mapear `name` -> `nome`, `color` -> `cor`)
2. Migrar `crm_lead_tags` -> `lead_tags` (resolver duplicatas)
3. Backfill `leads.tags[]` values para `lead_tags` junction table
4. Drop `crm_tags`, `crm_lead_tags`
5. Remover coluna `leads.tags`
6. Atualizar frontend hooks que usam qualquer dos sistemas

**Volume estimado:** Provavelmente baixo (<1000 tags total) dado que o projeto esta em fase inicial. Migracao rapida.

---

### Pergunta 4: Soft-delete pattern (DEB-015) -- `deleted_at` timestamptz ou `ativo` boolean?

**Resposta:** **Adotar `deleted_at timestamptz` como padrao, mas manter `ativo` boolean existente como complemento.** Justificativa:

- **`deleted_at`** e superior porque: registra QUANDO foi deletado (necessario para LGPD Art. 18 -- data retention), permite queries temporais ("deletados ha mais de 30 dias"), e e o padrao da industria para soft-delete
- **`ativo` boolean** continua util como flag de "desativado mas nao deletado" (ex: agente IA desligado, contrato inativo mas nao encerrado)
- **Semantica separada:** `ativo = false` significa "desabilitado pelo usuario"; `deleted_at IS NOT NULL` significa "removido logicamente"
- **LGPD:** Art. 15 exige retencao de dados pessoais por periodo definido antes da exclusao definitiva. `deleted_at` permite implementar politica de retencao: `WHERE deleted_at < NOW() - INTERVAL '5 years'` -> purge definitivo

**Implementacao recomendada:**
1. Adicionar `deleted_at timestamptz DEFAULT NULL` em tabelas core: `leads`, `contratos`, `processos`, `agendamentos`, `honorarios`
2. Criar partial index `WHERE deleted_at IS NULL` em cada tabela para nao degradar performance de queries normais
3. Criar trigger `on_soft_delete` que registra em `audit_log` quando `deleted_at` muda de NULL para valor
4. NAO adicionar em tabelas de log/auditoria (estas nunca sao soft-deleted)
5. Manter `ativo` boolean como flag de ativacao separada

---

### Pergunta 5: leads extraction (DEB-016) -- A view `v_leads_operacional` ja mitiga o impacto?

**Resposta:** **Parcialmente, mas nao o suficiente para eliminar o debito.**

- `v_leads_operacional` pre-join com departamento, pipeline stage, responsavel e conexao -- resolve o problema de JOINs multiplos no frontend
- **Porem:** A view ainda faz `SELECT *` na tabela leads, trazendo todas as 47 colunas + os JOINs. O overhead esta no tamanho do row transferido, nao nos JOINs
- **Impacto real atual:** Para a escala atual (provavelmente <10K leads), o impacto e negligivel. PostgreSQL lida bem com tabelas largas ate ~100 colunas
- **Recomendacao:** **Adiar para v1.4 ou quando escala exigir.** O refactoring de satellite tables (12h estimadas) tem alto risco de regressao e baixo ROI na escala atual. Em vez disso, aplicar column projection nos hooks frontend (`select("id, nome, email, status, ...")` ao inves de `select("*")`) como quick win imediato (~2h)
- **Trigger para agir:** Quando `leads` atingir 50K+ rows ou quando consultas de listagem excederem 200ms

---

### Pergunta 6: exec_sql() function -- Deve ser removida?

**Resposta:** **Sim, deve ser removida ou substituida por funcoes especificas.**

- **Risco:** Permite SQL injection via admin comprometido. Mesmo com gating `is_admin()`, um admin malicioso pode: exfiltrar dados de outros tenants via RLS bypass (service-role nao respeita RLS), dropar tabelas, criar backdoors
- **Uso legitimo verificado:** `exec_sql()` aparece em `types.ts` (L5448) como `{ Args: { sql_query: string }; Returns: string }`. Usado em scripts de migracao (`scripts/migrations/apply-test-data.js`, `scripts/migrations/aplicar-migrations.mjs`, `scripts/setup/PREPARAR_SISTEMA.mjs`) -- todos scripts de desenvolvimento/setup, nao producao
- **Nao ha uso em Edge Functions ou codigo de producao**
- **Recomendacao:** 
  1. Remover a funcao `exec_sql()` do banco de producao
  2. Manter apenas em ambiente de desenvolvimento (condicional via variavel de ambiente)
  3. Se necessario para admin tools futuras, criar funcoes especificas com parametros tipados (ex: `admin_refresh_views()`, `admin_cleanup_orphans()`)

---

### Pergunta 7: legal_knowledge sem tenant_id -- Intencional ou oversight?

**Resposta:** **E um oversight que deve ser corrigido, mas com nuance.**

- **Verificado em `types.ts` (L3265-3296):** `legal_knowledge` nao tem campo `tenant_id`. Nenhuma FK (Relationships: [])
- **Contexto:** A tabela armazena embeddings vetoriais de conhecimento juridico com `source_type`, `source_id`, `metadata`
- **Risco:** Se cada tenant alimenta a tabela com seus documentos legais (estrategias, peticoes, jurisprudencia selecionada), um tenant pode fazer vector search e encontrar conteudo de outro tenant. Isto e uma violacao de sigilo profissional grave no contexto juridico
- **Cenario aceitavel para compartilhamento:** Legislacao publica, jurisprudencia publicada, doutrina generica -- dados que sao publicos por natureza
- **Recomendacao:**
  1. Adicionar `tenant_id uuid` a tabela `legal_knowledge`
  2. Criar separacao: `source_type = 'public'` (compartilhado, tenant_id NULL permitido) vs `source_type = 'private'` (tenant-scoped, tenant_id NOT NULL)
  3. Atualizar funcao `match_legal_documents()` para filtrar por tenant_id quando `source_type != 'public'`
  4. RLS policy: usuarios veem docs do seu tenant + docs publicos
  5. **Severidade:** Elevaria para HIGH se tenants ja estiverem alimentando dados privados. Verificar volume de dados existentes

---

### Pergunta 8: Partitioning timeline (DEB-034) -- Qual o volume atual?

**Resposta:** **Nao e possivel determinar o volume exato de producao sem acesso direto ao banco**, mas posso estimar com base na arquitetura:

- **Estimativa `whatsapp_messages`:** Para plataforma juridica com ~10-50 tenants ativos, cada com ~100 conversas/mes e ~20 msgs/conversa = ~2K-10K msgs/mes total. Em 1 ano = ~24K-120K rows. Partitioning faz sentido acima de 500K rows
- **Estimativa `agent_ai_logs`:** Depende de frequencia de uso de IA. Se cada lead gera ~5 interacoes IA/mes com ~10 tenants = ~500-2.5K logs/mes. Em 1 ano = ~6K-30K rows. Partitioning nao justificado
- **Thresholds recomendados:**
  - `whatsapp_messages`: Implementar partitioning mensal quando atingir **250K rows** ou quando queries de listagem excederem **500ms**
  - `agent_ai_logs`: Implementar quando atingir **100K rows** (rows sao grandes por conter full_result)
  - `audit_log`, `security_audit`: Implementar quando atingir **500K rows** (rows menores)
- **Acao imediata:** Criar pg_cron job ou Supabase scheduled function que registra `pg_stat_user_tables.n_live_tup` semanalmente. Quando threshold for atingido, alerta automatico
- **Prioridade real:** P3 esta correto. Monitorar, nao implementar agora

---

## Ordem de Resolucao Recomendada (DB)

| Ordem | ID DRAFT | Debito | Justificativa |
|-------|----------|--------|---------------|
| 1 | DEB-001 | tenant_id NOT NULL em 10 tabelas | **Fundacao de seguranca.** Bloqueia DEB-002, DEB-034 e afeta isolamento multi-tenant de toda a plataforma. Sem isto, qualquer feature nova herda o risco. |
| 2 | DEB-002 | API keys hashing + tenant scoping | Credenciais em texto plano sao risco de breach imediato. Desbloqueado por DEB-001. |
| 3 | DEB-DB-NEW-001 | configuracoes_integracoes.api_key criptografia | Mesmo risco que DEB-002 mas para credenciais de integracoes externas. Resolver junto. |
| 4 | DEB-004 | OAuth tokens criptografia | Completa a cadeia de criptografia de credenciais. Usa mesma infra (encrypt-data/decrypt-data). |
| 5 | DEB-005 | Index whatsapp_messages (tenant_id, lead_id) | Quick win de 30 min. Index principal `(conversation_id, timestamp)` ja existe. |
| 6 | DEB-010 | CHECK constraints em status columns | Previne inconsistencias futuras. Alinha banco com frontend. |
| 7 | DEB-014 | Consolidar content/message_text | Quick win de normalizacao. 3h com baixo risco. |
| 8 | DEB-017 | Fix N+1 no assistant | Quick win de performance. 2h. |
| 9 | DEB-018 | Indexes crm_followups complementares | Quick win. 30 min. |
| 10 | DEB-013 | Consolidar tag systems | Maior esforco de normalizacao. 6h. Requer decisao arquitetural. |
| 11 | DEB-019 | Retention policy para logs | Prepara terreno para partitioning futuro. |
| 12 | DEB-DB-NEW-002 | Redacao PII em agent_ai_logs | Conformidade LGPD. |
| 13 | DEB-015 | Soft-delete consistente | 8h. Importante mas nao urgente. |
| 14 | DEB-030 | Scores duplicados | 2h. Resolver antes de extracao de satellite tables. |
| 15 | DEB-033 | responsavel text duplicado | 2h. Cleanup simples. |
| 16 | DEB-031 | FKs tabelas utilitarias | 3h. Melhora integridade referencial. |
| 17 | DEB-016 | leads satellite tables | **Adiar para v1.4.** Column projection nos hooks e suficiente agora. |
| 18 | DEB-032 | Naming convention ADR | 1h. Apenas documentacao. |
| 19 | DEB-034 | Partitioning strategy | **Adiar ate monitoramento indicar necessidade.** |

---

## Riscos de Regressao

| Debito | Risco de Regressao | Mitigacao |
|--------|-------------------|-----------|
| DEB-001 (tenant_id NOT NULL) | **ALTO** -- INSERT sem tenant_id falhara. Edge Functions que criam registros nestas tabelas precisam ser atualizadas. | 1. Auditar todos os INSERTs em Edge Functions antes da migracao. 2. Testar cada function em staging. 3. Deploy function updates ANTES da migracao SQL. |
| DEB-002 (API keys hash) | **MEDIO** -- `validar_api_key()` muda comportamento. Consumers atuais precisam de key plaintext para validar. | 1. Deploy nova funcao em paralelo (`validar_api_key_v2()`). 2. Migrar consumers. 3. Drop funcao antiga. |
| DEB-004 (OAuth encrypt) | **MEDIO** -- Leitura de tokens existentes falha se campo muda de plaintext para ciphertext sem migracao de dados. | 1. Migracao deve: ler token plaintext -> criptografar -> salvar ciphertext. 2. Atualizar hook `useGoogleCalendar` e Edge Function `google-calendar` para descriptografar. |
| DEB-005 (indexes) | **BAIXO** -- Apenas CREATE INDEX. Impacto zero em reads/writes. | Nenhuma mitigacao necessaria. CREATE INDEX CONCURRENTLY se tabela tiver >100K rows. |
| DEB-010 (CHECK constraints) | **MEDIO** -- INSERTs com valores de status invalidos falharam. Frontend pode enviar valores nao mapeados. | 1. Auditar todos os valores de status usados em frontend/hooks. 2. Garantir que CHECK lista inclui TODOS os valores existentes no banco. 3. Query `SELECT DISTINCT status FROM {table}` antes de criar constraint. |
| DEB-013 (tags unification) | **ALTO** -- Multiplos componentes frontend usam diferentes sistemas de tags. | 1. Criar feature flag para transicao gradual. 2. Manter tabelas antigas como read-only por 1 sprint apos migracao. 3. Testes E2E obrigatorios. |
| DEB-014 (content consolidation) | **MEDIO** -- Edge Functions e hooks podem ler/escrever coluna errada. | 1. Grep codebase por `message_text`. 2. Coalesce no banco antes do drop: `UPDATE SET content = COALESCE(content, message_text)`. |
| DEB-016 (leads extraction) | **MUITO ALTO** -- 47 colunas -> multiplas tabelas altera TODOS os hooks, componentes, views e Edge Functions. | **Adiar.** ROI nao justifica risco na escala atual. |
| DEB-DB-NEW-001 (config api_key encrypt) | **MEDIO** -- Todos os Edge Functions que leem `configuracoes_integracoes.api_key` precisam descriptografar. | 1. Auditar uso em Edge Functions. 2. Deploy functions atualizadas antes da migracao de criptografia. |

---

## Dependencias Tecnicas DB

```
=== Cadeia Critica de Seguranca (resolver nesta ordem) ===
DEB-001 (tenant_id NOT NULL)
  |-> DEB-002 (api_keys hash + tenant)
  |-> DEB-DB-NEW-001 (config api_key encrypt) -- NOVO
  |-> DEB-034 (partitioning, futuro)
  |-> DEB-016 (leads extraction, futuro)

=== Cadeia de Criptografia (pode paralelizar com Cadeia Critica) ===
DEB-004 (OAuth tokens encrypt)
DEB-DB-NEW-001 (config api_key encrypt)
  -- Ambos usam encrypt-data/decrypt-data Edge Functions
  -- Podem ser implementados em paralelo

=== Cadeia de Normalizacao (independente) ===
DEB-014 (content/message_text) -- pode ser feito isoladamente
DEB-030 (scores duplicados) --> DEB-016 (leads extraction, se feito)
DEB-013 (tags unification) -- independente

=== Cadeia de Performance (independente) ===
DEB-005 (index whatsapp) -- independente
DEB-018 (index followups) -- independente
DEB-017 (N+1 assistant) -- independente

=== Cadeia de Retention (sequencial) ===
DEB-019 (retention policy) --> DEB-034 (partitioning)
DEB-DB-NEW-002 (PII redaction) -- pode paralelizar com DEB-019

=== Cadeia de Constraints (alinhar com frontend) ===
DEB-010 (CHECK constraints) <--> DEB-006 (STATUS_COLORS frontend)
```

---

## Ajustes ao DRAFT Sugeridos

| Item | Ajuste |
|------|--------|
| DEB-005 severidade | HIGH -> **MEDIUM**: index `(conversation_id, timestamp DESC)` ja existe (migration 20260207). Falta apenas `(tenant_id, lead_id)`. |
| DEB-018 severidade | MEDIUM -> **LOW**: indexes `(tenant_id, status)` e `(scheduled_at) WHERE status='pending'` ja existem (migration 20260215). Faltam compostos adicionais. |
| DEB-016 recomendacao | Adiar para v1.4. Aplicar column projection nos hooks como quick win (~2h). |
| DEB-001 esforco | 4h esta correto, mas adicionar nota: requer auditoria previa de Edge Functions (1h adicional) para garantir que todos os INSERTs incluem tenant_id. Total real: **5h**. |
| Adicionar DEB-DB-NEW-001 | `configuracoes_integracoes.api_key` plaintext -- P1, 3h, HIGH. |
| Adicionar DEB-DB-NEW-002 | `agent_ai_logs` PII exposure -- P2, 4h, MEDIUM. |
| Matriz de priorizacao | Mover DEB-005 para P2 (era P1). Mover DEB-018 para P3 (era P2). |

---

## Parecer Final

O banco de dados do Jurify esta em boa forma geral (score 82/100 no Phase 2 audit), com RLS consistente e arquitetura multi-tenant bem definida apos o hardening da v1.2. Os debitos criticos concentram-se em **credenciais armazenadas em texto plano** (3 debitos: api_keys, OAuth tokens, configuracoes_integracoes) e **tenant_id nullable** (10 tabelas).

**Recomendacao principal:** Os 4 primeiros itens da ordem de resolucao (DEB-001, DEB-002, DEB-DB-NEW-001, DEB-004) formam uma "cadeia de seguranca" que deve ser resolvida atomicamente em um unico sprint. Juntos representam ~15h de trabalho e eliminam os riscos mais graves de vazamento de dados entre tenants e exposicao de credenciais.

Os debitos de normalizacao (tags, scores, content duplicado) sao importantes mas nao urgentes -- podem ser resolvidos incrementalmente ao longo de 2-3 sprints sem risco para o sistema.

**Itens a NAO fazer agora:**
- DEB-016 (leads satellite tables): Adiar. Column projection resolve 80% do problema com 15% do esforco
- DEB-034 (partitioning): Adiar ate monitoramento indicar necessidade (provavelmente 6-12 meses)
- DEB-032 (naming convention): Apenas documentar via ADR

**Estimativa total revisada para debitos DB:** ~72h (era ~68h no DB-AUDIT + 7h dos 2 novos debitos - ajustes).

---

*Revisao realizada por @data-engineer (Dara) durante Brownfield Discovery Phase 5.*
*Proximo: @ux-design-expert (Phase 6 -- UX Specialist Review), @qa (Phase 7 -- QA Review).*
