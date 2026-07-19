# 🚀 Jurify — Plano Mestre (2026-07-19)

> Consolidação da análise 100% do projeto (código, banco de produção, auditorias
> anteriores e pesquisa de mercado), com plano executável em fases para colocar
> o Jurify faturando. Elaborado a partir de 5 análises independentes profundas +
> verificação adversarial dos achados no código e no banco de produção real.

---

## 1. Diagnóstico executivo

**O código está maduro. O produto está desligado. O caixa está bloqueado.**

| Dimensão | Estado verificado em 2026-07-19 |
|---|---|
| Qualidade de código | ✅ Excelente: lint 0 warnings, tsc 0 erros, **1.521 testes verdes**, RLS em 100% das tabelas |
| Operação em produção | 🔴 **Parada**: 0 mensagens WhatsApp, 0 leads novos e 0 execuções de agente nos últimos 30 dias |
| Receita | 🔴 **Impossível cobrar**: os planos usam Stripe price IDs *placeholder* (`price_PLACEHOLDER_PRO`) |
| Crons de produção | 🔴 `auto-followup` e `notify-expiring-trials` em **401**, `tribunal-sync` em 400, `data-retention-cleanup` em 500 |
| Deploy | 🔴 Os fixes P0 commitados em 2026-05-25 **nunca foram deployados** (último commit é o próprio script de deploy) |
| Segurança do banco | 🟡 Era: 87 funções SECURITY DEFINER executáveis por `anon` → **corrigido nesta sessão** (migration aplicada em produção) |
| Custo Kapso | 🟡 US$ 299/mês (Platform) — ver estratégia na seção 4 |

A conclusão estratégica: **não é preciso construir mais nada para lançar** — é
preciso *religar* o que existe, cobrar por ele e só então escalar.

---

## 2. O que foi corrigido NESTA sessão (já no código/banco)

| # | Correção | Onde |
|---|---|---|
| 1 | **[P0] Agendamento/transferência via IA 100% quebrado** — o caminho de function-calling referenciava `resolvedResponsavelId`/`responsavelNome`/`aiUsedSchedulingTool`/`aiUsedTransferTool` fora de escopo → `ReferenceError` em toda mensagem com intenção de ação, caindo no fallback "vou encaminhar para nossa equipe". Extraída a resolução do responsável para `resolveResponsavel()` e declarações movidas para o escopo da função. Verificado com tsc (0 erros de escopo) | `whatsapp-webhook/handlers/process-message.ts` |
| 2 | **[P0] Alertas de prazo por WhatsApp nunca enviados** — `sendTextMessage(phone, message)` usava assinatura antiga (2 args); a atual exige o config do tenant como 1º argumento → lançava sempre. Corrigido com config por tenant + cache | `process-prazos-alerts/index.ts` |
| 3 | **[P0-Segurança] 87 funções SECURITY DEFINER executáveis por `anon`** via `/rest/v1/rpc` (inclusive `apply_rls_defaults`, `expire_trials`, `claim_next_job`). Migration curada em 3 camadas: internas → só `service_role`; RPCs do app → só `authenticated`; helpers de RLS intactos. **Aplicada em produção e verificada** | `supabase/migrations/20260719000001_revoke_secdef_function_grants.sql` |
| 4 | **[Fase 1 Kapso-exit] Camada WhatsApp provider-agnostic** — novo cliente Graph API direto da Meta (`meta-client.ts`), transporte com dispatch por provider (`whatsapp-transport.ts`), esqueleto do onboarding Embedded Signup (`meta-manager`), os dois `sendViaMeta` migrados de v18 hardcoded para o cliente novo (v24), e verificação de assinatura `X-Hub-Signature-256` no webhook (ativada pela env `WHATSAPP_APP_SECRET`) | `_shared/meta-client.ts`, `_shared/whatsapp-transport.ts`, `meta-manager/`, `send-reply.ts`, `send-whatsapp-message/index.ts`, `whatsapp-webhook/index.ts` |

⚠️ **Nada disso chega em produção sozinho**: as edge functions precisam de deploy
(`supabase functions deploy whatsapp-webhook process-prazos-alerts send-whatsapp-message meta-manager`).
A migration de segurança já está aplicada.

---

## 3. FASE 0 — Religar a operação (VOCÊ, ~2h, custo R$ 0)

Nenhum código novo destrava isso — são ações em painéis externos. Ordem exata:

1. **Stripe (destrava faturamento)** — criar produtos Pro R$ 199/mês e
   Enterprise R$ 999,90/mês em https://dashboard.stripe.com → copiar os
   `price_...` → rodar `scripts/update-stripe-plans.sql` no Supabase → criar o
   webhook para `.../functions/v1/stripe-webhook` e colar o `whsec_...` em
   Edge Secrets (`STRIPE_WEBHOOK_SECRET`). Hoje **ninguém consegue te pagar**.
2. **Kapso** — logar em app.kapso.ai, confirmar `KAPSO_MASTER_API_KEY` nos Edge
   Secrets e **reativar o webhook** (silencioso desde 11/04). Sem isso o
   WhatsApp não recebe nada.
3. **GitHub Actions (crons 401)** — regenerar `HEALTH_CHECK_TOKEN` (UUID novo) e
   colar o MESMO valor em GitHub Secrets **e** Supabase Edge Secrets; confirmar
   `SUPABASE_SERVICE_ROLE_KEY` atualizado no GitHub. Isso conserta follow-up
   automático, avisos de trial, lembretes e relatórios.
4. **Deploy das edge functions** com os fixes desta sessão + os de 2026-05-25
   (`bash scripts/deploy-pending-edges.sh` ou `supabase functions deploy ...`).
5. **Sentry** — colar `VITE_SENTRY_DSN` no Vercel + `SENTRY_DSN` no Supabase e
   redeploy (produção hoje está cega a erros).
6. **Supabase Auth** — ativar proteção contra senhas vazadas (HIBP) e aplicar o
   upgrade de patch do Postgres pendente no dashboard.
7. **Smoke test ponta-a-ponta** — mandar mensagem WhatsApp real → IA responde →
   pedir "quero falar com a Dra. X" → handoff → "quinta às 14h" → agendamento
   criado + evento no Calendar. Fazer um checkout Stripe de teste.

**Critério de saída da Fase 0:** 1 conversa real completa + 1 pagamento de teste
processado + crons todos 200 + Sentry recebendo eventos.

---

## 4. Estratégia Kapso: ficar agora, construir a saída pela Meta

Pesquisa de mercado completa (jul/2026, fontes no relatório de pesquisa):

**O insight que muda tudo:** seu tráfego é *service* (cliente inicia a conversa,
atendimento na janela de 24h) — e conversas service são **gratuitas** na Meta
desde nov/2024. Ou seja, o custo real da Meta no seu perfil é ~R$ 0; o que se
paga é a **taxa de plataforma** de quem intermedia.

| Opção | 10 escritórios | 50 | 200 | Risco |
|---|---|---|---|---|
| Kapso Platform (atual) | US$ 299/mês | US$ 299 | Enterprise ~US$ 1–2k+ | zero |
| **Meta Cloud API direta** | **~US$ 0** | **~US$ 0** | **~US$ 0** | zero (oficial) |
| 360dialog ISV | ~US$ 530 | ~US$ 2.650 | ~US$ 10.600 | zero |
| Twilio | ~US$ 600 | ~US$ 3.000 | ~US$ 12.000 | zero |
| Z-API/Evolution (não-oficiais) | ~US$ 100 | ~US$ 500+ | ~US$ 2.000+ | **banimento permanente do número** |

**Decisões:**
- ❌ **Não usar API não-oficial** (Evolution/Z-API/Baileys): para advocacia,
  perder o número = perder histórico de clientes (sigilo profissional + LGPD).
  A Meta intensificou banimentos em 2026. Risco existencial, não vale a economia.
- ✅ **Curto prazo: ficar no Kapso** (US$ 299 cobre até 50 números — a opção
  gerenciada mais barata por escritório). Migrar agora seria consertar o que
  não está quebrado.
- ✅ **Médio prazo: Meta Cloud API direta** (Tech Provider próprio). Plataforma
  ~US$ 0 em qualquer escala; Supabase Edge Functions é o encaixe perfeito; é a
  MESMA API que o Kapso proxeia (os payloads do Jurify já são formato Meta
  nativo — confirmado no código). **Gatilho de migração: ~40 números conectados
  OU aprovação do Tech Provider, o que vier antes.**

**Roteiro Meta direta (Fase 1 técnica já commitada nesta sessão):**
1. Business Verification na Meta (2–14 dias) → registrar app como **Tech
   Provider** → App Review + Access Verification (libera onboarding de 200
   clientes/7 dias). ~2–6 semanas de calendário, majoritariamente espera.
2. Configurar Edge Secrets: `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_CONFIG_ID`, e webhook do app Meta → `.../whatsapp-webhook`
   (a verificação de assinatura já está implementada).
3. Frontend do **Embedded Signup v4** (popup do Facebook SDK no wizard) →
   `meta-manager` troca o code por token (já implementado como esqueleto).
4. Piloto: onboardar escritórios NOVOS pela Meta direta; antigos ficam no Kapso
   (a camada `whatsapp-transport.ts` já dispatcha por provider).
5. Migrar a base em lotes (fluxo oficial de migração de WABA preserva o número)
   → cancelar Kapso. **Economia em escala: 6 dígitos/ano em R$.**

---

## 5. FASE 1 — Qualidade e confiança comercial (1–2 semanas de eng.)

Priorizado por impacto em venda, dos achados verificados das 5 análises:

**Backend crítico (P0/P1):**
1. ~~Bug de escopo do function-calling~~ ✅ corrigido nesta sessão.
2. **Webhook síncrono**: responder 200 imediatamente e processar o pipeline de
   IA via `EdgeRuntime.waitUntil`/fila (`workflow_jobs` já existe) — hoje a
   Meta/Kapso pode dar timeout e reprocessar.
3. **Budget de IA furado**: `media-processor`, `analyze-whatsapp-sentiment`,
   `summarize/suggest/extract-whatsapp-*` e `chat-completion` chamam OpenAI sem
   passar pelo gate de budget; e o gate faz *fail-open*. Fechar (fail-closed com
   bypass explícito por env).
4. **Trial expirado não bloqueia IA inbound** — tenant vencido continua gerando
   custo OpenAI a cada mensagem recebida. Aplicar `checkTrialAccess` no pipeline.
5. **Fire-and-forget sem `waitUntil`** — inclusive gravação de consentimento
   LGPD pode se perder quando o isolate morre. Envolver os `void ...then()`.
6. **Nomes hardcoded de um tenant** ("Jacira/Gabriel/Marcos") no handoff regex
   de `process-message.ts` → tenant-aware (tabela de gatilhos por tenant).
7. **CI para edge functions**: adicionar `deno check` + `deno lint` de
   `supabase/functions/` no CI — é exatamente o buraco por onde o bug P0 passou.
8. Testes do caminho de tools (agendar/transferir) — hoje 0 testes no backend crítico.

**Frontend comercial:**
9. **Enforcement de trial na UI**: `TrialGate`/`restrictions` nos botões de
   criar/editar de todas as features (hoje só ~5 pontos) — conversão e abuso.
10. **Papel `manager` inalcançável**: nenhum role do banco mapeia para manager
    → rotas `['admin','manager']` viram admin-only. Decidir mapeamento + UI.
11. **Billing**: `usePlans` fora do padrão Query + limites hardcoded no client
    + cálculo de storage listando buckets no client. Migrar para RPC servidor.
12. **Dark mode**: init inline no `index.html` (FOUC) + ThemeProvider global
    (páginas públicas hoje ignoram o tema).
13. **Dedup de mensagens realtime** no inbox (risco de mensagem duplicada na
    conversa aberta) + "carregar anteriores" (paginação existe, UI não).
14. Limpar dead code do CRM (`crm/CRMDashboard`, `crm/ContatosTable`,
    `FollowUpPanel`, `ClientsTab`) e `alert()` nativos no ChatInput.

**Banco (advisors de performance — 1.318 achados):**
15. Migration scriptada para os 276 `auth_rls_initplan` (envolver `auth.uid()`
    em `(select auth.uid())`) e consolidação das 655 policies permissivas
    duplicadas — ganho direto de latência em TODAS as queries. Dropar os 16
    índices duplicados; revisar 49 FKs sem índice (as de tabelas quentes).

---

## 6. FASE 2 — Lançamento comercial (paralelo à Fase 1)

Você tem um canal de distribuição raro: **irmão com acesso a milhares de
advogados + mãe advogada**. O plano de produto deve servir esse canal:

1. **Beta fundador (semana 1–2):** 5 escritórios da rede (começando pelo da sua
   mãe) com white-glove onboarding: você conecta o WhatsApp, configura o agente,
   acompanha a 1ª semana. Preço fundador vitalício (ex.: R$ 149/mês) em troca de
   feedback + depoimento. Meta: **5 pagantes em 30 dias**.
2. **Instrumentar o funil**: eventos de onboarding (passo a passo), taxa de
   resposta da IA, agendamentos criados — são os números que vendem o produto
   nas próximas conversas.
3. **Caso de sucesso documentado** (nº de leads atendidos fora do horário,
   reuniões agendadas pela IA) → material de venda para o canal do seu irmão.
4. **Onboarding self-service** só depois dos 5 primeiros: o wizard existe, mas
   o white-glove revela as arestas antes de escalar.
5. Compliance como diferencial de venda: LGPD (consent log imutável já existe),
   sigilo profissional, OAB Prov. 205/2021 (tabela de honorários já modelada) —
   argumentos que fecham venda com advogado.

**Meta de 90 dias: 20 escritórios pagantes (~R$ 4k MRR) antes de investir em
qualquer feature nova.**

---

## 7. FASE 3 — Escala (60–120 dias)

- **Meta direta em produção** (seção 4) quando o gatilho disparar → margem sobe.
- **Fila assíncrona real** para o pipeline de IA (`workflow_jobs` + retry + DLQ).
- **Roteamento de modelo por complexidade** (mini para triagem, modelo forte
  para minutas) + cache de respostas frequentes → custo de IA por conversa cai.
- **Mobile**: Capacitor está 90% pronto; ciclo de QA em devices físicos +
  publicação nas lojas (checklist em `docs/plans/2026-03-09-mobile-capacitor.md`).
- **Staging Supabase dedicado** (hoje staging compartilha o banco de produção).
- **Tribunal-sync real** (Escavador/Codilo) — hoje em modo fake e retornando 400.
- Google OAuth verification (remove o aviso "app não verificado", 4–8 semanas).
- i18n/PWA/particionamento: só quando houver demanda real.

---

## 8. Riscos e salvaguardas

| Risco | Salvaguarda |
|---|---|
| Deploy dos fixes esquecido (de novo) | Fase 0 item 4 é bloqueante; adicionar deploy automático das functions no CI (já existe workflow — validar secrets) |
| Migração Meta quebrar operação | Dual-provider por tenant via `whatsapp-transport.ts`; rollback = trocar o provider do tenant |
| Custo OpenAI sem receita | Fase 1 itens 3–4 (budget fail-closed + trial gate inbound) |
| Regressão de RLS multi-tenant | Já houve vazamento em prod (maio); manter `check:rls` no CI + testes de policies por tenant |
| Segredos no histórico git | Rotacionar chaves listadas em `SECURITY_ALERT_CHAVES_COMPROMETIDAS.md` (se ainda não rotacionadas) |

---

## 9. Backlog consolidado (deduplicado das auditorias anteriores)

Itens ainda válidos de 2026-05-25 / DB-AUDIT / postmortem, não cobertos acima:
`tenant_id NOT NULL` nas 10 tabelas restantes · DROP `api_keys.key_value` +
escopo por tenant · cifrar tokens OAuth at-rest · CHECK constraints de status ·
UNIQUE defense-in-depth em `agendamentos` e `conexoes_whatsapp.instance_name` ·
timezone via `Intl` (fim do UTC-3 fixo) · reminder T-24h de reunião · decompor
`process-message.ts` (1.9k linhas) em estágios · consolidar
`zapsign-integration`/`zapsign-webhook` · remover normalizador Evolution morto e
refs a `KAPSO_WEBHOOK_SECRET` no workflow · barrels/`useEntityCRUD`/queryKeys
pendentes · bundle 6MB > cap 4MB do CI (guard silenciado) · axe-core no e2e ·
touch targets 44px · Grafana/Metabase.

---

*Gerado por análise multi-agente (5 agentes de análise + 1 de implementação,
verificação adversarial dos achados críticos no código e no banco de produção).*
