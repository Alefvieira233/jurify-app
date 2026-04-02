# ADR-006: Role-based access control with permission matrix

**Status:** Accepted
**Date:** 2026-02

## Context

Different users need different access levels:
- **Admin:** Full CRUD on all resources, user management
- **Manager:** Create/read/update most resources, limited delete
- **User (advogado):** Create/read/update own resources
- **Viewer (estagiario):** Read-only access

We needed both client-side (UI) and server-side (database) enforcement.

## Decision

Implement a **two-layer RBAC system**:

### Layer 1: Client-side (UI enforcement)
- `useRBAC()` hook reads role from `AuthContext`
- `ProtectedRoute` component checks `requiredRoles` prop
- `can(resource, action)` function for conditional UI rendering
- Permission matrix defined in `src/types/rbac.ts`

### Layer 2: Server-side (database enforcement)
- `has_permission(uid, resource, action)` PostgreSQL function
- Used directly in RLS policies for INSERT/UPDATE/DELETE
- Role matrix hardcoded in function (admin > manager > user > viewer)
- `user_roles` table stores role assignments with tenant isolation

Roles: `admin`, `administrador`, `manager`, `gerente`, `advogado`, `user`, `estagiario`, `viewer`

## Consequences

**Positive:**
- Defense in depth: even if client-side is bypassed, database enforces permissions
- Single source of truth for permissions (`has_permission` function)
- UI adapts to user role (hides unauthorized actions)
- Tenant isolation on role assignments prevents cross-tenant privilege escalation

**Negative:**
- Role changes require re-login to take effect (profile cached in AuthContext)
- Dual role names (admin/administrador, user/advogado) add complexity
- Permission matrix changes require database migration
- No per-resource granular permissions (e.g., "can edit only own leads")
