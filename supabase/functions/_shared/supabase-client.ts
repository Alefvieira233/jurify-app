import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Supabase client with service-role key (full admin access).
 * Use for cron jobs, webhooks, and internal operations.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Creates a Supabase client with the user's JWT from the request.
 * Use for user-facing operations that should respect RLS.
 */
export function getAuthClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

/**
 * Validates the request has a valid user JWT and returns the user.
 * Returns null if unauthorized.
 */
export async function getAuthUser(req: Request): Promise<{
  client: SupabaseClient;
  user: { id: string; email?: string };
} | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = getAuthClient(req);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;

  return { client, user };
}

/**
 * Checks if the request is authenticated with the service-role key.
 */
export function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return !!serviceKey && token === serviceKey;
}

/**
 * Resolves the tenant_id for a given user from their profile.
 */
export async function getTenantId(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await client
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();
  return data?.tenant_id ?? null;
}
