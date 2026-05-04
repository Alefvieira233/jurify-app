/**
 * Auto-Reply Handler — greeting + away
 *
 * Decide se uma mensagem inbound deve receber resposta automática:
 *   - greeting: primeira interação dessa conversation
 *   - away: fora do horário comercial configurado
 *
 * Anti-spam: registra em whatsapp_auto_reply_log; mesma conversation
 * não recebe greeting 2x; away dispara no máximo 1x a cada 4h.
 */

import { kapsoFetchWithKey, type KapsoTenantConfig } from "./kapso-client.ts";

interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
}

interface AutoReplyRow {
  id: string;
  type: 'greeting' | 'away';
  message: string;
  enabled: boolean;
  business_hours: Array<{ day: string; start: string; end: string }>;
}

const AWAY_COOLDOWN_HOURS = 4;
const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

function isWithinBusinessHours(rules: Array<{ day: string; start: string; end: string }>, now: Date): boolean {
  if (!rules || rules.length === 0) return true; // sem regras = sempre dentro
  // Convert UTC to America/Sao_Paulo (UTC-3) approximately
  // Para precisão maior, usaria Intl.DateTimeFormat com timeZone
  const saoPaulo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const day = DAY_MAP[saoPaulo.getUTCDay()];
  const hh = saoPaulo.getUTCHours();
  const mm = saoPaulo.getUTCMinutes();
  const currentMin = hh * 60 + mm;

  for (const rule of rules) {
    if (rule.day !== day) continue;
    const [sh, sm] = (rule.start || '09:00').split(':').map(Number);
    const [eh, em] = (rule.end || '18:00').split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (currentMin >= startMin && currentMin <= endMin) return true;
  }
  return false;
}

async function isFirstMessageEver(supabase: SupabaseLike, conversationId: string): Promise<boolean> {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  const { count } = await client
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  return (count ?? 0) <= 1;
}

async function alreadySentRecently(
  supabase: SupabaseLike,
  conversationId: string,
  type: 'greeting' | 'away',
  cooldownHours = 0,
): Promise<boolean> {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  let query = client
    .from('whatsapp_auto_reply_log')
    .select('sent_at')
    .eq('conversation_id', conversationId)
    .eq('type', type)
    .order('sent_at', { ascending: false })
    .limit(1);

  const { data } = await query;
  const last = (data as Array<{ sent_at: string }>)?.[0]?.sent_at;
  if (!last) return false;
  if (cooldownHours <= 0) return true; // greeting: 1x só
  const ageHours = (Date.now() - new Date(last).getTime()) / 3_600_000;
  return ageHours < cooldownHours;
}

/**
 * Decide e envia auto-reply quando uma mensagem inbound chega.
 * Chamado pelo webhook após persistir a mensagem.
 *
 * Returns the type of reply sent, or null if none.
 */
export async function maybeSendAutoReply(
  supabase: SupabaseLike,
  kapsoConfig: KapsoTenantConfig | null,
  params: {
    tenantId: string;
    conversationId: string;
    fromPhone: string;
  },
): Promise<'greeting' | 'away' | null> {
  if (!kapsoConfig?.phoneNumberId) return null;

  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  const { data: rules } = await client
    .from('whatsapp_auto_replies')
    .select('id, type, message, enabled, business_hours')
    .eq('tenant_id', params.tenantId)
    .eq('enabled', true);

  const enabled = (rules as AutoReplyRow[]) || [];
  if (enabled.length === 0) return null;

  // Prioridade 1: greeting (só na 1ª mensagem)
  const greeting = enabled.find(r => r.type === 'greeting');
  if (greeting) {
    const isFirst = await isFirstMessageEver(supabase, params.conversationId);
    const sent = await alreadySentRecently(supabase, params.conversationId, 'greeting', 0);
    if (isFirst && !sent) {
      const ok = await sendAutoReply(kapsoConfig, params.fromPhone, greeting.message);
      if (ok) {
        await logSent(supabase, params.tenantId, params.conversationId, 'greeting');
        return 'greeting';
      }
    }
  }

  // Prioridade 2: away (fora do horário)
  const away = enabled.find(r => r.type === 'away');
  if (away) {
    const within = isWithinBusinessHours(away.business_hours || [], new Date());
    if (within) return null; // dentro do horário, não dispara
    const recent = await alreadySentRecently(supabase, params.conversationId, 'away', AWAY_COOLDOWN_HOURS);
    if (recent) return null;
    const ok = await sendAutoReply(kapsoConfig, params.fromPhone, away.message);
    if (ok) {
      await logSent(supabase, params.tenantId, params.conversationId, 'away');
      return 'away';
    }
  }

  return null;
}

async function sendAutoReply(
  config: KapsoTenantConfig,
  to: string,
  text: string,
): Promise<boolean> {
  if (!config.phoneNumberId) return false;
  const phone = to.replace(/\D/g, '');
  try {
    const res = await kapsoFetchWithKey(
      config.apiKey,
      `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      },
      config.apiUrl,
    );
    return res.ok;
  } catch (err) {
    console.error('[auto-reply] send failed:', err);
    return false;
  }
}

async function logSent(supabase: SupabaseLike, tenantId: string, conversationId: string, type: 'greeting' | 'away') {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  await client.from('whatsapp_auto_reply_log').insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    type,
    sent_at: new Date().toISOString(),
  });
}
