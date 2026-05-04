/**
 * Trial Gate — defesa em profundidade contra trials expirados.
 *
 * Frontend bloqueia ações via TrialGate (UX). Backend valida via esta função
 * (segurança real). Se trial expirou e ação é bloqueada, retorna 402 Payment Required.
 */

type TrialAction =
  | "create_lead"
  | "edit_lead"
  | "create_processo"
  | "edit_processo"
  | "create_contrato"
  | "edit_contrato"
  | "send_whatsapp"
  | "ai_responder"
  | "create_agendamento"
  | "create_documento";

interface TrialStatus {
  has_subscription: boolean;
  is_trial: boolean;
  expired: boolean;
  status: string;
  restrictions: Record<string, boolean>;
}

interface SupabaseLike {
  rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

export interface TrialGateResult {
  allowed: boolean;
  reason?: string;
  status?: TrialStatus;
}

/**
 * Verifica se tenant pode executar a ação. Retorna allowed=false se trial expirado.
 * Use no início de qualquer edge function de mutation.
 */
export async function checkTrialAccess(
  supabase: SupabaseLike,
  tenantId: string,
  action: TrialAction,
): Promise<TrialGateResult> {
  if (!tenantId) {
    return { allowed: false, reason: "tenant_id ausente" };
  }

  try {
    const { data, error } = await supabase.rpc("get_trial_status", { p_tenant_id: tenantId });
    if (error) {
      console.error("[trial-gate] RPC error:", error);
      // Fail-open: se RPC falhar, permite (não queremos bloquear por bug interno)
      return { allowed: true };
    }
    const status = data as TrialStatus | null;
    if (!status) return { allowed: true };

    // Sem subscription = enterprise/legacy = passa
    if (!status.has_subscription) return { allowed: true };

    const restrictions = status.restrictions || {};
    const isAllowed = restrictions[action] !== false;

    if (!isAllowed && status.expired) {
      return {
        allowed: false,
        reason: "trial_expired",
        status,
      };
    }

    return { allowed: isAllowed, status };
  } catch (err) {
    console.error("[trial-gate] unexpected error:", err);
    // Fail-open
    return { allowed: true };
  }
}

/**
 * Resposta padronizada quando bloqueado pelo trial.
 */
export function trialBlockedResponse(
  reason: string,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Trial expirado. Assine um plano para continuar usando esta funcionalidade.",
      code: reason,
      paywall: true,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 402, // Payment Required
    },
  );
}
