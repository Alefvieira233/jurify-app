/**
 * ZapSign Webhook Callback
 *
 * Receives asynchronous events from ZapSign when a document changes state:
 *   - doc_pending  → contrato.status_assinatura = 'pendente'
 *   - doc_signed   → contrato.status_assinatura = 'assinado', data_assinatura = now
 *   - doc_refused  → contrato.status_assinatura = 'recusado'
 *   - doc_expired  → contrato.status_assinatura = 'expirado'
 *
 * Security:
 *   - HMAC verification via ZAPSIGN_WEBHOOK_SECRET. If the secret is NOT set,
 *     we return 503 and log ERROR (same failure mode as stripe-webhook).
 *   - Timing-safe signature comparison via WebCrypto.
 *
 * Idempotency:
 *   - Dedup key = `${zapsign_document_id}:${event_type}:${signed_at||created_at}`
 *     persisted in webhook_events (source='zapsign').
 *
 * Matching:
 *   - `external_id` on the ZapSign payload is the `contratos.id` we sent when
 *     creating the document. We ALSO fallback to zapsign_document_id if the
 *     external_id is absent.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ZapSignWebhookPayload {
  event_type?: string;
  doc_status?: string;
  external_id?: string;
  token?: string; // ZapSign document uuid
  open_id?: number;
  name?: string;
  status?: string;
  signed_file?: string;
  created_at?: string;
  last_update_at?: string;
  signers?: Array<{ name?: string; email?: string; status?: string }>;
}

// ─── HMAC verification ──────────────────────────────────────────────────────

/** Hex → Uint8Array. Returns null on malformed input. */
function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(b)) return null;
    out[i] = b;
  }
  return out;
}

/** Timing-safe equality for Uint8Arrays. */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyHmac(body: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  // Accept raw hex or "sha256=<hex>" forms.
  const rawHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;
  const provided = hexToBytes(rawHex.trim());
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computed = new Uint8Array(sig);
  return timingSafeEqualBytes(provided, computed);
}

// ─── Status mapping ─────────────────────────────────────────────────────────

function mapStatus(eventType: string | undefined, docStatus: string | undefined): string {
  const et = (eventType ?? '').toLowerCase();
  const ds = (docStatus ?? '').toLowerCase();
  if (et.includes('signed') || ds === 'signed' || ds === 'assinado') return 'assinado';
  if (et.includes('refused') || ds === 'refused' || ds === 'recusado') return 'recusado';
  if (et.includes('expired') || ds === 'expired' || ds === 'expirado') return 'expirado';
  if (et.includes('cancelled') || et.includes('canceled') || ds === 'cancelled') return 'cancelado';
  if (et.includes('pending') || ds === 'pending' || !ds) return 'pendente';
  // Fallback
  return 'pendente';
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('ZAPSIGN_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error(
      '[zapsign-webhook] ZAPSIGN_WEBHOOK_SECRET not configured — rejecting all deliveries. ' +
        'Set via `supabase secrets set ZAPSIGN_WEBHOOK_SECRET=...` and redeploy.',
    );
    return new Response(
      JSON.stringify({ error: 'Webhook signing secret not configured', code: 'MISSING_WEBHOOK_SECRET' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const body = await req.text();
  // Accept multiple header names since ZapSign's exact header varies by plan.
  const signatureHeader =
    req.headers.get('X-Zapsign-Signature') ??
    req.headers.get('X-ZapSign-Signature') ??
    req.headers.get('x-zapsign-signature') ??
    req.headers.get('X-Signature');

  const valid = await verifyHmac(body, signatureHeader, webhookSecret);
  if (!valid) {
    console.warn('[zapsign-webhook] Invalid HMAC signature — rejecting payload');
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: ZapSignWebhookPayload;
  try {
    payload = JSON.parse(body) as ZapSignWebhookPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const externalId = payload.external_id?.trim();
  const zapSignToken = payload.token?.trim();
  const eventType = payload.event_type ?? payload.status ?? 'unknown';
  const docStatus = payload.doc_status ?? payload.status;
  const newStatus = mapStatus(eventType, docStatus);

  if (!externalId && !zapSignToken) {
    return new Response(
      JSON.stringify({ error: 'Missing external_id or token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Idempotency: { zapsign_token or external_id } + event_type + last_update_at
  const dedupKey = `${zapSignToken ?? externalId}:${eventType}:${payload.last_update_at ?? payload.created_at ?? ''}`;
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_id', dedupKey)
    .eq('source', 'zapsign')
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find the contrato — prefer external_id (which is our contratos.id) then
  // zapsign_document_id fallback.
  let contratoId: string | null = null;
  let tenantId: string | null = null;

  if (externalId) {
    const { data: byExternal } = await supabase
      .from('contratos')
      .select('id, tenant_id')
      .eq('id', externalId)
      .maybeSingle();
    if (byExternal) {
      contratoId = byExternal.id;
      tenantId = byExternal.tenant_id;
    }
  }
  if (!contratoId && zapSignToken) {
    const { data: byToken } = await supabase
      .from('contratos')
      .select('id, tenant_id')
      .eq('zapsign_document_id', zapSignToken)
      .maybeSingle();
    if (byToken) {
      contratoId = byToken.id;
      tenantId = byToken.tenant_id;
    }
  }

  if (!contratoId) {
    console.warn(
      `[zapsign-webhook] contrato não encontrado externalId=${externalId ?? 'n/a'} token=${zapSignToken ?? 'n/a'} — ignorando`,
    );
    // Still record the dedup so ZapSign doesn't retry forever.
    await supabase.from('webhook_events').insert({ event_id: dedupKey, source: 'zapsign' });
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build the update. When signed, set data_assinatura to now (if not already).
  const update: Record<string, unknown> = { status_assinatura: newStatus };
  if (newStatus === 'assinado') {
    update.data_assinatura = new Date().toISOString();
    if (payload.signed_file) {
      update.signed_file_url = payload.signed_file;
    }
  }

  const { error: updateError } = await supabase
    .from('contratos')
    .update(update)
    .eq('id', contratoId);

  if (updateError) {
    console.error(`[zapsign-webhook] update contrato falhou id=${contratoId}: ${updateError.message}`);
    return new Response(
      JSON.stringify({ error: 'Update failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Audit log in zapsign_logs (best-effort).
  await supabase.from('zapsign_logs').insert({
    contrato_id: contratoId,
    evento: newStatus,
    dados_evento: {
      event_type: eventType,
      doc_status: docStatus,
      external_id: externalId ?? null,
      token: zapSignToken ?? null,
      last_update_at: payload.last_update_at ?? null,
    },
  }).then(({ error }) => {
    if (error) console.warn(`[zapsign-webhook] zapsign_logs insert failed: ${error.message}`);
  });

  // Record dedup AFTER successful processing so transient errors retry.
  await supabase.from('webhook_events').insert({ event_id: dedupKey, source: 'zapsign' });

  console.log(
    `[zapsign-webhook] processed contrato=${contratoId} tenant=${tenantId ?? 'n/a'} new_status=${newStatus}`,
  );

  return new Response(JSON.stringify({ received: true, contrato_id: contratoId, status: newStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
