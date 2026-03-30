import { createClient } from "jsr:@supabase/supabase-js@2";

interface BudgetCheckResult {
  allowed: boolean;
  tokensUsed: number;
  budgetLimit: number;
  thresholdReached: boolean;
}

/**
 * Check if a tenant has AI budget remaining before making an OpenAI call.
 */
export async function checkBudgetBeforeCall(
  tenantId: string
): Promise<{ allowed: boolean; tokensUsed: number; budgetLimit: number }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabase
    .from("ai_usage")
    .select("tokens_used, budget_limit")
    .eq("tenant_id", tenantId)
    .eq("usage_date", new Date().toISOString().split("T")[0])
    .maybeSingle();

  if (error) {
    console.error("Budget check failed:", error.message);
    return { allowed: true, tokensUsed: 0, budgetLimit: 100000 };
  }

  if (!data) {
    return { allowed: true, tokensUsed: 0, budgetLimit: 100000 };
  }

  return {
    allowed: data.tokens_used < data.budget_limit,
    tokensUsed: data.tokens_used,
    budgetLimit: data.budget_limit,
  };
}

/**
 * Record tokens used after an AI call completes.
 * Fires alert notification when 80% threshold is crossed.
 */
export async function recordTokenUsage(
  tenantId: string,
  tokensUsed: number
): Promise<BudgetCheckResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabase.rpc("increment_ai_usage", {
    p_tenant_id: tenantId,
    p_tokens: tokensUsed,
  });

  if (error) {
    console.error("Record token usage failed:", error.message);
    return { allowed: true, tokensUsed: 0, budgetLimit: 100000, thresholdReached: false };
  }

  const result = data?.[0] ?? data;
  const thresholdReached = result?.threshold_reached ?? false;

  if (thresholdReached) {
    await sendBudgetAlert(supabase, tenantId, result.tokens_used, result.budget_limit);
    await supabase.rpc("mark_ai_usage_alert_sent", { p_tenant_id: tenantId });
  }

  return {
    allowed: !result?.over_budget,
    tokensUsed: result?.tokens_used ?? 0,
    budgetLimit: result?.budget_limit ?? 100000,
    thresholdReached,
  };
}

async function sendBudgetAlert(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  tokensUsed: number,
  budgetLimit: number
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
