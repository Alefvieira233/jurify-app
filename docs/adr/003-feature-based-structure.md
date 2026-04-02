# ADR-003: Feature-based directory structure

**Status:** Accepted
**Date:** 2025-06

## Context

As the application grew beyond 200 files, we needed a scalable organization strategy. Two options considered:

1. **Type-based:** Group by file type (`components/`, `hooks/`, `services/`)
2. **Feature-based:** Group by domain feature (`features/leads/`, `features/whatsapp/`)

## Decision

Use a **hybrid feature-based structure**:

```
src/
  features/           # Domain modules (self-contained)
    leads/            # Lead management
    whatsapp/         # WhatsApp integration
    pipeline/         # Kanban pipeline
    billing/          # Subscription & payments
    ai-agents/        # AI assistant
    reports/          # Analytics & reports
    ...
  hooks/              # Shared hooks (cross-feature)
  components/         # Shared UI components
  contexts/           # React contexts (Auth)
  lib/                # Utilities & services
  types/              # Shared type definitions
```

Each feature directory contains its own components, and may have sub-components extracted during refactoring (e.g., `features/automations/RuleConditionEditor.tsx`).

Shared hooks live in `src/hooks/` with JSDoc documenting their purpose.

## Consequences

**Positive:**
- Features are self-contained and easy to find
- New developers can focus on one feature without understanding the entire codebase
- Lazy loading maps naturally to feature boundaries (one chunk per feature)
- Refactoring a feature doesn't affect others

**Negative:**
- Shared hooks in `src/hooks/` grow large (67 hooks) — could benefit from subdirectories
- Some cross-cutting concerns (e.g., tenant filtering) duplicated across features
- Import paths can be long (mitigated by `@/` path alias)
