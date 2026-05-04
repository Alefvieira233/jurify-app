/**
 * WhatsApp 24h Conversational Window Helper
 *
 * Regra Meta WhatsApp Cloud API:
 * - Cliente envia mensagem → janela de 24h se abre
 * - Durante janela: pode enviar texto, mídia, interactive, template
 * - Fora da janela: APENAS template aprovado
 *
 * Texto livre fora da janela: Meta retorna 200 mas mensagem é dropada
 * silenciosamente. Detectamos antes de chamar a API e retornamos 403 com
 * código `window_closed` para o frontend mostrar o seletor de templates.
 */

interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
  rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

export interface WindowStatus {
  is_open: boolean;
  last_inbound_at: string | null;
  expires_at: string | null;
  remaining_hours: number;
  age_hours?: number;
  reason: 'within_window' | 'window_closed' | 'no_inbound_yet' | 'no_conversation';
}

/**
 * Verifica window status diretamente no DB (não via RPC, pois service_role
 * não tem auth.uid()).
 */
export async function checkWindowByConversation(
  supabase: SupabaseLike,
  conversationId: string,
): Promise<WindowStatus> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('id, last_inbound_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (error || !data) {
    return {
      is_open: false,
      last_inbound_at: null,
      expires_at: null,
      remaining_hours: 0,
      reason: 'no_conversation',
    };
  }

  const lastInbound = (data as { last_inbound_at: string | null }).last_inbound_at;
  if (!lastInbound) {
    return {
      is_open: false,
      last_inbound_at: null,
      expires_at: null,
      remaining_hours: 0,
      reason: 'no_inbound_yet',
    };
  }

  const lastTs = new Date(lastInbound).getTime();
  const now = Date.now();
  const ageHours = (now - lastTs) / 3_600_000;
  const isOpen = ageHours < 24;
  const expiresAt = new Date(lastTs + 24 * 3_600_000).toISOString();

  return {
    is_open: isOpen,
    last_inbound_at: lastInbound,
    expires_at: expiresAt,
    remaining_hours: Math.max(0, Number((24 - ageHours).toFixed(2))),
    age_hours: Number(ageHours.toFixed(2)),
    reason: isOpen ? 'within_window' : 'window_closed',
  };
}

/**
 * Verifica window por phone_number + tenant (quando não temos conversation_id).
 */
export async function checkWindowByPhone(
  supabase: SupabaseLike,
  tenantId: string,
  phoneNumber: string,
): Promise<WindowStatus> {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('id, last_inbound_at')
    .eq('tenant_id', tenantId)
    .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone}`)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      is_open: false,
      last_inbound_at: null,
      expires_at: null,
      remaining_hours: 0,
      reason: 'no_conversation',
    };
  }

  return checkWindowByConversation(supabase, (data as { id: string }).id);
}

/**
 * Resposta padronizada quando janela está fechada.
 */
export function windowClosedResponse(
  status: WindowStatus,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Janela de 24h fechada. Para reabrir, envie um template aprovado.',
      code: 'window_closed',
      window: status,
      paywall: false,
      requiresTemplate: true,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    },
  );
}
