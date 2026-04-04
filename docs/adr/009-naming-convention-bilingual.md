# ADR 009: Convenção de Naming Bilíngue (PT/EN)

## Status: Accepted
## Data: 2026-04-04

## Contexto

O codebase Jurify possui tabelas e colunas em português (legado do Lovable/v0.dev) e código TypeScript em inglês. Renomear tabelas existentes causaria breaking changes massivos em RLS policies, Edge Functions, e frontend.

## Decisão

1. **Tabelas existentes:** NÃO renomear. Manter nomes em português.
2. **Novas tabelas:** Usar inglês, snake_case (ex: `workflow_steps`, não `etapas_fluxo`).
3. **Colunas:** Manter o idioma da tabela pai. Não misturar PT e EN na mesma tabela.
4. **TypeScript:** Sempre em inglês (variáveis, tipos, interfaces, hooks).
5. **Componentes React:** Sempre em inglês (PascalCase).
6. **User-facing strings:** Sempre em português (via i18n ou hardcoded PT-BR).

## Consequências

- Desenvolvedores devem consultar types.ts para nomes de tabelas/colunas
- Novas features usam convenção EN consistente
- Mapeamento PT→EN documentado em SCHEMA.md para referência
