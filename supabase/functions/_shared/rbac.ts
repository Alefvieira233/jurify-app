/**
 * 🛡️ RBAC — Server-side role checks for Edge Functions
 *
 * Mirrors the contract used by `src/hooks/useRBAC.ts` so client-side and
 * server-side decisions cannot diverge. Edge Functions that mutate
 * tenant-scoped resources MUST gate writes through `requireRole` (or one of
 * the convenience wrappers) rather than relying solely on RLS, because the
 * service-role key used inside Edge Functions bypasses RLS.
 *
 * Sources of truth:
 *   1. `public.user_roles` (authoritative, multi-role per user)
 *   2. `public.profiles.role` (single-role legacy column, kept for backward
 *      compatibility with tenants that haven't been backfilled)
 *
 * The union of both sources is considered. The migration
 * 20260310000001_fix_app_role_enum.sql normalised values to the English
 * canonical set (admin/manager/user/viewer).
 */

import type { createClient } from "jsr:@supabase/supabase-js@2";

export type AppRole = "admin" | "manager" | "user" | "viewer";

const APP_ROLES: ReadonlySet<AppRole> = new Set(["admin", "manager", "user", "viewer"]);

/** Hierarchy weights — higher number wins when collapsing to a single role. */
const ROLE_WEIGHT: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(
    message: string,
    public readonly userId: string,
    public readonly required: readonly AppRole[],
    public readonly actual: readonly AppRole[],
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.has(value as AppRole);
}

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Reads the union of roles granted to a user. Always uses the service-role
 * client (passed in) so the lookup itself is not subject to RLS.
 *
 * Returns `Set<AppRole>` — empty set means "no recognized role"; callers
 * should treat that as deny.
 */
export async function getUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<AppRole>> {
  const roles = new Set<AppRole>();

  // user_roles — canonical, multi-role
  const { data: ur } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  for (const row of (ur ?? []) as Array<{ role: unknown }>) {
    if (isAppRole(row.role)) roles.add(row.role);
  }

  // profiles.role — single-role legacy fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const profileRole = (profile as { role?: unknown } | null)?.role;
  if (isAppRole(profileRole)) roles.add(profileRole);

  return roles;
}

/**
 * Collapses a user's role set to a single highest-priority role, defaulting
 * to "viewer" when no recognised role is present. Useful for telemetry and
 * for callers that want to mirror the old single-role API.
 */
export async function getEffectiveRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole> {
  const roles = await getUserRoles(supabase, userId);
  let max: AppRole = "viewer";
  for (const r of roles) {
    if (ROLE_WEIGHT[r] > ROLE_WEIGHT[max]) max = r;
  }
  return max;
}

/** True when the user has at least one of the allowed roles. */
export async function hasAnyRole(
  supabase: SupabaseClient,
  userId: string,
  allowed: readonly AppRole[],
): Promise<boolean> {
  const roles = await getUserRoles(supabase, userId);
  for (const r of allowed) if (roles.has(r)) return true;
  return false;
}

/**
 * Throws `ForbiddenError` (status 403) if the user does not have any of the
 * allowed roles. Returns the matched role on success.
 *
 * @example
 *   try {
 *     await requireRole(supabase, user.id, ["admin", "manager", "user"]);
 *   } catch (err) {
 *     if (err instanceof ForbiddenError) return forbiddenResponse(err);
 *     throw err;
 *   }
 */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  allowed: readonly AppRole[],
): Promise<AppRole> {
  if (allowed.length === 0) {
    throw new Error("requireRole called with empty allowed list — programming error");
  }
  const roles = await getUserRoles(supabase, userId);
  for (const r of allowed) if (roles.has(r)) return r;
  const actual = Array.from(roles);
  throw new ForbiddenError(
    `Forbidden: requires one of [${allowed.join(", ")}], user has [${actual.join(", ") || "none"}]`,
    userId,
    allowed,
    actual,
  );
}

/**
 * Builds a 403 JSON response without leaking the privileged role list to the
 * client. Logs the full reason server-side via console.warn so ops can
 * observe denials.
 */
export function forbiddenResponse(
  err: ForbiddenError,
  corsHeaders: Record<string, string> = {},
): Response {
  console.warn(
    `[rbac] DENY user=${err.userId} required=[${err.required.join(",")}] actual=[${err.actual.join(",") || "none"}]`,
  );
  return new Response(
    JSON.stringify({
      success: false,
      error: "Forbidden: insufficient role for this action",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ─── Convenience matchers, mirroring src/types/rbac.ts hierarchy ─────────────

/** Roles allowed to write/manage `conexoes` resources (matches matrix). */
export const CONEXOES_WRITE_ROLES: readonly AppRole[] = ["admin", "manager", "user"];

/** Roles allowed to write/manage `integracoes` resources (matches matrix). */
export const INTEGRACOES_WRITE_ROLES: readonly AppRole[] = ["admin"];

/** Admin-only: usuários, fluxos e regras críticas. */
export const ADMIN_ONLY: readonly AppRole[] = ["admin"];
