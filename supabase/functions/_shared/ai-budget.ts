/**
 * ai-budget.ts — Unified AI budget enforcement (daily + monthly).
 *
 * Previously each edge function called `checkBudgetBeforeCall` with
 * (tenantId) only and counted monthly quota as COUNT(agent_ai_logs) rows — a
 * number that ballooned with retries and orchestrator hops. This file now
 * counts TOKENS (SUM(tokens_total)) from `ai_usage`, which is the real
 * economic unit we're rate-limiting.
 *
 * Two scopes:
 *   DAILY:   per-tenant daily budget stored in ai_usage.budget_limit
 *            (default 100_000 tokens, used as a safety net).
 *   MONTHLY: hard plan limit from subscription_plans (free/pro/enterprise).
 *
 * The caller ordering is:
 *   1. Daily check (ai_usage row for today)
 *   2. Monthly check (SUM tokens_total over last 30 days)
 *
 * Fails OPEN on infrastructure errors: serving the customer is cheaper than
 * blocking every AI response because an index is slow.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

// ---------------------------------------------------------------------------
// Plan limits (tokens/month). Keep in sync with subscription_plans.limits.
// Matches migration 20260417000004_seed_subscription_plans.sql.
// ---------------------------------------------------------------------------
const PLAN_TOKEN_LIMITS: Record<string, number> = {
  free: 100_000,
  trial: 500_000,
  pro: 5_000_000,
  enterprise: Number.POSITIVE_INFINITY,
};

// Daily budget defaults por status. Trial 50k/dia + 500k/mês conforme
// auditoria 2026-05-07 §12 Sprint 2 item 7.
const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 10_000,
  trial: 50_000,
  pro: 250_000,
  enterprise: Number.POSITIVE_INFINITY,
};

// Default when tenant has no subscription row.
const DEFAULT_PLAN = "free";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetDecision {
  allowed: boolean;
  scope?: "daily" | "monthly";
  reason?: string;
  tokens_used_day?: number;
  budget_limit_day?: number;
  tokens_used_month?: number;
  budget_limit_month?: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  tokensUsed: number;
  budgetLimit: number;
  thresholdReached: boolean;
}

export interface TokenUsageRecord {
  tenant_id: string;
  user_id?: string | null;
  agent_id?: string | null;
  model: string;
  tokens_in: number;
  tokens_out: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Internal: resolve plan for a tenant
// ---------------------------------------------------------------------------

async function resolvePlanTier(supabase: SupabaseClient, tenantId: string): Promise<string> {
  try {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const subRow = sub as { plan_id?: string; status?: string } | null;
    if (!subRow) return DEFAULT_PLAN;
    // Trial sempre usa pacote 'trial' (limites próprios) independente do plan_id.
    if (subRow.status === "trialing") return "trial";
    const planId = subRow.plan_id;
    if (planId && PLAN_TOKEN_LIMITS[planId] !== undefined) return planId;
    return DEFAULT_PLAN;
  } catch {
    return DEFAULT_PLAN;
  }
}

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ---------------------------------------------------------------------------
// Budget check — daily + monthly
// ---------------------------------------------------------------------------

/**
 * Verify the tenant has budget remaining before an AI call.
 * NOTE: overload-compatible with the legacy call signature that passed only
 * tenantId by ignoring the `model` param for the moment (we'll scale limits
 * by model later if needed).
 */
export async function checkBudgetBeforeCall(
  supabase: SupabaseClient,
  tenantId: string,
  _model?: string,
): Promise<BudgetDecision>;
/** Legacy signature — keep for call sites we haven't migrated yet. */
export async function checkBudgetBeforeCall(
  tenantId: string,
): Promise<{ allowed: boolean; tokensUsed: number; budgetLimit: number }>;
export async function checkBudgetBeforeCall(
  arg1: SupabaseClient | string,
  arg2?: string,
  _arg3?: string,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  // Legacy path: single tenantId string.
  if (typeof arg1 === "string") {
    const tenantId = arg1;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const decision = await runChecks(supabase, tenantId);
    // Collapse decision to legacy shape.
    return {
      allowed: decision.allowed,
      tokensUsed: decision.tokens_used_day ?? 0,
      budgetLimit: decision.budget_limit_day ?? 100_000,
    };
  }
  // New path: (supabase, tenantId, model?).
  const supabase = arg1 as SupabaseClient;
  const tenantId = arg2 as string;
  return runChecks(supabase, tenantId);
}

async function runChecks(supabase: SupabaseClient, tenantId: string): Promise<BudgetDecision> {
  // Resolve plan first — daily defaults dependem do plan/status.
  const plan = await resolvePlanTier(supabase, tenantId);
  const planDailyDefault = PLAN_DAILY_LIMITS[plan] ?? PLAN_DAILY_LIMITS.free!;

  // --- DAILY CHECK (ai_usage.budget_limit override OU default por plano) ---
  let tokens_used_day = 0;
  let budget_limit_day = planDailyDefault;
  try {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("tokens_used, budget_limit")
      .eq("tenant_id", tenantId)
      .eq("usage_date", new Date().toISOString().split("T")[0])
      .maybeSingle();
    if (error) {
      console.error("[ai-budget] Daily check failed — failing open:", error.message);
    } else if (data) {
      tokens_used_day = (data as { tokens_used?: number }).tokens_used ?? 0;
      // Override só vale se for explícito (>0); senão respeita default por plano.
      const explicitLimit = (data as { budget_limit?: number }).budget_limit;
      if (typeof explicitLimit === "number" && explicitLimit > 0) {
        budget_limit_day = explicitLimit;
      }
      if (budget_limit_day !== Number.POSITIVE_INFINITY && tokens_used_day >= budget_limit_day) {
        return {
          allowed: false,
          scope: "daily",
          reason: `Limite diário do plano ${plan} excedido (${tokens_used_day.toLocaleString()}/${budget_limit_day.toLocaleString()} tokens)`,
          tokens_used_day,
          budget_limit_day,
        };
      }
    }
  } catch (err) {
    console.error("[ai-budget] Daily check exception — failing open:", err instanceof Error ? err.message : err);
  }

  // --- MONTHLY CHECK (SUM tokens_total from ai_usage over current month) ---
  const budget_limit_month = PLAN_TOKEN_LIMITS[plan] ?? PLAN_TOKEN_LIMITS.free!;

  if (budget_limit_month !== Number.POSITIVE_INFINITY) {
    try {
      const { data: monthRows, error: monthErr } = await supabase
        .from("ai_usage")
        .select("tokens_total, tokens_used")
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfMonthISO());

      if (monthErr) {
        console.error("[ai-budget] Monthly check failed — failing open:", monthErr.message);
      } else {
        let tokens_used_month = 0;
        for (const r of monthRows ?? []) {
          const row = r as { tokens_total?: number | null; tokens_used?: number | null };
          tokens_used_month += row.tokens_total ?? row.tokens_used ?? 0;
        }
        if (tokens_used_month >= budget_limit_month) {
          return {
            allowed: false,
            scope: "monthly",
            reason: `Limite mensal do plano ${plan} excedido (${tokens_used_month.toLocaleString()}/${budget_limit_month.toLocaleString()} tokens)`,
            tokens_used_day,
            budget_limit_day,
            tokens_used_month,
            budget_limit_month,
          };
        }
        return {
          allowed: true,
          tokens_used_day,
          budget_limit_day,
          tokens_used_month,
          budget_limit_month,
        };
      }
    } catch (err) {
      console.error("[ai-budget] Monthly check exception — failing open:", err instanceof Error ? err.message : err);
    }
  }

  return {
    allowed: true,
    tokens_used_day,
    budget_limit_day,
    budget_limit_month,
  };
}

// ---------------------------------------------------------------------------
// Record usage — now populates tokens_in, tokens_out, and the legacy tokens_used
// counter. The tokens_total column is a generated column on the DB side.
// ---------------------------------------------------------------------------

/**
 * New token-granular signature used by `ai-caller.ts`.
 */
export async function recordTokenUsage(
  supabase: SupabaseClient,
  record: TokenUsageRecord,
): Promise<BudgetCheckResult>;
/** Legacy signature: `recordTokenUsage(tenantId, tokensUsed)`. */
export async function recordTokenUsage(
  tenantId: string,
  tokensUsed: number,
): Promise<BudgetCheckResult>;
export async function recordTokenUsage(
  arg1: SupabaseClient | string,
  arg2: TokenUsageRecord | number,
): Promise<BudgetCheckResult> {
  // Normalize to the new shape.
  let supabase: SupabaseClient;
  let tenantId: string;
  let tokens_in = 0;
  let tokens_out = 0;
  let tokensTotal = 0;

  if (typeof arg1 === "string") {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    tenantId = arg1;
    tokensTotal = arg2 as number;
    tokens_out = tokensTotal; // legacy callers don't split in/out — attribute to completion.
  } else {
    supabase = arg1;
    const rec = arg2 as TokenUsageRecord;
    tenantId = rec.tenant_id;
    tokens_in = rec.tokens_in ?? 0;
    tokens_out = rec.tokens_out ?? 0;
    tokensTotal = tokens_in + tokens_out;
  }

  // Atomic upsert + threshold check via existing RPC (which still tracks
  // tokens_used for the daily budget_limit). Then backfill tokens_in/tokens_out.
  const { data, error } = await supabase.rpc("increment_ai_usage", {
    p_tenant_id: tenantId,
    p_tokens: tokensTotal,
  });

  if (error) {
    console.error("[ai-budget] Token usage recording FAILED (fail-open):", error.message);
    return { allowed: true, tokensUsed: 0, budgetLimit: 100_000, thresholdReached: false };
  }

  // deno-lint-ignore no-explicit-any
  const result: any = Array.isArray(data) ? data[0] : data;
  const thresholdReached = !!result?.threshold_reached;

  // Backfill the token-split columns on today's row. Generated column
  // `tokens_total` recomputes automatically from tokens_in + tokens_out.
  // Using raw increment so concurrent calls don't clobber each other.
  try {
    await supabase.rpc("increment_ai_token_split", {
      p_tenant_id: tenantId,
      p_tokens_in: tokens_in,
      p_tokens_out: tokens_out,
    });
  } catch {
    // RPC may not exist on older databases — silently skip; tokens_used still tracked.
  }

  if (thresholdReached) {
    await sendBudgetAlert(supabase, tenantId, result.tokens_used, result.budget_limit);
    await supabase.rpc("mark_ai_usage_alert_sent", { p_tenant_id: tenantId });
  }

  return {
    allowed: !result?.over_budget,
    tokensUsed: result?.tokens_used ?? 0,
    budgetLimit: result?.budget_limit ?? 100_000,
    thresholdReached,
  };
}

async function sendBudgetAlert(
  supabase: SupabaseClient,
  tenantId: string,
  tokensUsed: number,
  budgetLimit: number,
): Promise<void> {
  try {
    const percentage = Math.round((tokensUsed / budgetLimit) * 100);
    await supabase.from("notificacoes").insert({
      tenant_id: tenantId,
      tipo: "alerta",
      titulo: "Limite de uso de IA",
      mensagem: `Seu uso de IA atingiu ${percentage}% do limite diário (${tokensUsed.toLocaleString()} de ${budgetLimit.toLocaleString()} tokens).`,
      lida: false,
    });
  } catch (err) {
    console.error("Failed to send budget alert:", err);
  }
}
