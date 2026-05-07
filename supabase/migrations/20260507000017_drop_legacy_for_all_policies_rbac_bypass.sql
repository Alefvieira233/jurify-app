-- RBAC hardening em escala (P1.10 da auditoria 2026-05-07):
-- 4 tabelas críticas tinham policy FOR ALL legacy `*_tenant` que validava
-- apenas tenant_id (sem RBAC), em paralelo com policies separadas pra
-- INSERT/UPDATE/DELETE que validavam permissions via has_permission().
-- Postgres aplica policies via OR — a policy FOR ALL mais permissiva
-- sempre passava, anulando o RBAC das policies específicas.
-- Resultado: viewer/user podia INSERT/UPDATE/DELETE direto via API.
-- Fix: dropa as policies FOR ALL legacy. SELECT/INSERT/UPDATE/DELETE
-- ficam nas policies específicas (já cobertas, vide auditoria).

DROP POLICY IF EXISTS agendamentos_tenant ON public.agendamentos;
DROP POLICY IF EXISTS agentes_ia_tenant ON public.agentes_ia;
DROP POLICY IF EXISTS contratos_tenant ON public.contratos;
DROP POLICY IF EXISTS whatsapp_messages_tenant ON public.whatsapp_messages;
