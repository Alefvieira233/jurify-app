/**
 * tribunal-sync — fetches processo andamentos from the configured tribunal
 * provider (Escavador by default) and upserts them into processo_andamentos.
 *
 * Scheduled via external cron (GitHub Actions workflow) — see
 * .github/workflows/cron-jobs.yml (to be wired by the scheduling Onda 2 agent).
 * Runs every 6h for all tenants with processos where
 * last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '6 hours'.
 *
 * Auth:
 *   - service_role token (cron / batch)
 *   - or tenant-user JWT (manual "Sincronizar agora" button)
 *
 * Body variants:
 *   { processo_id: uuid }                             — single sync (user-triggered)
 *   { tenant_id: uuid, batch: true, limit?: number }  — bulk sync (cron only)
 *
 * Response: { synced: number, inserted: number, errors: [{ processo_id, message }] }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { withRetry } from "../_shared/openai-retry.ts";
import {
  getTribunalProvider,
  ProviderNotConfiguredError,
  type TribunalAndamento,
  type TribunalProvider,
} from "../_shared/providers/tribunal/index.ts";

type ProcessoRow = {
  id: string;
  tenant_id: string;
  numero_processo: string | null;
  last_sync_at: string | null;
};

type SyncError = { processo_id: string; message: string };

interface SyncResult {
  synced: number;
  inserted: number;
  errors: SyncError[];
}

const DEFAULT_BATCH_LIMIT = 50;

function jsonResponse(body: unknown, status: number, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

/** Upsert andamentos for one processo. Returns count inserted/updated. */
async function persistAndamentos(
  supabase: SupabaseClient,
  processo: ProcessoRow,
  provider: TribunalProvider,
  andamentos: TribunalAndamento[],
): Promise<number> {
  if (andamentos.length === 0) return 0;

  const rows = andamentos.map((a) => ({
    tenant_id: processo.tenant_id,
    processo_id: processo.id,
    data_andamento: a.dataAndamento,
    tipo: a.tipo,
    descricao: a.descricao,
    orgao: a.orgao ?? null,
    external_id: a.externalId,
    provider: provider.name,
    raw: a.raw,
  }));

  const { error, count } = await supabase
    .from("processo_andamentos")
    .upsert(rows, {
      onConflict: "processo_id,provider,external_id",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (error) throw new Error(`upsert failed: ${error.message}`);
  return count ?? rows.length;
}

/** Sync one processo: fetch from provider + upsert + update metadata. */
export async function syncProcesso(
  supabase: SupabaseClient,
  processo: ProcessoRow,
  provider: TribunalProvider,
): Promise<{ inserted: number }> {
  if (!processo.numero_processo) {
    return { inserted: 0 };
  }

  const andamentos = await withRetry(
    () => provider.fetchAndamentos(processo.numero_processo!, processo.last_sync_at ?? undefined),
    { retries: 2, baseMs: 600, label: `tribunal:${provider.name}` },
  );

  const inserted = await persistAndamentos(supabase, processo, provider, andamentos);

  await supabase
    .from("processos")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_provider: provider.name,
      sync_error: null,
    })
    .eq("id", processo.id);

  return { inserted };
}

/** Load processos for a single-id sync (user-triggered). */
async function loadProcessoById(
  supabase: SupabaseClient,
  id: string,
): Promise<ProcessoRow | null> {
  const { data, error } = await supabase
    .from("processos")
    .select("id, tenant_id, numero_processo, last_sync_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProcessoRow | null) ?? null;
}

/** Load stale processos for batch sync (cron). */
async function loadStaleProcessos(
  supabase: SupabaseClient,
  tenantId: string,
  limit: number,
): Promise<ProcessoRow[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("id, tenant_id, numero_processo, last_sync_at")
    .eq("tenant_id", tenantId)
    .eq("status", "ativo")
    .not("numero_processo", "is", null)
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as ProcessoRow[] | null) ?? [];
}

/** Core entrypoint — exported so tests can drive it directly. */
export async function runSync(
  supabase: SupabaseClient,
  provider: TribunalProvider,
  processos: ProcessoRow[],
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, inserted: 0, errors: [] };

  for (const processo of processos) {
    try {
      const { inserted } = await syncProcesso(supabase, processo, provider);
      result.synced += 1;
      result.inserted += inserted;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ processo_id: processo.id, message });

      // Persist the error so the UI can surface it.
      await supabase
        .from("processos")
        .update({ sync_error: message.slice(0, 500) })
        .eq("id", processo.id);

      // Configuration errors: stop the whole run — retrying won't help.
      if (err instanceof ProviderNotConfiguredError) break;
    }
  }

  return result;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? undefined;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  let body: { processo_id?: string; tenant_id?: string; batch?: boolean; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, origin);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── Auth & scope resolution ────────────────────────────────────────────────
  const serviceCall = isServiceRole(req);

  let processos: ProcessoRow[] = [];

  if (body.batch && body.tenant_id) {
    // Batch sync requires service_role — no tenant user should trigger N provider calls.
    if (!serviceCall) {
      return jsonResponse({ error: "Batch sync requires service role" }, 403, origin);
    }
    const limit = Math.min(Math.max(body.limit ?? DEFAULT_BATCH_LIMIT, 1), 500);
    try {
      processos = await loadStaleProcessos(supabase, body.tenant_id, limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse({ error: message }, 500, origin);
    }
  } else if (body.processo_id) {
    // Single-processo sync: allow service_role OR tenant user who owns it.
    const processo = await loadProcessoById(supabase, body.processo_id).catch((err) => {
      console.error("[tribunal-sync] loadProcessoById failed:", err);
      return null;
    });
    if (!processo) {
      return jsonResponse({ error: "Processo not found" }, 404, origin);
    }

    if (!serviceCall) {
      // Verify the caller's JWT resolves to a user whose profile has the same tenant.
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: auth } = await userClient.auth.getUser();
      if (!auth?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401, origin);
      }
      const { data: profile } = await userClient
        .from("profiles")
        .select("tenant_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (!profile || profile.tenant_id !== processo.tenant_id) {
        return jsonResponse({ error: "Forbidden" }, 403, origin);
      }
    }

    processos = [processo];
  } else {
    return jsonResponse(
      { error: "Provide either { processo_id } or { tenant_id, batch: true }" },
      400,
      origin,
    );
  }

  // ── Provider + run ─────────────────────────────────────────────────────────
  let provider: TribunalProvider;
  try {
    provider = getTribunalProvider();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Provider init failed: ${message}` }, 500, origin);
  }

  const result = await runSync(supabase, provider, processos);
  return jsonResponse(result, 200, origin);
});
