# Sentinel Journal - Security Learnings

## 2026-02-11 - Tenant Isolation Bypass in Edge Functions
**Vulnerability:** Edge Functions receiving `tenantId` from the request body without verifying it against the authenticated user's profile.
**Learning:** In a multi-tenant Supabase environment, Edge Functions that use the `service_role` key bypass RLS. Therefore, they must manually implement tenant isolation by fetching the user's profile and validating the requested `tenantId`.
**Prevention:** Always validate `tenant_id` from a trusted source (like the `profiles` table) when processing requests that involve tenant-specific data or resources, especially when the function has elevated privileges.
