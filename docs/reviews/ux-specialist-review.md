# UX Specialist Review

**Reviewer:** @ux-design-expert (Uma)
**Data:** 2026-04-03
**Documento Revisado:** docs/prd/technical-debt-DRAFT.md
**Referencia:** docs/frontend/frontend-spec.md (Phase 3 analysis)

---

## Resumo da Revisao

- Debitos UX no DRAFT: 13 (DEB-006 a DEB-009, DEB-023 a DEB-028, DEB-041 a DEB-043)
- Validados sem alteracao: 8
- Severidade ajustada: 3
- Removidos (falso positivo): 0
- Novos debitos adicionados: 3

Todos os 13 debitos UX identificados no DRAFT foram confirmados via verificacao direta no codebase. Os numeros citados sao precisos e em alguns casos ligeiramente conservadores. Tres ajustes de severidade foram feitos com base no impacto real ao usuario, e tres novos debitos foram identificados durante a validacao cruzada.

---

## Debitos Validados

| # | ID DRAFT | Debito | Severidade Original | Severidade Ajustada | Horas | Impacto UX | Design Review? |
|---|----------|--------|---------------------|---------------------|-------|------------|----------------|
| 1 | DEB-006 | STATUS_COLORS duplicado em 8 arquivos | HIGH | HIGH | 4 | Visual: badges de status inconsistentes entre features | Nao |
| 2 | DEB-007 | i18n 97% incompleto | HIGH | MEDIUM* | 40 | Funcional: bloqueia multi-idioma, mas nao afeta UX atual | Nao |
| 3 | DEB-008 | Keyboard navigation limitada | HIGH | HIGH | 16 | Funcional: power users e a11y bloqueados | Sim |
| 4 | DEB-009 | Skip-to-content ausente | HIGH | HIGH | 4 | Funcional: screen readers obrigados a percorrer sidebar completa | Nao |
| 5 | DEB-023 | EmptyState subutilizado | MEDIUM | MEDIUM | 8 | Visual: aparencia inconsistente de empty states | Nao |
| 6 | DEB-024 | Tabelas nao responsivas | MEDIUM | HIGH** | 20 | Funcional: tabelas inutilizaveis em mobile | Sim |
| 7 | DEB-025 | Draft persistence nao utilizado | MEDIUM | MEDIUM | 8 | Funcional: perda de dados em formularios | Nao |
| 8 | DEB-026 | React.memo ausente em listas | MEDIUM | MEDIUM | 6 | Performance: jank visivel em datasets grandes | Nao |
| 9 | DEB-027 | Hardcoded colors vs tokens | MEDIUM | MEDIUM | 8 | Visual: dark mode quebrado em 17+ arquivos | Nao |
| 10 | DEB-028 | Virtual scrolling ausente | MEDIUM | MEDIUM | 12 | Performance: degradacao com 500+ items | Nao |
| 11 | DEB-041 | Reduced motion nao suportado | LOW | LOW | 2 | A11y: usuarios com disturbios vestibulares afetados | Nao |
| 12 | DEB-042 | Breadcrumbs nao interativos | LOW | MEDIUM*** | 2 | Funcional: navegacao hierarquica impossivel | Nao |
| 13 | DEB-043 | Error handling inconsistente | LOW | LOW | 6 | Visual: experiencia de erro imprevisivel | Nao |

**Notas de ajuste:**

\* **DEB-007 (HIGH -> MEDIUM):** O mercado atual do Jurify e 100% brasileiro. O i18next esta configurado e funcional; a migracao e mecanica (extrair strings para JSON). Nao bloqueia nenhuma funcionalidade atual. Se expansao internacional for planejada para v1.3+, elevar de volta a HIGH. A severidade HIGH e justificada apenas do ponto de vista de pattern consistency (4/130 componentes usam `useTranslation()`).

\*\* **DEB-024 (MEDIUM -> HIGH):** Com Capacitor ja configurado e hooks nativos implementados (`usePushNotifications`, `useBiometrics`, `useNativeShare`), o app mobile e uma realidade proxima. Tabelas com `<Table>` padrao sem `overflow-x-auto` sao inutilizaveis em telas <768px. Verificacao: ContatosTable ja tem `overflow-x-auto` mas ProcessosManager, ContratosManager, HonorariosManager, EquipeManager e UsuariosManager nao tem. Isso afeta 5 das 6 tabelas criticas.

\*\*\* **DEB-042 (LOW -> MEDIUM):** Breadcrumbs.tsx usa segmentos estaticos (spans) sem `<Link>`. Em um app com 47 rotas e ate 3 niveis de profundidade (`/configuracoes/:section/:subsection`), a impossibilidade de navegar por breadcrumbs e uma friccao real. O componente shadcn/ui `breadcrumb.tsx` ja suporta `BreadcrumbLink` -- basta usar.

---

## Debitos Adicionados

### DEB-UX-NEW-001: aria-live Ausente em Feedback Dinamico

| Campo | Valor |
|-------|-------|
| Severidade | MEDIUM |
| Componente(s) | Formularios (15 com react-hook-form), listas filtradas, estados de carregamento |
| Impacto UX | Apenas 2 ocorrencias de `aria-live` no codebase inteiro (ProtectedRoute.tsx e seu teste). Nenhum formulario anuncia erros de validacao para screen readers. Nenhuma lista anuncia contagem de resultados apos filtro. Usuarios de tecnologia assistiva nao recebem feedback de acoes dinamicas. |
| Horas | 6 |
| Solucao Proposta | Adicionar `aria-live="polite"` em: (1) containers de mensagens de erro de formulario, (2) contagem de resultados apos filtro/busca, (3) notificacoes de sucesso/erro de acoes. O `FormMessage` do shadcn/ui ja renderiza o texto mas sem `aria-live`. Criar wrapper `AccessibleFormMessage` ou adicionar a prop diretamente. |

### DEB-UX-NEW-002: ErrorState Component Nao Adotado

| Campo | Valor |
|-------|-------|
| Severidade | LOW |
| Componente(s) | `src/components/ErrorState.tsx` existe mas nao e importado em nenhum feature component |
| Impacto UX | O componente `ErrorState` foi criado mas tem 0 usages em features. Cada feature implementa seu proprio tratamento de erro inline ou via toast. Diferente do EmptyState (DEB-023) que tem 5 adocoes, ErrorState tem zero. |
| Horas | 4 |
| Solucao Proposta | Adotar `ErrorState` como padrao para erros de pagina (quando React Query retorna erro). Documentar padroes: ErrorBoundary para crashes, ErrorState para query errors, toast para action errors. Relacionado a DEB-043. |

### DEB-UX-NEW-003: Contraste de Cores em Status Badges

| Campo | Valor |
|-------|-------|
| Severidade | MEDIUM |
| Componente(s) | Pipeline (KanbanCard, PipelineCard), CRM (LeadDetailPanel), status badges em todas as features |
| Impacto UX | Status badges usam cores de fundo claras (amber-100, blue-100, green-100) com texto escuro sobre cards brancos. Em combinacoes especificas (amarelo sobre branco, cyan sobre branco), o contraste pode falhar WCAG AA (4.5:1 para texto normal). No dark mode, os overrides com `!important` no index.css indicam que as cores nao foram projetadas para ambos os temas. |
| Horas | 4 |
| Solucao Proposta | Auditar contraste de todas as combinacoes de status badge com ferramenta automatizada (ex: axe-core). Definir pares de cores (bg + text) garantidos AA em ambos os temas no arquivo centralizado de STATUS_COLORS (DEB-006). Usar tokens CSS `--status-{name}-bg` e `--status-{name}-text` com valores diferentes por tema. |

---

## Respostas ao @architect

### Pergunta 1: STATUS_COLORS alignment (DEB-006 + DEB-010) -- Ao centralizar STATUS_COLORS, devemos alinhar com os CHECK constraints do banco?

**Resposta:** Sim, o alinhamento e essencial. O frontend deve ser um reflexo fiel dos valores validos do banco, nao uma superset flexivel. A proposta:

1. Definir CHECK constraints no banco com os valores exatos (DEB-010).
2. Criar `src/constants/statusConfig.ts` com um mapa `Record<EntityType, Record<StatusValue, { label: string; color: string; icon: LucideIcon }>>`.
3. Exportar tanto as cores quanto os labels de cada status.
4. Gerar tipos TypeScript a partir dos valores validos (`type LeadStatus = 'novo' | 'qualificacao' | ...`).

A flexibilidade adicional do frontend deve ser apenas para estados transitorios de UI (ex: "loading", "optimistic update"), nunca para status persistidos. Os 8 arquivos que definem STATUS_COLORS devem importar da source of truth unica. As cores devem usar CSS custom properties (`--status-novo`, `--status-qualificacao`, etc.) para suportar dark mode nativamente.

### Pergunta 2: i18n migration strategy (DEB-007) -- Qual a prioridade real?

**Resposta:** Para o mercado 100% brasileiro atual, rebaixo para **MEDIUM (P2)**. Razoes:

- Nenhum usuario e impactado pela falta de multi-idioma hoje.
- A migracao e mecanica mas cara (40h para 130+ componentes + 7 schemas).
- O framework i18next ja funciona nos 4 componentes compartilhados.

Porem, recomendo uma abordagem incremental:
1. **Agora (2h):** Migrar sidebar labels e page titles (centralizados em poucos arquivos).
2. **Com cada nova feature/refactor:** Migrar o componente sendo tocado.
3. **Sprint dedicado:** So quando expansao internacional for confirmada.

A consistencia de patterns justifica incluir i18n em todo novo componente criado, mas nao justifica uma migracao retroativa de 40h no curto prazo.

### Pergunta 3: Mobile tables (DEB-024) -- Qual padrao responsivo recomendado?

**Resposta:** Para tabelas juridicas com muitos campos criticos, recomendo uma abordagem hibrida de 3 niveis:

1. **Desktop (>=1024px):** Tabela completa como esta hoje.
2. **Tablet (768-1023px):** Tabela com `overflow-x-auto` + colunas secundarias hidden via `hidden md:table-cell`. Colunas criticas: nome, status, data, acao.
3. **Mobile (<768px):** Card view alternativa usando `useIsMobile()` (hook ja existe em `src/hooks/use-mobile.tsx`). Cada card mostra: nome (titulo), status badge, data principal, e um botao de acao. Detalhes secundarios acessiveis via expansao do card ou drawer.

Para processos juridicos especificamente, os campos criticos sao: numero CNJ, tipo, fase atual, cliente, e proximo prazo. Esses devem ser visiveis em todas as breakpoints.

O componente shadcn/ui `Table` ja e semanticamente correto (`<table>`) -- basta wrappear com `<div className="overflow-x-auto">` para tablet e renderizar cards condicionalmente para mobile. Estimo que a abordagem hibrida adiciona ~4h sobre o `overflow-x-auto` simples, mas o resultado e significativamente melhor para usuarios mobile.

### Pergunta 4: EmptyState vs custom (DEB-023) -- As 25 features inline tem contexto visual que o generico nao captura?

**Resposta:** Nao. Verifiquei o codebase e a maioria dos empty states inline sao variantes simples: icone + texto + botao CTA opcional. O componente `EmptyState` compartilhado ja aceita `icon`, `title`, `description` e `children` (para CTA custom). As 5 features que ja usam (documentos, prazos, processos, honorarios, fluxos) demonstram que o componente e flexivel o suficiente.

As 25 features restantes usam markup ad-hoc que geralmente consiste em:
- Um `<div>` centralizado com `text-center`
- Um icone Lucide
- Texto descritivo
- Ocasionalmente um `<Button>` de acao

A solucao e simplesmente substituir esse markup por `<EmptyState icon={X} title="..." description="..."><Button>Criar</Button></EmptyState>`. Nenhum contexto visual unico e perdido. A inconsistencia atual (tamanho de fonte, espacamento, cor de icone) e puramente pela falta de adocao.

### Pergunta 5: Draft persistence scope (DEB-025) -- Quais formularios devem ter prioridade?

**Resposta:** Priorizar pela complexidade do formulario (numero de campos) e frequencia de uso:

1. **LeadForm** (17 campos, formulario mais usado) -- Prioridade 1
2. **NovoContratoForm** (formulario longo com upload) -- Prioridade 2
3. **NovoProcessoForm** (17 campos com validacao CNJ) -- Prioridade 3
4. **NovoPrazoForm** (datas e selecoes) -- Prioridade 4
5. **NovoHonorarioForm** (valores monetarios) -- Prioridade 5

O hook `useDraftPersistence` ja esta implementado e testado em `NovoAgenteForm` -- a integracao nos demais formularios e direta: adicionar o hook, passar `watch()` values para persistir, e chamar `clearDraft()` no `onSubmit` de sucesso. Estimo 1.5h por formulario (8h total e preciso).

Nao recomendo draft persistence para formularios de edicao (ja tem dados carregados) nem para formularios curtos (TagForm com 3 campos, DepartamentoForm com 2 campos).

### Pergunta 6: Virtual scrolling threshold (DEB-028) -- Qual o dataset maximo esperado?

**Resposta:** Para um SaaS juridico multi-tenant, os volumes esperados por tenant sao:

| Entidade | Escritorio pequeno (1-5 advogados) | Escritorio medio (5-20) | Escritorio grande (20+) |
|----------|-----------------------------------|------------------------|------------------------|
| Leads | 50-200 | 200-2.000 | 2.000-10.000 |
| Processos | 20-100 | 100-1.000 | 1.000-5.000 |
| Contratos | 10-50 | 50-500 | 500-2.000 |
| Mensagens WhatsApp | 500-5.000 | 5.000-50.000 | 50.000-500.000 |
| Notificacoes | 100-500 | 500-5.000 | 5.000-50.000 |

**Recomendacao:** Virtual scrolling e necessario para qualquer lista que possa exceder 200 items visualmente renderizados. Isso inclui:
- **ContatosTable** -- sim, necessario (escritorios medios ja ultrapassam 200 leads)
- **ArquivadosView** -- sim (acumula leads ao longo do tempo)
- **NotificationsPanel** -- sim (acumula rapidamente)
- **MessageView** -- ja implementado (referencia)

Para processos e contratos, a paginacao server-side existente pode ser suficiente se limitar a 50-100 items por pagina. Virtual scrolling e mais critico onde o usuario espera scroll continuo (chat, lista de contatos, notificacoes).

Abaixo de 100 items, React.memo (DEB-026) e suficiente sem virtual scrolling.

### Pergunta 7: Accessibility compliance level -- WCAG 2.1 AA e requisito legal?

**Resposta:** No Brasil, a **Lei Brasileira de Inclusao (LBI, Lei 13.146/2015)** exige acessibilidade em servicos digitais, e a norma tecnica de referencia e a **WCAG 2.1** (via e-MAG). Para SaaS juridico especificamente:

- Escritorios publicos (advocacia publica, defensorias) tem obrigacao legal explicita de acessibilidade.
- Escritorios privados com clientes corporativos podem ter clausulas contratuais de compliance.
- Licoes internacionais: ADA (EUA) e EAA (Europa, 2025) exigem WCAG 2.1 AA para software comercial.

**Recomendacao:** Elevar DEB-008 (keyboard navigation) e DEB-009 (skip-to-content) para **P1** como ja estao. Adicionar DEB-UX-NEW-001 (aria-live) ao mesmo grupo. DEB-041 (reduced-motion) pode permanecer P3 por ora, mas deve ser implementado antes de qualquer publicacao em app store (Apple e Google revisam acessibilidade).

Para o Jurify hoje, o risco nao e litigio, mas sim perda de contratos com orgaos publicos e escritorios maiores que exigem conformidade. A implementacao basica (skip-to-content + keyboard nav + aria-live) custa ~26h e cobre os requisitos WCAG 2.1 AA mais criticos.

---

## Solucoes de Design Propostas

### Para DEB-006: STATUS_COLORS Centralizado

**Problema:** 8 arquivos definem STATUS_COLORS independentemente com valores potencialmente divergentes. Cores de badges mudam entre features.

**Solucao:**
1. Criar `src/constants/statusConfig.ts` com mapa unico por entidade.
2. Definir CSS custom properties em `index.css`: `--status-novo-bg`, `--status-novo-text`, etc.
3. Criar componente `<StatusBadge entity="lead" status="qualificacao" />` que encapsula cor + label.
4. Substituir todas as 8 definicoes locais por imports do arquivo central.

**Referencia:** shadcn/ui `Badge` component + CSS custom properties ja definidos para 6 pipeline stages em index.css.
**Esforco:** 4 horas

### Para DEB-008 + DEB-009: Acessibilidade de Navegacao

**Problema:** Sem skip-to-content, focus management em rotas, ou navegacao por teclado em tabelas/kanban.

**Solucao:**
1. Adicionar `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">Ir para conteudo principal</a>` no inicio do `Layout.tsx`.
2. Adicionar `id="main-content" tabIndex={-1}` no `<main>` do Layout.
3. Criar hook `useFocusOnRouteChange()` que faz `mainRef.current?.focus()` no `useEffect` com `pathname` como dependencia.
4. Para tabelas: adicionar `onKeyDown` no `<tbody>` com arrow keys para navegacao entre rows.
5. Para kanban: configurar `@hello-pangea/dnd` keyboard mode (ja tem suporte built-in, so precisa ativar).

**Referencia:** Radix UI Dialog ja faz focus trap (modais ok). `@hello-pangea/dnd` tem `DragDropContext` com keyboard sensor built-in.
**Esforco:** 20 horas (4h skip-to-content + 16h keyboard nav)

### Para DEB-024: Tabelas Responsivas

**Problema:** 5 de 6 tabelas criticas nao tem suporte mobile. Overflow fora da viewport.

**Solucao:**
1. Criar componente `<ResponsiveTable>` que wrappeia `<Table>` com `overflow-x-auto` e renderiza `<CardList>` em mobile.
2. Definir interface `ResponsiveColumn<T>` com `{ key, label, priority: 'critical' | 'secondary' | 'optional', render }`.
3. Em mobile: renderizar apenas colunas `critical` como cards.
4. Usar `useIsMobile()` (ja existe) para toggle.

**Referencia:** shadcn/ui `Card` + `Table` components.
**Esforco:** 20 horas (4h componente base + ~3h por tabela x 5 tabelas)

### Para DEB-025: Draft Persistence

**Problema:** Usuarios perdem dados de formulario em navegacao acidental.

**Solucao:**
1. Em cada formulario prioritario, adicionar `useDraftPersistence({ key: 'form-lead', watch: form.watch() })`.
2. No `onSubmit` de sucesso, chamar `clearDraft()`.
3. Ao montar o form, verificar `getDraft()` e popular com `form.reset(draft)`.
4. Adicionar indicador visual sutil: "Rascunho salvo automaticamente" em texto muted abaixo do titulo do form.

**Referencia:** Ja implementado em `NovoAgenteForm.tsx` -- padrao replicavel.
**Esforco:** 8 horas (1.5h x 5 formularios + 0.5h para indicador visual)

### Para DEB-027: Hardcoded Colors

**Problema:** 33 ocorrencias de `text-gray-*`/`bg-gray-*` em 17 arquivos e 64+ ocorrencias de `text-white` em 30 arquivos. Dark mode quebra nesses locais.

**Solucao:**
1. Search & replace sistematico:
   - `text-gray-500` -> `text-muted-foreground`
   - `text-gray-900` -> `text-foreground`
   - `bg-gray-100` -> `bg-muted`
   - `bg-gray-50` -> `bg-background`
   - `text-white` -> `text-primary-foreground` (em contextos com bg colorido) ou `text-background` (em contextos gerais)
2. Remover overrides `!important` do index.css que compensavam esses valores.
3. Adicionar lint rule (eslint-plugin-tailwindcss) para prevenir regressoes.

**Referencia:** Design tokens ja definidos em `index.css` com `--foreground`, `--muted-foreground`, `--background`, `--muted`.
**Esforco:** 8 horas

### Para DEB-UX-NEW-001: aria-live para Feedback Dinamico

**Problema:** Apenas 2 instancias de `aria-live` no app inteiro. Nenhum formulario anuncia erros para screen readers.

**Solucao:**
1. Modificar `src/components/ui/form.tsx` (`FormMessage`) para incluir `aria-live="polite"` no container de mensagem de erro.
2. Criar componente `<ScreenReaderAnnounce message={string} />` que renderiza um div `sr-only aria-live="assertive"` para anuncios dinamicos.
3. Adicionar contagem de resultados anunciavel em listas filtraveis: `<span className="sr-only" aria-live="polite">{count} resultados encontrados</span>`.

**Referencia:** shadcn/ui `Form` component (extender `FormMessage`).
**Esforco:** 6 horas

---

## Ordem de Resolucao Recomendada (UX)

1. **DEB-009** (4h) -- Skip-to-content: requisito WCAG 2.1 Level A basico, implementacao trivial, impacto imediato para screen readers
2. **DEB-006** (4h) -- STATUS_COLORS centralizado: resolve inconsistencia visual mais visivel, desbloqueia DEB-027 e DEB-010
3. **DEB-UX-NEW-001** (6h) -- aria-live: requisito WCAG 2.1 AA para formularios, afeta todos os 15 forms
4. **DEB-008** (16h) -- Keyboard navigation: a11y compliance critica para teclado, desbloqueia conformidade
5. **DEB-024** (20h) -- Tabelas responsivas: bloqueador para app mobile, afeta 5 tabelas
6. **DEB-042** (2h) -- Breadcrumbs interativos: quick win de navegacao, componente shadcn ja suporta
7. **DEB-027** (8h) -- Hardcoded colors: fix dark mode, depende de DEB-006
8. **DEB-023** (8h) -- EmptyState adocao: consistencia visual em 25 features
9. **DEB-025** (8h) -- Draft persistence: prevenir perda de dados em 5 formularios
10. **DEB-026** (6h) -- React.memo: performance UX em listas
11. **DEB-028** (12h) -- Virtual scrolling: performance em datasets grandes
12. **DEB-043** (6h) -- Error handling consistente: depende de DEB-023
13. **DEB-UX-NEW-002** (4h) -- ErrorState adocao: complemento de DEB-043
14. **DEB-UX-NEW-003** (4h) -- Contraste de cores: auditar e corrigir, vinculado a DEB-006
15. **DEB-041** (2h) -- Reduced motion: a11y low priority mas necessario pre-app store
16. **DEB-007** (40h) -- i18n migracao: so quando expansao internacional confirmada

---

## Metricas UX Propostas

| Metrica | Valor Atual (verificado) | Meta |
|---------|------------------------|------|
| ARIA attributes totais | 86 em 44 arquivos | 200+ em 80+ arquivos |
| `aria-live` occurrences | 2 (apenas ProtectedRoute) | 20+ (todos os forms + listas) |
| `tabIndex`/`onKeyDown` | 8 em 7 arquivos | 30+ em 20+ arquivos |
| React.memo components | 19 arquivos | 30+ (incluindo list rows/cards) |
| EmptyState adocao | 5 de 30 features | 30 de 30 features |
| ErrorState adocao | 0 features | 15+ features (paginas com queries) |
| STATUS_COLORS definicoes | 8 arquivos (duplicados) | 1 arquivo (source of truth) |
| Hardcoded gray-* classes | 33 em 17 arquivos | 0 |
| Hardcoded text-white | 64+ em 30 arquivos | <10 (apenas contextos especificos) |
| Virtual scrolling adocao | 1 componente (MessageView) | 4+ (ContatosTable, ArquivadosView, NotificationsPanel, ConversationList) |
| Forms com draft persistence | 1 de 15 | 6 de 15 (formularios longos) |
| Breadcrumbs interativos | 0% | 100% |
| Skip-to-content | Ausente | Presente |
| WCAG 2.1 AA compliance | ~30% estimado | 80%+ |
| i18n coverage | 4 de 130 componentes (3%) | Incremental com features novas |
| focus-visible usage | 18 em 12 arquivos (maioria shadcn/ui) | 30+ (custom components tambem) |

---

## Parecer Final

O frontend do Jurify e **maduro e bem estruturado** para uma aplicacao em estagio inicial de producao. As escolhas arquiteturais sao solidas: shadcn/ui + Radix fornece primitivos acessiveis por default, a feature-based structure facilita manutencao, e os patterns de error handling + loading states sao consistentes nas camadas compartilhadas.

**Os debitos UX sao de natureza incremental, nao estrutural.** Nao ha problemas de arquitetura de componentes, nem de design system fundamentalmente quebrado. Os gaps sao de:

1. **Adocao incompleta de patterns ja criados** -- EmptyState, ErrorState, useDraftPersistence, React.memo, design tokens. Os componentes e hooks existem; faltou aplicar em todas as features.

2. **Acessibilidade superficial** -- A base esta la (Radix, ARIA em 44 arquivos, focus-visible em shadcn/ui), mas a camada de aplicacao (keyboard nav, skip-to-content, aria-live, contraste) nao foi completada. Isso e corrigivel com ~26h de trabalho focado.

3. **Preparacao mobile prematura** -- Capacitor esta configurado com hooks nativos, mas as paginas core (tabelas) nao foram adaptadas. Resolver antes de qualquer publicacao em app store.

**Saude UX geral: 7/10.** Os 3 pontos ausentes sao acessibilidade (1.5), mobile readiness (1), e consistencia visual (0.5). Nenhum e bloqueador para operacao atual, mas devem ser resolvidos antes de escalar para mais clientes ou publicar app mobile.

**Esforco total de todos os debitos UX (incluindo novos): ~150 horas.**

---

*Documento gerado por @ux-design-expert (Uma) durante Brownfield Discovery Phase 6.*
*Proximo: @qa (Phase 7 -- QA Review geral).*
