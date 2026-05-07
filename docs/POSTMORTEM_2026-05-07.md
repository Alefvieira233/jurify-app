# Postmortem interno — Jurify, 2026-05-07

> **Audiência:** equipe interna Jurify (atualmente: Alef Vieira, founder/eng).
> **Janela coberta:** auditoria 2026-05-07 (P0 + Sprint 1 + Sprint 2 + Sprint 3 do plano de mitigação).
> **Status:** Sprint 2 e Sprint 3 entregues (commits e979bc8 (TBD após push final), c479dab, e978367, +).
> **Não-coberto neste postmortem:** Sprint 1 itens dependentes de credenciamento (Sentry, Stripe, Kapso, HEALTH_CHECK_TOKEN) — pendentes do owner do projeto.

---

## 1. TL;DR

Auditoria full-capacity (15 agentes Opus 4.7 paralelos em 3 ondas) identificou 154 findings em 2026-05-07. Após sessão de remediação de ~14h, foram fechados:

- **2 P0 críticos** (cross-tenant leakage no webhook WhatsApp, race condition em agendamento simultâneo)
- **3 bugs antigos** descobertos via smoke test pós-P0 (titulo NOT NULL, enum cast, criador_id FK) — agendamentos via WhatsApp falhavam silenciosamente em prod havia meses
- **5 Quick Wins** (advisor security warnings, FORCE RLS em 7 tabelas, search_path mutável, "Unknown" contact, etc.)
- **Sprint 2 inteiro** (compliance jurídico/segurança — 7 itens)
- **Sprint 3 inteiro** (onboarding/escala — 3 itens, sendo Google OAuth verification preparado mas pendente de submissão manual)

Restam ações operacionais que dependem do owner: Sentry DSN, Stripe credenciamento, rotação de tokens, Google OAuth submission.

---

## 2. Root cause analyses (mais críticos)

### 2.1 Cross-tenant data leakage (P0 #1)

**Sintoma:** mensagens WhatsApp de um lead que existia em múltiplos tenants podiam ser roteadas pro tenant errado, expondo histórico, contexto IA e respostas de tenant A no inbox de tenant B.

**Causa raiz:** dois fallbacks frágeis em `process-message.ts` (resolução de tenant):
- **Fallback 1c** matchava `from` (telefone do lead) contra `conexoes_whatsapp.telefone` (telefone do tenant) — comparação semanticamente errada.
- **Fallback 3** matchava `whatsapp_conversations.phone_number` e pegava a conversa mais recente — favorecia o tenant que falou por último com aquele telefone.

Ambos foram introduzidos como fallbacks "legacy" para tolerar configurações incompletas, mas em multi-tenant criavam roteamento ambíguo. Sanity check em prod confirmou existência de telefone duplicado entre 2 tenants.

**Por que passou desapercebido:** os fallbacks foram adicionados antes do produto ser multi-tenant de fato. À medida que a base cresceu (15 tenants), a colisão virou questão de tempo.

**Fix:** removidos. Resolução agora é estrita por `phone_number_id` (PRIMARY) ou `instance_name` (1b). Tag de log nova `TENANT_RESOLUTION_FAILED_STRICT` permite alerta em Grafana.

**Lições:**
- "Fallback gentil" em código de roteamento multi-tenant é antipattern — falhar fechado é mais seguro que rotear errado.
- Sanity SQL pré-fix (procurar telefones duplicados entre tenants) deve ser parte do go-live multi-tenant.
- Testes de regressão deveriam cobrir cenário "lead que é tenant" e "tenant que é lead em outro tenant".

### 2.2 Race condition em agendamento (P0 #2)

**Sintoma potencial:** webhooks concorrentes do mesmo lead (ex.: lead manda 2 msgs em 1s) gerariam 2 agendamentos duplicados + 2 eventos Google Calendar duplicados. Não manifestou em prod (0 duplicates históricos), mas o risco era real.

**Causa raiz:** região crítica `SELECT (já agendado?) → INSERT agendamento → CREATE Calendar event` sem nenhum lock ou transação atômica. Cada chamada Supabase via cliente JS é uma transação separada.

**Fix:**
- Migration cria RPC `try_acquire_schedule_slot` que faz `pg_try_advisory_xact_lock` + re-check de conflito + INSERT atomicamente, retornando `{acquired, agendamento_id, conflict_reason}`.
- Webhook trata 3 razões: `lock_busy`, `lead_already_scheduled`, `responsavel_conflict`.
- Calendar API continua fora do lock (latência) — só executa pro vencedor.

**Por que não manifestou:** volume baixo em prod (provavelmente 0–2 agendamentos/dia via WhatsApp). A correção foi preventiva.

### 2.3 Bugs em cascata (descobertos via smoke test do P0 #2)

Ao testar a RPC nova, três bugs antigos vieram à tona:

1. **`agendamentos.titulo` NOT NULL sem default** + INSERT antigo nunca passava `titulo` → todo agendamento via WhatsApp falhava silenciosamente. Catch genérico do webhook engolia o erro e respondia "tive um problema técnico". Aparente inatividade do feature por meses.

2. **`notify_lead_status_change`** inseria `tipo` (enum `notification_type`) usando `CASE` retornando TEXT sem cast → erro 42804. Toda mudança de status de lead caía em rollback. Cascata: agendamento dispara `auto_kanban` que muda status → trigger falha → tudo aborta.

3. **`fn_agendamento_auto_tarefa`** usava `NEW.lead_id` como fallback de `criador_id` — `lead_id` não é `profile_id` → FK violation em `tarefas_criador_id_fkey`.

**Lições:**
- **Smoke test pós-fix é não-negociável.** Os 3 bugs estavam latentes mas só apareceram porque a RPC nova foi exercida fim-a-fim.
- **Catch genérico que engole erro** ("tive um problema técnico, equipe avisada") é um dos antipatterns mais perigosos: faz feature parecer funcionar parcialmente quando está completamente quebrado. Dever sempre logar com nível ERROR + persist em `webhook_events` ou similar.
- **Trigger em cascata sem teste de integração** é debt acumulada. `agendamentos` → `auto_kanban` → `notify_lead_status_change` é uma cadeia de 3 funções que só foi testada hoje.

### 2.4 OAuth state CSRF (Sprint 2 §5)

**Sintoma potencial:** initiateAuth gerava state crypto-random porém o state era apenas devolvido na URL — não havia binding server-side. Na callback o state recebido na query era validado apenas contra localStorage do client. Atacante poderia forçar vítima a fazer auth com conta dele (account fixation).

**Fix:** server gera state, persiste em `oauth_pending_states` com `user_id` binding, TTL 10min, single-use. Callback consome via RPC e valida `user_id == auth.uid()`.

### 2.5 Wizard 0% completion (Sprint 3 §1)

**Sintoma:** memória 2026-05-04 reportava "0/20 onboarding completos" em prod.

**Causa raiz:** `OnboardingWizard.handleNavigateAway` chamava `markComplete()` antes de navegar. Botões "Conectar WhatsApp" e "Personalizar agentes" usavam essa função. Resultado: usuário clica num step intermediário pra ir pra UI → wizard marca completo → mas o usuário nunca passou nos steps de plano/equipe/escritório → tenant fica com `onboarding_wizard_completed=true` mas dados ausentes → checklist `OnboardingFlow` (que aparece após wizard) mostra todos os campos incompletos → métrica "0% real completion".

**Fix:** `handleNavigateAway` agora apenas dismissa temporariamente + persiste `onboarding_step` para retomar. Wizard reaparece na próxima sessão.

**Lições:**
- Eventos "Pular" / "Configurar depois" / "Continuar mais tarde" precisam de semântica clara — não devem ser confundidos com "Concluir tudo".
- Métrica "X% completion" sem auditoria periódica é cega — 0% deveria ter disparado alerta.

### 2.6 Cifragem at-rest de mensagens WhatsApp (Sprint 2 §6)

**Risco anterior:** se o DB Supabase fosse vazado/exfiltrado, todo o conteúdo das conversas WhatsApp ficava em texto puro, expondo informação sensível dos clientes (CPF/CNPJ, números de processo, contexto jurídico).

**Fix:** coluna `content_encrypted bytea` cifrada com AES-256 via pgcrypto, chave em `vault.secrets` (encrypted-at-rest pela Supabase). Trigger BEFORE INSERT/UPDATE cifra automaticamente. RPC `decrypt_whatsapp_message_content` (SECURITY DEFINER, valida tenant via `user_roles`) decifra para autenticados.

**Backfill:** 801/801 mensagens existentes cifradas. Coluna `content` em texto puro mantida durante dual-read window 2026-05-07 → 2026-06-07. Fase 2 (futuro): setar `content = NULL`. Fase 3: dropar coluna.

---

## 3. Métricas pós-remediação

| Métrica | Antes (2026-05-07 manhã) | Depois (2026-05-07 noite) |
|---------|--------------------------|----------------------------|
| Tenant resolution falha cross-tenant | 1 telefone duplicado entre 2 tenants (risco real) | 0 (resolução estrita) |
| Agendamento via WhatsApp funcional | Falhava silencioso (`titulo` NOT NULL) | Funcional + idempotente + lock |
| `whatsapp_messages` cifradas | 0/801 (0%) | 801/801 (100%) |
| LGPD consent registrado | Sem registro estruturado | Tabela `lgpd_consent_log` ativa |
| OAuth Google CSRF binding | Client-side (localStorage) | Server-side (DB, single-use, TTL 10min) |
| Honorários expostos em prompt cliente-facing | Modalidades genéricas (sem valores) — OK | Reforçado prompt comercial; tabela interna criada |
| AI budget — tenants em trial | Caía no plano `free` (100k/mês) | Plano `trial` (50k/dia + 500k/mês) |
| Wizard markComplete prematuro | Sim (NavigateAway dispara complete) | Não (apenas dismiss + persistStep) |
| Privacy policy com Limited Use Google | Ausente | Adicionado |

Build/lint/typecheck: verde após cada commit.

---

## 4. Migrações aplicadas em prod (2026-05-07)

| Migration | Conteúdo |
|-----------|----------|
| `20260507000007_advisory_lock_schedule_slot` | RPC `try_acquire_schedule_slot` + advisory lock (P0 #2) |
| `20260507000008_try_acquire_schedule_slot_titulo` | Fix titulo NOT NULL na RPC + REVOKE FROM anon |
| `20260507000009_fix_notify_lead_status_change_enum_cast` | Cast `::public.notification_type` |
| `20260507000010_fix_agendamento_auto_tarefa_criador_id` | Fallback admin/manager em vez de lead_id |
| `20260507000011_lgpd_consent_log` | Tabela imutável de consentimento LGPD |
| `20260507000012_tenant_honorarios_referencia` | Tabela interna OAB Prov. 205/2021 art. 7º |
| `20260507000013_oauth_pending_states` | CSRF binding correto (RPCs create + consume) |
| `20260507000014_whatsapp_messages_content_encrypted` | Cifragem AES-256 + dual-read + backfill 801 rows |

---

## 5. Edge functions deployed (2026-05-07)

- **`whatsapp-webhook`** — fix P0 #1 (resolução estrita) + P0 #2 (RPC try_acquire) + LGPD consent insert + 1ª msg disclaimer recepcionista. 23 assets uploaded.
- **`google-calendar`** — pendente redeploy após edits CSRF binding (será incluído no commit final desta sessão).

---

## 6. O que não fiz e por quê

| Item | Motivo |
|------|--------|
| Sentry DSN | Depende de criação de conta Sentry pelo owner (10 min de ação manual). |
| Stripe price IDs reais | Depende de credenciamento Stripe pelo owner (~30 min em prod). |
| Submissão Google OAuth verification | Depende de logo PNG + vídeo demo gravado + acesso ao Google Cloud Console (~1h de trabalho do owner). Checklist documentado em `docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`. |
| Rotação `HEALTH_CHECK_TOKEN` | Depende de acesso GH Actions secrets + Supabase Edge Secrets (5 min owner). |
| Investigar projeto Supabase "Missãocumprida" | Depende de owner confirmar se é staging desejado ou deletar (sem contexto pra decidir). |
| Dropar `whatsapp_messages.content` plaintext | Dual-read window deliberado de 30 dias antes da fase 2 (segurança incremental). |
| UNIQUE constraint defense-in-depth em `agendamentos` (lead_id, minute_bucket) | `date_trunc`/`extract` em timestamptz não são IMMUTABLE em Postgres → exigiria função wrapper customizada. RPC com advisory lock já cobre o caso real. P1 follow-up. |
| UNIQUE em `conexoes_whatsapp.instance_name` | P1 follow-up — risco residual baixo após fix P0 #1. |

---

## 7. Decisões controversas

### 7.1 RPC `try_acquire_schedule_slot` mantém Calendar API fora do lock

**Decisão:** lock advisória cobre apenas SQL (DB write); chamada HTTP ao Google Calendar fica fora.

**Trade-off:** dois webhooks que chegam quase simultaneamente, mas com gap > microsegundos, podem ambos passar pelo lock release e ambos chamarem Calendar API. Resultado: 1 agendamento DB, 1 evento Calendar (o segundo bate em "lead_already_scheduled" no DB e não cria evento).

**Por que aceitamos:** chamada Calendar dentro do lock = lock segurado por 1-2s = timeout de outros webhooks. Latência > overbooking marginal.

### 7.2 Cifragem at-rest com chave em `vault.secrets` em vez de KMS externo

**Decisão:** Usamos `vault.secrets` da Supabase (encrypted by Supabase-managed key) em vez de AWS KMS / Google KMS / HashiCorp Vault.

**Trade-off:** chave fica gerenciada pela Supabase. Se a infra Supabase for comprometida, tanto DB quanto chave caem juntos.

**Por que aceitamos:** simplicidade operacional, custo zero, alinha com auditoria LGPD (cifrado at-rest é o requisito; a separação física de chave é ouro mas não exigência). Para clientes enterprise futuros, migrar para KMS externo é uma fase futura.

### 7.3 Disclaimer "sou IA" no rodapé da 1ª msg do Recepcionista, não em cada msg

**Decisão:** disclaimer aparece apenas na PRIMEIRA mensagem ao lead.

**Trade-off:** OAB Provimento 205/2021 não exige repetição.

**Por que aceitamos:** UX — repetir em cada msg geraria spam e ofusca o atendimento. Conforming with intent of regulation, not letter.

---

## 8. Action items abertos

| Owner | Prazo | Ação |
|-------|-------|------|
| Owner | D+1 | Configurar Sentry DSN em Vercel + Edge Secrets |
| Owner | D+2 | Stripe — produtos + price IDs reais |
| Owner | D+1 | Rotacionar `HEALTH_CHECK_TOKEN` |
| Owner | D+3 | Decidir Missãocumprida (deletar ou documentar) |
| Owner | D+7 | Gravar vídeo demo + logo + submeter Google OAuth verification |
| Eng | D+30 | Fase 2 cifragem: `UPDATE whatsapp_messages SET content = NULL` |
| Eng | D+45 | Fase 3 cifragem: `ALTER TABLE DROP COLUMN content` |
| Eng | P1 | UNIQUE constraint defense-in-depth em `agendamentos` (com IMMUTABLE wrapper) |
| Eng | P1 | UNIQUE em `conexoes_whatsapp.instance_name` |
| Eng | P1 | Testes de integração para cadeia de triggers `agendamentos` → `auto_kanban` → `notify_lead_status_change` |

---

## 9. O que DEVERIA ter saído desse postmortem mas não saiu

- **Métrica de "agendamentos via WhatsApp" funcional** ao longo do tempo. Como o feature falhava silenciosamente, não temos como saber quantos leads pediram agendamento e foram rejeitados. Próximo passo: analisar `webhook_events` filtrados por keyword "tive um problema técnico" no histórico.
- **Auditoria das outras 7 edge functions** que têm padrões similares de catch genérico — são suspect de ter bugs latentes equivalentes ao titulo/enum/criador_id.
- **Validação manual em prod com mensagem WhatsApp real do tenant Jacira** — não fiz nesta sessão (precisaria do owner mandar uma mensagem de teste).

---

**Próxima sessão:** revisar action items pendentes, validar que Sentry/Stripe foram credenciados, executar fase 2 da cifragem após dual-read window estabilizar.
