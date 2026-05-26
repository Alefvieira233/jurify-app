# 01 — Arquitetura & Estrutura

**Auditor:** Staff-level architect review
**Data:** 2026-05-25
**Branch:** `main` · Último commit: `2a8f6e6` (docs postmortem 2026-05-07)
**Build:** verde · 25.6 s · `lint --max-warnings 0` 0 erros · `tsc --noEmit` 0 erros · madge 0 ciclos em 722 arquivos
**Snapshot:** 33 features, ~712 arquivos TS/TSX, ~93.9 kLOC (incluindo testes), 91 hooks em `src/hooks/`, 7 features com barrel `index.ts`

---

## Resumo

A arquitetura é **substancialmente sólida** — zero ciclos de import, 41 rotas com `lazyWithRetry`, factory de queryKeys centralizado, ErrorBoundary feature-scoped em todas as rotas, RBAC via componente, Suspense global. As fundações que vieram das ondas de 2026-04-10/17 (decomposição de componentes >400 linhas, layering sem `hook→feature`/`hook→page`, AuthContext memoizado) seguram. Porém há **dívida orgânica** acumulada: duplicação de constantes de domínio (3 fontes de `LEAD_STATUS_LABELS`), dois componentes chamados `LeadDrawer` com shapes incompatíveis sendo importados em rotas diferentes, ~33 % das chamadas `useQuery` do módulo WhatsApp ainda usam strings cruas fora do factory, apenas 7 de 33 features expõem barrel (`pipeline`, `whatsapp`, `leads`, `tags`, `departamentos` ainda são deep-imported entre features), `useEntityCRUD` foi escrito mas só 3 hooks adotaram. Nada bloqueante para go-live, mas cada item é uma futura regressão silenciosa.

---

## Pontos fortes

- **Zero ciclos de import** confirmado em `npx madge --circular --extensions ts,tsx src/` (722 arquivos processados). Mantém o resultado da auditoria 2026-04-10.
- **Layering limpo entre camadas perigosas**: `grep -rn "from '@/pages\|from '\.\./pages" src/hooks/ src/features/` retorna 0 matches. `grep -rn "from '@/features" src/hooks/` retorna 0 matches. Pages só dependem de features via barrel: única ocorrência é `src/pages/AgentsPlayground.tsx:17` importando `@/features/agents` (barrel).
- **Lazy loading exaustivo**: 41 rotas embaladas em `lazyWithRetry` em `src/App.tsx:53-90`. Auth/GoogleAuthCallback/ResetPassword/NotFound são imports eager intencionais (críticos no boot). `withSentryReactRouterV6Routing` no roteador (`src/App.tsx:121`).
- **ErrorBoundary feature-scoped em 100 % das rotas autenticadas**: cada `<Route>` é wrappado em `<FeatureErrorBoundary feature="...">` (`src/App.tsx:198-261`) — uma falha isolada não derruba sidebar/topbar. Implementação em `src/components/FeatureErrorBoundary.tsx:32-103` reporta a Sentry com tags `feature` e `errorBoundary=feature`.
- **Sentry off the critical path**: `src/App.tsx:27-38` carrega `lib/sentry` via `requestIdleCallback` com fallback `setTimeout(0)`. Chunk de 480 KB sai do bundle inicial.
- **Factory de queryKeys robusto**: `src/lib/queryKeys.ts` (416 linhas) cobre 50+ entidades com `all`/`list`/`detail` hierárquicos e `as const` para inferência. Padrão tkdodo aplicado.
- **AuthContext memoizado** (`src/contexts/AuthContext.tsx:187-199`): `signIn`/`signUp`/`signOut` em `useCallback`, `value` em `useMemo` — 59 `useAuth()` consumers param de re-renderizar a cada tick. Justificativa documentada como "Audit P0-1" no código.
- **ProtectedRoute preserva form-state em token refresh** (`src/components/ProtectedRoute.tsx:20-32`): `wasAuthed` ref evita unmount durante `TOKEN_REFRESHED`/`USER_UPDATED`. Coberto por teste em `src/components/__tests__/ProtectedRoute.test.tsx`.
- **`lazyWithRetry` com 3 retries + reload guard** (`src/lib/lazyWithRetry.ts:31-40`): após N falhas, reload uma única vez via `sessionStorage` flag, e só se `!document.hidden` (evita falsos positivos por throttle de aba oculta).
- **Lint policy estrito (zero warnings)**: `package.json:21` força `--max-warnings 0`. Regra customizada `no-restricted-syntax` para `select('*')` e regra `import/no-internal-modules` para deep imports.
- **`as any` em produção: apenas 6 ocorrências**, todas justificadas (factory genérico, dynamic Supabase table name). `@ts-ignore`/`@ts-expect-error` em produção: 1 (`ExtractedDataModal.tsx`).

---

## Achados P0 (críticos)

Nenhum bloqueador absoluto. Os itens P1 abaixo são todos "pode shippar, mas vai te morder em 30-60 dias".

---

## Achados P1 (sérios — prazo curto)

### P1-1 · Duas `LeadDrawer` com mesmo nome e shapes incompatíveis em rotas diferentes
- **Descrição:** existem dois componentes `LeadDrawer` distintos, importados em pontos diferentes da aplicação:
  - `src/components/forms/LeadDrawer.tsx` (294 linhas) — props `{open, onOpenChange, lead, onSuccess?, onDelete?, onTimelineRequest?}`, usa `useDepartamentos` + `useTeamMembers`, status labels de `@/schemas/leadSchema`.
  - `src/features/leads/LeadDrawer.tsx` (160 linhas) — props `{lead, open, onOpenChange}` (lead pode ser `null`), abas via `Tabs`, status labels de `@/features/pipeline/pipelineConfig`.
- **Evidência:**
  ```
  src/features/leads/LeadsPanel.tsx:16          → components/forms/LeadDrawer
  src/features/pipeline/PipelineCard.tsx:24     → components/forms/LeadDrawer
  src/features/contatos/ContatosTable.tsx:17    → features/leads/LeadDrawer
  src/features/pipeline/KanbanOperacional.tsx:18 → features/leads/LeadDrawer
  ```
  Ou seja: o mesmo recurso "abrir drawer de lead" tem dois clones e UX diferente dependendo da tela.
- **Impacto:** divergência funcional silenciosa — features adicionadas em um drawer ficam invisíveis no outro. Confunde grep, refatoração e descoberta. Já causou debate sobre qual usar.
- **Esforço:** M (consolidar shape, migrar 4 consumers, deletar o perdedor).
- **Recomendação:** unificar em `src/features/leads/LeadDrawer.tsx` (mais novo, mais limpo, usa pipelineConfig). Adicionar prop opcional `mode: 'compact' | 'detailed'` se shapes divergirem por necessidade. Deletar `src/components/forms/LeadDrawer.tsx`. Atualizar 4 importadores.

### P1-2 · Triplicação de `LEAD_STATUS_LABELS` (3 fontes de verdade)
- **Descrição:** o mesmo mapeamento status→label está definido em três lugares diferentes:
  - `src/constants/leadStatus.ts:11` — documentado como "single source of truth"; espelha o trigger PG `20260408000002_lead_status_state_machine.sql`. Apenas 2 consumers.
  - `src/schemas/leadSchema.ts:177` — 8 consumers (forms/lead/*, components/forms/Lead*).
  - `src/features/pipeline/pipelineConfig.ts:41` — 4 consumers (LeadDrawer features, reports, automations).
- **Evidência:** `grep -rn "LEAD_STATUS_LABELS" src/` mostra as três declarações.
- **Impacto:** quando o usuário adicionar uma nova etapa de pipeline (ex: `aguardando_documentos`), só uma das três será atualizada — labels divergentes entre tela e tela. Já há sintoma: `pipelineConfig.ts:41` usa `Record<string, string>` (perdeu tipagem do union), enquanto `leadStatus.ts:11` usa `Record<LeadStatus, string>` (tipado).
- **Esforço:** M (deletar duas, redirecionar 12 consumers para `src/constants/leadStatus.ts`).
- **Recomendação:** manter `src/constants/leadStatus.ts` como fonte única. Em `schemas/leadSchema.ts` re-exportar `export { LEAD_STATUS_LABELS, STATUS_LEAD as LEAD_STATUSES }` (sem redeclarar). Em `pipelineConfig.ts` derivar `PIPELINE_STAGES` do array tipado.

### P1-3 · 13 `useQuery` no domínio WhatsApp ainda usam queryKeys como strings cruas
- **Descrição:** o factory `src/lib/queryKeys.ts` cobre `whatsappConversations.list()` mas o resto do módulo WhatsApp insiste em strings inline. Inconsistência prejudica invalidations parciais (não dá pra `invalidateQueries({queryKey: queryKeys.whatsapp.all})`).
- **Evidência:** `grep -rn "queryKey:\s*\[['\"]" src/hooks/ src/features/whatsapp/`:
  - `useConversationNotes.ts:22,53,71,81,110` → `['whatsapp','notes',id]`, `['whatsapp-messages',id]`.
  - `useWhatsAppAutoReply.ts:39,71` → `['whatsapp','auto-replies',tenantId]`.
  - `useWhatsAppQuickReplies.ts:23,58,80,96,104` → `['whatsapp','quick-replies',tenantId]`.
  - `useWhatsAppSearch.ts:27`, `useWhatsAppTemplates.ts:23,49`, `useWhatsAppWindow.ts:23`.
  - `useWhatsAppConversations.ts:55` → `['department-member-ids', ...userDepartmentIds]` (vaza dependência interna em queryKey).
  - `features/whatsapp/PinnedMessagesBar.tsx:33` → componente acessa queryKey diretamente em vez de via hook.
  - `features/scheduling/components/NovoAgendamentoForm.tsx:123` → `['profiles', 'tenant', tenantId]` (fora do WhatsApp, mas mesma classe).
- **Impacto:** invalidations frágeis (ex: `useConversationNotes.ts:110` usa `['whatsapp-messages', id]` mas `useWhatsAppConversations.ts` invalida `queryKeys.whatsappConversations.list(tenantId)` — chaves diferentes para a mesma intent). Refatorações em massa quebram silenciosamente.
- **Esforço:** S (adicionar `whatsappNotes`, `whatsappQuickReplies`, `whatsappAutoReply`, `whatsappTemplates`, `whatsappWindow`, `whatsappPinned`, `whatsappSearch`, `whatsappMessages` ao factory, sed nos 13 sites).
- **Recomendação:** completar o factory com seção "WhatsApp Sub-entities" análoga à de `leadNotas`/`leadHistorico` em `queryKeys.ts:120`.

### P1-4 · Adoção do `useEntityCRUD` parou em 3 hooks
- **Descrição:** a factory genérica `useEntityCRUD<T, TInput>` (`src/hooks/useEntityCRUD.ts:55-383`) foi desenhada para extrair boilerplate de query/CRUD/paginação/tenant/toast/sentry. Adoção real:
  - `useHonorarios.ts:56` ✓
  - `usePrazosProcessuais.ts:69` ✓
  - `useProcessos.ts:84` ✓
  - 12+ outros hooks (`useContratos`, `useDocumentosJuridicos`, `useTarefas`, `useAgendamentos`, `useAgentesIA`, `useFollowUps`, ...) reimplementam o mesmo padrão na unha. `useContratos.ts:4` chega a dizer `@deprecated For new entity hooks, prefer useEntityCRUD`.
- **Evidência:** `grep -rn "useEntityCRUD<" src/hooks/` → só 3 usos. Hooks alvo (sem padrão especial de extração de coluna) têm ~150-300 linhas reimplementando query+mutations.
- **Impacto:** dívida técnica em LOC; bugs corrigidos no factory não propagam; cada hook precisa ser atualizado individualmente quando muda padrão de `tenant_id`/`Sentry breadcrumb`.
- **Esforço:** M (migrar 4-5 hooks de menor risco — `useTarefas`, `useAgendamentos`, `useContratos`).
- **Recomendação:** começar por `useTarefas` (menos lógica custom) como teste; checklist em PR.

### P1-5 · `src/features/settings` opera como god-feature (composição de 7 outras)
- **Descrição:** `settings` importa **7 outras features** — algumas via barrel (OK), outras via deep import (não OK):
  ```
  settings/configuracoes/AssinaturaSection.tsx   → @/features/billing            (barrel ✓)
  settings/configuracoes/SistemaSection.tsx      → @/features/mission-control    (barrel ✓)
                                                 → @/features/dashboard          (barrel ✓)
                                                 → @/features/ai-agents          (barrel ✓)
  settings/configuracoes/UsuariosPermissoesSection.tsx → @/features/users        (barrel ✓)
  settings/ConfiguracoesPage.tsx                 → @/features/tags/TagsManager   (deep ✗)
                                                 → @/features/departamentos/DepartamentosManager (deep ✗)
  ```
- **Evidência:** `grep -rn "from '@/features" src/features/settings/`.
- **Impacto:** `settings` está atuando como host de 7 sub-features. Tags e Departamentos não publicam barrel — refatorações internas dessas features quebram settings sem warning. Como esse comportamento é central (página `/configuracoes`), risco real.
- **Esforço:** S (criar `src/features/tags/index.ts` e `src/features/departamentos/index.ts` re-exportando `TagsManager` e `DepartamentosManager`).
- **Recomendação:** criar barrels para tags, departamentos, whatsapp, leads, pipeline, scheduling, reports — qualquer feature importada externamente deve expor superfície pública via `index.ts`.

### P1-6 · `lazyWithRetry` sem cobertura de teste
- **Descrição:** o wrapper que protege 41 rotas contra falhas de chunk-load (`src/lib/lazyWithRetry.ts`) **não tem teste**. `find src/ -name "*lazyWithRetry*"` retorna apenas o arquivo de implementação. Idem `errorService` (não encontrado por nome — `addSentryBreadcrumb` em `src/lib/sentry.ts` é o equivalente, sem teste isolado).
- **Evidência:** `find src/ -name "*lazyWithRetry*"` → 1 hit (`src/lib/lazyWithRetry.ts`).
- **Impacto:** regressão silenciosa pode quebrar todas as rotas após deploy. O comportamento "reload uma vez via sessionStorage + visibility guard" é não-trivial.
- **Esforço:** S (3 testes: sucesso first-try, sucesso após retries, falha → reload guard).
- **Recomendação:** criar `src/lib/__tests__/lazyWithRetry.test.ts` cobrindo: (a) `factory` resolve OK, (b) factory rejeita 2x e resolve na 3ª, (c) 4 falhas → `sessionStorage.setItem` + `location.reload` chamado uma única vez, (d) tab hidden → não reload.

---

## Achados P2 (médios — prazo médio)

### P2-1 · `src/hooks/` virou pasta-monolito com 91 arquivos
- **Descrição:** `find src/hooks -maxdepth 1 -name "*.ts" -o -name "*.tsx" | wc -l` → **91**. Inclui hooks de WhatsApp, leads, agendas, agents, calendar, dashboard, follow-ups, tickets, etc.
- **Inconsistência:** algumas features têm `hooks/` próprio (`features/leads/hooks/useLeadAutoRouting.ts`, `features/ai-agents/hooks/useAgentesIAFilters.ts`, `features/mission-control/hooks/*` com 5 hooks, `features/honorarios/hooks/`, `features/processos/hooks/`, `features/documentos/hooks/`) — mas a maioria dos hooks dessas features ainda vive em `src/hooks/`. Sem regra.
- **Impacto:** descobribilidade — qual hook é de leads? `useLeads`/`useLeadsCRUD`/`useLeadsQuery`/`useLeadsTypes`/`useLeadHistorico`/`useLeadNotas`/`useLeadTagsBatch`/`useLeadScoring` em `src/hooks/`; mas `useLeadAutoRouting` em `features/leads/hooks/`. Refatoradores não sabem onde colocar o próximo hook.
- **Esforço:** L (mover ~50 hooks para features apropriadas, ajustar imports). Pode ser feito em ondas por domínio.
- **Recomendação:** estabelecer regra: "hooks específicos de 1 feature vão em `features/<feat>/hooks/`; hooks transversais (auth, theme, debounce, mobile, toast, RBAC) ficam em `src/hooks/`". Migrar primeiro os hooks de WhatsApp (16+ hooks) para `features/whatsapp/hooks/`.

### P2-2 · 14 arquivos de produção ainda acima de 400 linhas
- **Descrição:** após as ondas de decomposição de 2026-04-10/17, ainda restam 14 arquivos non-test, non-UI-primitive, non-generated com mais de 400 linhas:
  ```
  675  src/lib/multiagents/core/BaseAgent.ts
  656  src/features/documentos/DocumentosManager.tsx     ← #1 a atacar
  500  src/features/whatsapp/WhatsAppIA.tsx              ← ChatPanel + WhatsAppIA no mesmo arquivo
  478  src/integrations/supabase/database-extended.ts
  452  src/features/contracts/components/NovoContratoForm.tsx
  428  src/features/scheduling/components/NovoAgendamentoForm.tsx
  417  src/hooks/useAgendaAutomation.ts
  417  src/components/Sidebar.tsx
  416  src/lib/queryKeys.ts                              ← OK, é dicionário
  413  src/features/contracts/ContratosManager.tsx
  410  src/features/users/UsuariosManager.tsx
  408  src/hooks/useAgentTraining.ts
  404  src/pages/Auth.tsx
  ```
- **Evidência:** `find src/ -name "*.tsx" -o -name "*.ts" | grep -v ... | xargs wc -l | awk '$1>400'`.
- **Impacto:** moderado — funcional, mas complexidade ciclomática elevada em `DocumentosManager.tsx` e `WhatsAppIA.tsx` (este último tem `ChatPanel` interno de 184 linhas + `WhatsAppIA` de 252 linhas no mesmo módulo).
- **Esforço:** M por arquivo.
- **Recomendação:** quebra prioritária do `DocumentosManager.tsx` (656 linhas) extraindo `<FolderTree>`, `<DocumentoTable>`, `<FolderActionsDropdown>` para `features/documentos/components/`. Extrair `ChatPanel` de `WhatsAppIA.tsx` para `features/whatsapp/ChatPanel.tsx`.

### P2-3 · Cross-feature imports diretos sem barrel (5 pares)
- **Descrição:** mapa de imports cruzados detectado:
  ```
  conexoes -> whatsapp           (WhatsAppWizard direto)
  contatos -> leads              (LeadDrawer direto)
  leads -> pipeline              (pipelineConfig direto — 3 arquivos)
  leads -> tags                  (TagBadge direto)
  leads -> timeline              (TimelineConversas direto)
  pipeline -> leads              (LeadDrawer direto)  ← bidirecional
  processos -> prazos
  reports -> pipeline            (pipelineConfig direto)
  reports -> dashboard           (via barrel ✓)
  settings -> ai-agents/users/billing/mission-control/dashboard  (via barrel ✓)
  settings -> tags/departamentos (deep imports ✗)
  ```
- **Evidência:** `grep -rn "from '@/features" src/features/`.
- **Impacto:** acoplamento bidirecional pipeline↔leads é o mais grave — ambas features dependem da outra. Refatoração de uma quebra a outra.
- **Esforço:** S (extrair `pipelineConfig` para `src/constants/` resolve o pipeline↔leads; criar barrels resolve o restante).
- **Recomendação:** mover `src/features/pipeline/pipelineConfig.ts` → `src/constants/pipeline.ts` (junto de `leadStatus.ts`). Criar barrels em `tags`, `departamentos`, `whatsapp`, `leads`, `timeline`, `pipeline`, `reports`. Adicionar regra ESLint `no-restricted-imports` proibindo deep imports cross-feature.

### P2-4 · Hooks órfãos verificados (3 confirmados)
- **Descrição:** após filtrar falsos positivos do madge (que não resolve dynamic imports em alguns casos), 3 componentes em `features/ai-agents/components/` são genuinamente sem consumidores:
  - `AgentTestConfig.tsx` (interface declarada, nunca importado).
  - `TestConversation.tsx`.
  - `TestResultsSummary.tsx`.
- **Outros "orphans" reportados pelo madge são falsos positivos**: `useWhatsAppActions`, `useWhatsAppForward`, `useSmartReply`, `useReactToMessage`, `EnhancedAIChat`, `TagBadge`, `NovoLeadForm`, `OnboardingFlow` etc. todos têm importadores reais.
- **Wrapper morto:** `src/components/ui/use-toast.ts` é só `export { useToast, toast } from "@/hooks/use-toast"` — **zero consumidores** (`grep -rn "from '@/components/ui/use-toast'"` retorna vazio).
- **Evidência:** `grep -rn "AgentTestConfig\|TestConversation\|TestResultsSummary" src/` mostra só o arquivo de definição.
- **Impacto:** ~100 linhas mortas; ruído em busca/refactor.
- **Esforço:** S.
- **Recomendação:** deletar `AgentTestConfig.tsx`, `TestConversation.tsx`, `TestResultsSummary.tsx`, `src/components/ui/use-toast.ts`. Auditar se a UI de "testar agente" foi mesmo removida ou se está pendente de re-religar.

### P2-5 · Bundle inicial 505 KB (gzip 132 KB) — recharts/sentry/router/jspdf fora do critical path mas index ainda grande
- **Descrição:** `npm run build` produz:
  - `index-uhwYTfuG.js` 505 KB (gzip 132 KB) — entry bundle.
  - `sentry-DYv-Yodm.js` 480 KB (gzip 160 KB) — lazy via `requestIdleCallback` ✓.
  - `charts-DrxMQEJn.js` 472 KB (gzip 127 KB) — não está no critical path (`Dashboard` lazy).
  - `jspdf.es.min-DKIiU2zh.js` 387 KB (gzip 127 KB) — lazy (export PDF).
  - `router-BJ00vi2e.js` 316 KB (gzip 99 KB) — entra na crítica via `BrowserRouter`.
- **Impacto:** o entry de 132 KB gzip é OK por padrões SaaS, mas há gordura: 41 `lazyWithRetry(...)` no `App.tsx` significa 41 dynamic-imports inline. Cada um vira `__vite_lazy(...)` ~100 bytes mas o conjunto inflate.
- **Esforço:** L (análise de bundle por chunk, dynamic-import-grouping).
- **Recomendação:** rodar `npm run build:analyze`, identificar deps no entry que poderiam ser dynamic (radix-ui-tooltip, lucide-react full?), avaliar `import.meta.glob` para o registry de rotas.

### P2-6 · Ausência de discriminated unions / assertNever
- **Descrição:** 43 `switch` em produção (`grep -rn "switch\s*(" src/ ...`), zero usos de `assertNever`/`as never` para garantir exhaustiveness. Padrão `default: return undefined`/`return null` é comum em pipelineConfig, status-mappers, automations.
- **Evidência:** `grep -rn "_exhaustive\|assertNever" src/` → 0 hits em produção.
- **Impacto:** quando o time adicionar um novo `LeadStatus` ou novo tipo de automation node, switches existentes não falham em type-check — bug silencioso em runtime.
- **Esforço:** S (criar `src/utils/assertNever.ts`, aplicar em 5 switches críticos: lead-status, automation-node-type, agent-type, document-type).
- **Recomendação:**
  ```ts
  export function assertNever(x: never): never {
    throw new Error(`Unhandled discriminant: ${JSON.stringify(x)}`);
  }
  ```

---

## Achados P3 (cosméticos)

### P3-1 · `useNetworkBanner` importado fora de Layout
- **Descrição:** `src/App.tsx:19,167-175` declara `OfflineBanner` no nível raiz porque `Layout` só wrappa rotas autenticadas. Está OK funcionalmente, mas há uma duplicação implícita: o `Layout.tsx` provavelmente tem outro banner offline para a rota autenticada. Verificar.
- **Esforço:** S. **Recomendação:** centralizar em um único componente posicionado fora de `<AuthProvider>`.

### P3-2 · Mensagens "Sem conexao com a internet" sem acento
- **Descrição:** `src/App.tsx:172`: "Sem conexao com a internet. Algumas funcionalidades podem nao funcionar." — caracteres `~` faltando, provável bug de encoding em algum commit anterior. Pequeno, mas é UI visível ao usuário.
- **Esforço:** S. **Recomendação:** `git grep` por `nao\|funcao\|conexao\b` em strings de UI.

### P3-3 · `useDebounce` redefinido em useDebounce.ts mas existe `@/utils` candidato
- **Descrição:** OK como hook custom, mas verificar se não há conflito com `lodash.debounce` ou similar em deps.

### P3-4 · Aviso react-refresh em 8 arquivos
- **Descrição:** 8 arquivos com `/* eslint-disable react-refresh/only-export-components */` (shadcn primitives, AuthContext, automation cards) — alguns dão pra refatorar exportando const fora do componente.

### P3-5 · `madge` reporta 186 warnings durante análise
- **Descrição:** `Processed 722 files (58.4s) (186 warnings)`. Provavelmente paths Capacitor/Node-only não resolvidos. Não bloqueia, mas vale rodar com `--warning` para inspecionar.

---

## Métricas

| Métrica | Valor | Comentário |
|---|---|---|
| Arquivos TS/TSX totais | 712 | Inclui testes (`__tests__` + `tests/`). |
| Arquivos non-UI non-test | 531 | Excluindo `components/ui/*` (shadcn) e `*.test.*`. |
| Linhas totais (não-teste) | ~93.9k | `wc -l` agregado. |
| Features (`src/features/*`) | 33 | 7 com barrel `index.ts` (21 %). |
| Hooks em `src/hooks/` | 91 | Pasta-monolito. Apenas 12 hooks vivem em `features/*/hooks/`. |
| Componentes >400 linhas (non-UI/non-gen) | 14 | Top: `DocumentosManager` 656, `WhatsAppIA` 500. |
| Componentes 300-400 linhas | 56 | Zona de alerta para próxima onda. |
| Ciclos de import | **0** | `madge --circular` 722 arquivos. |
| Hook→page imports | **0** | `grep` confirma. |
| Hook→feature imports | **0** | `grep` confirma. |
| Feature→feature imports diretos (sem barrel) | 6 pares | Detalhe em P2-3. |
| Rotas lazy | 41/45 | 4 eager: Auth, GoogleAuthCallback, ResetPassword, NotFound (corretos). |
| Rotas com `FeatureErrorBoundary` | 100 % das autenticadas | App.tsx:198-261. |
| `as any` em produção | 6 | Todos justificados (factory genérico, dynamic table). |
| `@ts-ignore`/`@ts-expect-error` em produção | 1 | `ExtractedDataModal.tsx`. |
| `: any` (type annotation) em produção | 1 | `useDocumentosJuridicos.ts:86`. |
| Lint errors / warnings | 0 / 0 | `--max-warnings 0`. |
| TypeScript errors | 0 | `tsc --noEmit`. |
| Build time | 25.6 s | Vite production. |
| Entry bundle (gzip) | 132 KB | `index-uhwYTfuG.js`. Sentry, charts, jspdf todos lazy. |
| QueryKeys cobertos por factory | ~50 entidades em 416 linhas | ~33 % do módulo WhatsApp ainda inline (P1-3). |
| Adoção `useEntityCRUD` | 3 hooks / ~15 candidatos | 20 % (P1-4). |
| Hooks órfãos confirmados (não falsos positivos) | 3 componentes + 1 wrapper | P2-4. |

---

## Recomendações priorizadas (top 5)

1. **Consolidar `LeadDrawer` e `LEAD_STATUS_LABELS` em fonte única** (P1-1, P1-2). Antes de adicionar qualquer nova etapa de pipeline, eliminar a divergência. Esforço M total, retorno alto em manutenibilidade.
2. **Completar o factory de queryKeys para WhatsApp** (P1-3). Adicionar `queryKeys.whatsappNotes`, `whatsappQuickReplies`, `whatsappAutoReply`, `whatsappTemplates`, `whatsappWindow`, `whatsappPinned`, `whatsappSearch`, `whatsappMessages`. Esforço S, previne bugs de invalidation que já estão latentes.
3. **Mover `pipelineConfig.ts` para `src/constants/` e quebrar o acoplamento bidirecional pipeline↔leads** (P2-3). Esforço S, derruba o pior par de cross-feature imports.
4. **Criar barrels para `tags`, `departamentos`, `whatsapp`, `leads`, `pipeline`, `scheduling`, `reports`** (P1-5, P2-3). Esforço S. Habilita uma regra ESLint `no-restricted-imports` cross-feature para impedir regressões.
5. **Cobrir `lazyWithRetry` com testes** (P1-6). Esforço S. Componente crítico de resiliência sem rede de proteção.

Bônus tático (ondas futuras):
- Migrar `useTarefas`, `useAgendamentos`, `useContratos` para `useEntityCRUD` (P1-4).
- Quebrar `DocumentosManager.tsx` e `WhatsAppIA.tsx` (P2-2).
- Iniciar migração gradual de hooks por feature (P2-1) — priorizar WhatsApp (16+ hooks).
- Introduzir `assertNever` em 5 switches de domínio (P2-6).
