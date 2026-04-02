# ADR-004: Error message sanitization with toUserMessage

**Status:** Accepted
**Date:** 2026-03

## Context

Backend errors (Supabase, RLS, network) were being shown directly to users via toast notifications. This exposed:

- Internal table names and column details
- RLS policy denial messages
- Database constraint violation details
- Stack traces in some edge cases

This is both a security risk (information leakage) and a UX problem (users can't act on technical errors).

## Decision

Implement a centralized `toUserMessage()` function in `src/lib/errorMessages.ts` that:

1. Accepts any error type (`unknown`)
2. Extracts the error message string safely
3. Matches against a priority-ordered regex map of known patterns
4. Returns a user-friendly Portuguese message
5. Falls back to a generic "Ocorreu um erro inesperado" message

All toast error messages in hooks and components MUST use `toUserMessage(err)` instead of raw `error.message`.

Pattern map includes:
- `permission denied|row.*level.*security` → "Voce nao tem permissao para esta acao."
- `network|fetch|timeout` → "Erro de conexao..."
- `duplicate key` → "Este registro ja existe."
- `not found|PGRST116` → "Registro nao encontrado."

## Consequences

**Positive:**
- Zero information leakage to end users
- Consistent error UX across all features
- Easy to add new error patterns centrally
- Original errors still logged via `console.error` for debugging (added 2026-04)

**Negative:**
- Some legitimate error details are hidden from power users
- Regex matching is fragile — new Supabase error formats may not match
- No error severity levels (all treated equally in toasts)
