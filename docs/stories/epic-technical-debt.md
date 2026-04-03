# Epic: Resolucao de Debitos Tecnicos -- Jurify v1.3

## Status: Draft
## Data: 2026-04-03
## Elaborado por: @pm (Morgan) -- Brownfield Discovery Phase 10

---

## Objetivo

Eliminar 48 debitos tecnicos identificados na Brownfield Discovery, priorizando a seguranca de dados multi-tenant, criptografia de credenciais, compliance LGPD, acessibilidade WCAG 2.1, e preparacao para escala. Ao final, o Jurify tera zero credenciais em texto plano, isolamento multi-tenant completo, conformidade basica de acessibilidade, e uma base de codigo sustentavel para crescimento.

## Escopo

- **48 debitos tecnicos** identificados e validados por 4 especialistas (@architect, @data-engineer, @ux-design-expert, @qa)
- **4 sprints** de resolucao (8 semanas com 2 devs paralelos, ~6 semanas efetivas)
- **~321 horas** de trabalho estimadas
- **3 eixos:** Seguranca/DB (P0/P1), Performance/Dados (P2), UX/Acessibilidade (P1/P2)

## Criterios de Sucesso

1. [ ] Todos os debitos P0 (criticos) resolvidos -- DEB-001, DEB-002, DEB-003
2. [ ] Zero credenciais em texto plano (API keys, OAuth tokens, integration keys)
3. [ ] Score de seguranca DB: 82 -> 95+
4. [ ] Saude UX: 7/10 -> 9/10
5. [ ] WCAG 2.1 Level A compliance (~70%)
6. [ ] LGPD compliance verificado (PII redaction, retention policies, soft-delete)
7. [ ] Zero debitos criticos remanescentes
8. [ ] Cobertura de testes mantida (1220+)
9. [ ] Build time nao degradado (< 25s)
10. [ ] 100% Edge Functions incluidas no deploy pipeline

## Budget

| Metrica | Valor |
|---------|-------|
| Estimativa total | R$ 47.850 |
| Base | R$ 150/hora |
| ROI global | 16:1 a 66:1 |
| Fases 1-2 (seguranca) | R$ 9.150 (ROI 159:1 a 635:1) |
| Fases 3-4 (qualidade) | R$ 23.550 |
| Backlog futuro (i18n, partitioning) | R$ 15.150 |

## Timeline

| Sprint | Foco | Semanas | Horas | Stories |
|--------|------|---------|-------|---------|
| 1 | Security & Critical | 1-2 | 15h | 1.1, 1.2, 1.3 |
| 2 | Data Integrity & Design System | 3-4 | 46h | 2.1, 2.2, 2.3 |
| 3 | Normalization, UX & Compliance | 5-6 | 92h | 3.1, 3.2, 3.3 |
| 4 | Tech Debt & Polish | 7-8 | 65h | 4.1, 4.2, 4.3 |

**Equipe:** 2 desenvolvedores paralelos (1 backend/DB + 1 frontend)

## Stories

### Sprint 1: Security & Critical (Semanas 1-2)
- [1.1 - Fix Critical Security](1.1-fix-critical-security.md) -- tenant_id NOT NULL + API keys hashing (10h)
- [1.2 - Deploy Missing Edge Functions](1.2-deploy-missing-edge-functions.md) -- 14 Edge Functions + Sentry config (4h)
- [1.3 - Credential Encryption](1.3-credential-encryption.md) -- OpenAI key rotation + quick wins DB (3h)

### Sprint 2: Data Integrity & Design System (Semanas 3-4)
- [2.1 - Credential Encryption Phase 2](2.1-database-constraints-indexes.md) -- OAuth + integration keys + CHECK constraints (12h)
- [2.2 - Design System Alignment](2.2-data-consolidation.md) -- STATUS_COLORS + contraste + indexes (9h)
- [2.3 - Accessibility Foundation](2.3-query-optimization.md) -- skip-to-content + aria-live + keyboard nav (26h)

### Sprint 3: Normalization, UX & Compliance (Semanas 5-6)
- [3.1 - Database Normalization & Compliance](3.1-design-system-consistency.md) -- Tags, columns, soft-delete, PII, retention (30h)
- [3.2 - UX Consistency & Mobile](3.2-accessibility.md) -- Responsive tables, EmptyState, draft persistence, breadcrumbs (38h)
- [3.3 - Code Quality & State Management](3.3-mobile-responsiveness.md) -- Query key factory, hardcoded colors, rate limiter, supabaseUntyped (24h)

### Sprint 4: Tech Debt & Polish (Semanas 7-8)
- [4.1 - Performance & Virtual Scrolling](4.1-bundle-optimization.md) -- React.memo, virtual scrolling, Supabase calls (30h)
- [4.2 - Bundle Optimization & Observability](4.2-ux-polish.md) -- Sentry/Recharts bundle, FKs, column projection (12h)
- [4.3 - Polish & Standards](4.3-code-cleanup.md) -- Error handling, ErrorState, reduced-motion, naming, normalize patterns (21h)

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|-------|---------------|---------|-----------|
| 1 | Vazamento de dados entre tenants | Media | Critico | Cadeia de seguranca Sprint 1 (DEB-001/002). Verificar storage bucket policies. |
| 2 | Credenciais expostas em breach | Media | Critico | 4 tipos de credenciais em plaintext. Resolver atomicamente Sprints 1-2. |
| 3 | Deploy de encrypt/decrypt bloqueado | Alta | Alto | encrypt-data/decrypt-data ausentes do deploy. Resolver em Sprint 1 (DEB-012) antes de qualquer criptografia. |
| 4 | Regressao em migracao tenant_id NOT NULL | Media | Alto | Auditar INSERTs em Edge Functions. Funcoes ausentes do deploy podem ter INSERTs sem tenant_id. |
| 5 | LGPD compliance gap em AI logs | Media | Alto | Dados legais confidenciais em plaintext. Critico para sigilo profissional (Art. 34 OAB). |
| 6 | Mobile readiness prematura | Baixa | Medio | Capacitor configurado mas tabelas nao responsivas. Nao publicar em app store antes de Sprint 3. |
| 7 | Observabilidade incompleta | Media | Medio | Sentry nao configurado + funcoes nao deploiadas = pontos cegos duplos. |
| 8 | Tags unification regressao | Media | Medio | Multiplos componentes frontend usam sistemas diferentes. Feature flag obrigatorio. |

## Dependencias entre Sprints

### Cadeia Critica de Seguranca
```
Sprint 1: DEB-012 (Edge Functions deploy) ---> Sprint 2: DEB-004 (OAuth encrypt) + DEB-044 (config encrypt)
Sprint 1: DEB-001 (tenant_id NOT NULL) ---> Sprint 1: DEB-002 (API keys hash)
Sprint 1: DEB-001 ---> Sprint 2: DEB-044 (config encrypt)
```

### Cadeias dentro dos Sprints
```
DEB-006 (STATUS_COLORS) ---> DEB-027 (hardcoded colors) [Sprint 2 -> Sprint 3]
DEB-009 (skip-to-content) ---> DEB-008 (keyboard nav) [Sprint 2]
DEB-020 (query key factory) ---> DEB-021 (Supabase calls) [Sprint 3 -> Sprint 4]
DEB-026 (React.memo) ---> DEB-028 (virtual scrolling) [Sprint 4]
DEB-023 (EmptyState) ---> DEB-043 (error handling) ---> DEB-047 (ErrorState) [Sprint 3 -> Sprint 4]
DEB-011 (Sentry config) ---> DEB-036 (Sentry bundle) [Sprint 1 -> Sprint 4]
```

### Itens Adiados (Backlog v1.4+)
- DEB-007: i18n completo (38h restantes) -- quando expansao internacional confirmada
- DEB-016: leads satellite tables (10h restantes) -- quando >50K rows por tenant
- DEB-034: Partitioning strategy (8h) -- quando monitoramento indicar necessidade
- DEB-038: i18n test infrastructure -- junto com DEB-007
- DEB-039: Capacitor vulnerabilities (2h) -- quando fix upstream disponivel

## Decisoes Arquiteturais Definitivas

| Decisao | Fonte |
|---------|-------|
| Tag system: manter `tags`/`lead_tags` como unico | @data-engineer |
| Soft-delete: `deleted_at timestamptz` + manter `ativo` | @data-engineer |
| API key hash: SHA-256 com salt | @data-engineer |
| leads extraction: column projection (quick win), satellite tables adiado para v1.4 | @data-engineer |
| exec_sql(): remover de producao | @data-engineer |
| STATUS_COLORS: alinhar com CHECK constraints do banco | @ux-design-expert |
| Mobile tables: abordagem hibrida 3 niveis (desktop/tablet/mobile) | @ux-design-expert |
| i18n: abordagem incremental (sidebar agora, componentes ao tocar) | @ux-design-expert |

## Metricas de Sucesso por Fase

| Metrica | Hoje | Apos Sprint 2 | Apos Sprint 4 |
|---------|------|---------------|---------------|
| Credenciais em texto plano | 4 tipos | **0** | 0 |
| Tabelas com isolamento falho | 10 | **0** | 0 |
| Monitoramento em producao | Ausente | **Ativo (Sentry)** | Ativo + otimizado |
| Conformidade WCAG 2.1 | ~30% | **~70% (Level A)** | ~80% (Level AA parcial) |
| Edge Functions em producao | 18 de 32 | **32 de 32** | 32 de 32 |
| App mobile viavel | Nao | Parcialmente | **Sim** |
| Velocidade de desenvolvimento | Baseline | +10% | **+25-30%** |

## Documentos de Referencia

| Documento | Localizacao |
|-----------|-------------|
| Assessment tecnico (FINAL) | `docs/prd/technical-debt-assessment.md` |
| Relatorio executivo | `docs/reports/TECHNICAL-DEBT-REPORT.md` |
| Aprovacao QA | `docs/reviews/qa-review.md` |
| Revisao DB | `docs/reviews/db-specialist-review.md` |
| Revisao UX | `docs/reviews/ux-specialist-review.md` |
| Assessment DRAFT | `docs/prd/technical-debt-DRAFT.md` |
| DB Audit | `supabase/docs/DB-AUDIT.md` |
| Frontend Spec | `docs/frontend/frontend-spec.md` |

---

*Epic criado por @pm (Morgan) durante Brownfield Discovery Phase 10.*
*Proximo: @sm (River) para criar stories detalhadas, @po (Pax) para validacao.*
