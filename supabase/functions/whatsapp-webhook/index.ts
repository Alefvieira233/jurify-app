import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit, checkRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { getWebhookSecretByPhoneId } from "../_shared/kapso-client.ts";
import {
  getMessageId,
  isKapsoPayload,
  normalizeKapsoMessage,
  normalizeMetaMessages,
  timingSafeCompare,
  verifyHmacSignature,
  type WebhookPayload,
} from "../_shared/whatsapp-logic.ts";
import { redactPII } from "../_shared/security.ts";
import { escapeLike } from "./handlers/edge-function-client.ts";
import { processNormalizedMessage } from "./handlers/process-message.ts";
import { processStatusUpdate } from "./handlers/process-status-update.ts";

// whatsapp-webhook: Kapso Cloud API + Meta Official API webhook handler

// Webhook payload shapes, normalizers, and HMAC helpers are imported from
// `../_shared/whatsapp-logic.ts` so unit tests can exercise the exact same code.

const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
// KAPSO_WEBHOOK_SECRET (global fallback) removed 2026-04-10 as part of audit P0-3.
// Every tenant must now have a per-tenant webhook secret in configuracoes_integracoes.

const INTEGRATION_NAME_KAPSO = "whatsapp_kapso";
const INTEGRATION_NAME_META = "whatsapp_oficial";

// ============================================
// 🔑 DEDUPLICATION: in-memory fast path + durable upsert
// ============================================
// Keep module-level state so hot retries from the same instance skip the
// round-trip to the DB. The shared `createDeduplicator` factory exists for
// unit tests and isolates per-test state.
const processedMessages = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isInMemoryDuplicate(messageId: string): boolean {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_TTL_MS) processedMessages.delete(key);
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

async function isDuplicate(
  messageId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<boolean> {
  // Fast path: in-memory check (survives within same instance)
  if (isInMemoryDuplicate(messageId)) return true;

  // Durable check: atomic upsert avoids race condition between SELECT + INSERT
  const { data } = await supabase
    .from("webhook_events")
    .upsert(
      { event_id: messageId, source: "whatsapp" },
      { onConflict: "event_id,source", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();

  // Row returned = newly inserted = not a duplicate; null = pre-existing = duplicate.
  return !data;
}


// ============================================
// 🚀 HANDLER PRINCIPAL
// ============================================
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // GET = Meta webhook verification
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode !== "subscribe" || !token) {
        return new Response("Forbidden", { status: 403 });
      }

      if (WHATSAPP_VERIFY_TOKEN) {
        if (timingSafeCompare(token, WHATSAPP_VERIFY_TOKEN)) {
          return new Response(challenge, {
            headers: { "Content-Type": "text/plain" },
            status: 200,
          });
        }
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data } = await supabase
        .from("configuracoes_integracoes")
        .select("id, verify_token_encrypted")
        .eq("nome_integracao", INTEGRATION_NAME_META)
        .eq("status", "ativa")
        .not("verify_token_encrypted", "is", null)
        .limit(10);

      // Compare token against each tenant's encrypted verify_token
      let tokenMatch = false;
      if (data && data.length > 0) {
        const { decrypt } = await import("../_shared/crypto.ts");
        for (const cfg of data) {
          try {
            const decrypted = await decrypt(cfg.verify_token_encrypted);
            if (timingSafeCompare(decrypted, token)) {
              tokenMatch = true;
              break;
            }
          } catch { /* skip invalid entries */ }
        }
      }

      if (tokenMatch) {
        return new Response(challenge, {
          headers: { "Content-Type": "text/plain" },
          status: 200,
        });
      }

      return new Response("Forbidden", { status: 403 });
    }

    if (req.method === "POST") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Phase 1: GLOBAL rate limit (pre-parse, IP/host bucket).
      // Tenant não é conhecido aqui — bucket protege a função inteira contra
      // tempestades. Phase 2 (per-tenant) ocorre após tenant resolution.
      const rateLimitCheck = await applyRateLimit(
        req,
        { maxRequests: 120, windowSeconds: 60, namespace: "whatsapp-webhook:global" },
        // denyOnDbFailure=true: webhook é endpoint crítico — durante outage
        // do DB, melhor rejeitar flood do que cair no fallback in-memory
        // halved (que em cold-start de Deno deixaria escapar bursts).
        { supabase, corsHeaders, denyOnDbFailure: true }
      );

      if (!rateLimitCheck.allowed) {
        console.warn("[webhook] Rate limit exceeded (global)");
        return rateLimitCheck.response;
      }

      // Read raw body for HMAC verification, then parse JSON
      const rawBody = await req.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        console.error("[webhook] Invalid JSON body:", rawBody.substring(0, 500));
        return new Response("Bad Request", { status: 400, headers: corsHeaders });
      }

      // Log raw payload structure for debugging
      const rawKeys = typeof parsed === "object" && parsed !== null ? Object.keys(parsed as Record<string, unknown>).join(",") : typeof parsed;
      const batchHeader = req.headers.get("x-webhook-batch");
      const eventHeader = req.headers.get("x-webhook-event");
      const sigHeader = req.headers.get("x-webhook-signature") ? "present" : "absent";
      console.log(`[webhook] Received: type=${typeof parsed} isArray=${Array.isArray(parsed)} keys=${rawKeys} batch=${batchHeader} event=${eventHeader} sig=${sigHeader} size=${rawBody.length}`);

      // ============================================
      // 🔀 ROTEAMENTO: Kapso ou Meta?
      // ============================================

      // Kapso with buffering may send an array of events or a wrapper object
      const isBatch = req.headers.get("x-webhook-batch") === "true" || Array.isArray(parsed);
      // deno-lint-ignore no-explicit-any
      const parsedObj = parsed as any;

      // Resolve event list — handle all known Kapso payload shapes
      let eventList: unknown[];
      if (Array.isArray(parsed)) {
        // Direct array: [{event: ...}, {event: ...}]
        eventList = parsed;
      } else if (Array.isArray(parsedObj?.events)) {
        // Wrapper: {events: [{event: ...}, ...]}
        eventList = parsedObj.events;
      } else if (Array.isArray(parsedObj?.data)) {
        // Wrapper: {data: [{event: ...}, ...]}
        eventList = parsedObj.data;
      } else {
        // Single event: {event: "...", data: {...}}
        eventList = [parsed];
      }

      console.log(`[webhook] eventList: ${eventList.length} item(s) | isBatch=${isBatch} | firstKeys=${typeof eventList[0] === "object" && eventList[0] ? Object.keys(eventList[0] as Record<string, unknown>).join(",") : "N/A"}`);

      const firstPayload = (eventList[0] || parsed) as WebhookPayload;

      if (isKapsoPayload(firstPayload) || isBatch) {
        // ── Multi-tenant HMAC verification (strict, per-tenant only) ──
        // Policy: every tenant MUST have a per-tenant webhook secret configured in DB.
        // The legacy global KAPSO_WEBHOOK_SECRET fallback was removed on 2026-04-10
        // (audit P0-3) because it defeated multi-tenant isolation: if the global
        // secret leaked, any attacker could forge webhooks impersonating any tenant
        // that hadn't yet migrated to a per-tenant secret.
        //
        // If per-tenant secret not found → reject 401 (tenant must re-register webhook).
        // deno-lint-ignore no-explicit-any
        const fp = firstPayload as any;
        const payloadPhoneId = fp?.phone_number_id || fp?.conversation?.phone_number_id || fp?.instance;

        if (!payloadPhoneId) {
          console.error("[webhook:kapso] SECURITY: Payload has no phone_number_id — cannot resolve tenant secret");
          return new Response("Unauthorized: unable to identify tenant", { status: 401, headers: corsHeaders });
        }

        // Phase 2: PER-TENANT rate limit (60 req/min por phone_number_id, que mapeia 1:1 com tenant).
        // Evita que um tenant abusivo estoure o bucket global e afete outros tenants.
        const tenantBucket = await checkRateLimit(
          {
            identifier: `phone:${payloadPhoneId}`,
            namespace: "whatsapp-webhook:tenant",
            maxRequests: 60,
            windowSeconds: 60,
          },
          supabase,
          { denyOnDbFailure: true }
        );
        if (!tenantBucket.allowed) {
          console.warn(`[webhook] Rate limit exceeded (per-tenant) phone=${payloadPhoneId}`);
          return createRateLimitResponse(tenantBucket, corsHeaders);
        }

        const tenantSecret = await getWebhookSecretByPhoneId(supabase, payloadPhoneId);

        if (!tenantSecret) {
          console.error(
            `[webhook:kapso] SECURITY: No per-tenant secret for phone=${payloadPhoneId} — rejecting. ` +
            `Tenant must configure a per-tenant webhook secret. Global fallback was removed 2026-04-10.`
          );
          return new Response(
            "Unauthorized: tenant has no per-tenant webhook secret configured",
            { status: 401, headers: corsHeaders }
          );
        }

        const effectiveSecret = tenantSecret;

        const hmacSignature = req.headers.get("x-webhook-signature") || req.headers.get("x-kapso-signature");
        const webhookSecret = req.headers.get("x-webhook-secret");

        if (hmacSignature) {
          const valid = await verifyHmacSignature(rawBody, hmacSignature, effectiveSecret);
          if (!valid) {
            console.error(`[webhook:kapso] SECURITY: Invalid HMAC signature — rejecting | phone=${payloadPhoneId}`);
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
        } else if (webhookSecret) {
          if (!timingSafeCompare(webhookSecret, effectiveSecret)) {
            console.error("[webhook:kapso] SECURITY: Invalid webhook secret — rejecting");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
        } else {
          console.error("[webhook:kapso] SECURITY: No signature headers — rejecting unauthenticated request");
          return new Response("Unauthorized: missing authentication headers", { status: 401, headers: corsHeaders });
        }
        console.log(`[webhook:kapso] Auth: per-tenant secret verified | phone=${payloadPhoneId}`);

        // Process each event (single or batch)
        for (const rawEvent of eventList) {
        const payload = rawEvent as WebhookPayload;

        // --- KAPSO API ---
        // deno-lint-ignore no-explicit-any
        const payloadAny = payload as any;
        // v2-real format has no "event" in body — it comes from X-Webhook-Event header
        const event = payload?.event || eventHeader || (payloadAny?.message ? "whatsapp.message.received" : null);
        const instanceName = payload?.instance || payloadAny?.phone_number_id;
        const payloadKeys = typeof payload === "object" && payload ? Object.keys(payload).join(",") : "N/A";
        console.log(`[webhook:kapso] Event: ${event} | Instance: ${instanceName} | Keys: ${payloadKeys}`);

        // Eventos de conexão (QR Code, status)
        if (event === "connection.update") {
          const state = payload.data?.state;
          const instanceName = payload.instance;

          if (instanceName && state) {
            // Only update status on EXISTING configs — never create placeholder configs
            // Use exact JSON match to avoid false positives
            const exactMatch = `"phone_number_id":"${escapeLike(instanceName)}"`;

            if (state === "open") {
              // Connection restored — mark as active
              await supabase
                .from("configuracoes_integracoes")
                .update({ status: "ativa" })
                .eq("nome_integracao", INTEGRATION_NAME_KAPSO)
                .ilike("observacoes", `%${exactMatch}%`);

              // Also update conexoes_whatsapp status + heartbeat
              await supabase
                .from("conexoes_whatsapp")
                .update({
                  status: "connected",
                  last_heartbeat: new Date().toISOString(),
                  reconnect_attempts: 0,
                })
                .eq("instance_name", instanceName);

              console.log(`[webhook:kapso] connection.update: ${instanceName} → OPEN (ativa)`);
            } else {
              // Connection lost — log but do NOT immediately mark as inativa
              // Temporary disconnects are common; only mark if sustained
              // Instead, increment reconnect_attempts as a signal
              await supabase
                .from("conexoes_whatsapp")
                .update({
                  reconnect_attempts: 1, // Will be reset to 0 on next "open"
                  updated_at: new Date().toISOString(),
                })
                .eq("instance_name", instanceName)
                .eq("status", "connected");

              console.warn(`[webhook:kapso] connection.update: ${instanceName} → ${state} (keeping status, incremented reconnect_attempts)`);
            }
          }

          continue;
        }

        // QR Code atualizado — do NOT overwrite observacoes (contains phone_number_id + customer_id)
        if (event === "qrcode.updated") {
          const instanceName = payload.instance;
          console.log(`[webhook:kapso] qrcode.updated for ${instanceName}`);
          continue;
        }

        // Mensagem recebida (Kapso: whatsapp.message.received | Legacy: messages.upsert)
        if (event === "messages.upsert" || event === "whatsapp.message.received") {
          const msgId = getMessageId(payload, "kapso");
          console.log(`[webhook:kapso] Message ID: ${msgId} | fromMe: ${payload.data?.key?.fromMe}`);
          if (msgId && await isDuplicate(msgId, supabase)) {
            console.log(`[webhook:kapso] Duplicate message ${msgId}, skipping`);
            continue;
          }
          const normalized = normalizeKapsoMessage(payload, eventHeader);
          if (normalized) {
            console.log(`[webhook:kapso] Processing message from ${normalized.from}: "${redactPII(normalized.text.substring(0, 50))}"`);
            await processNormalizedMessage(supabase, normalized);
          } else {
            console.warn(`[webhook:kapso] Could not normalize message | keys: ${payloadKeys} | event: ${event}`);
          }
          continue;
        }

        // Outros eventos
        console.log(`[webhook:kapso] Ignoring event: ${event}`);

        } // end for (batch loop)

        return new Response("OK", { status: 200, headers: corsHeaders });

      } else {
        // --- META OFFICIAL API (backward compatible) ---

        // ── Verificação de assinatura Meta (X-Hub-Signature-256) ──
        // Meta assina o corpo raw com HMAC-SHA256 usando o App Secret.
        // Header: "sha256=<hex>". Configurado via Edge Secret WHATSAPP_APP_SECRET.
        // Se a env existir, exigimos assinatura válida (rejeita 401 se ausente/inválida).
        // Se não existir, mantemos o comportamento legado (apenas log de aviso)
        // pra não quebrar tenants em migração. NÃO afeta o fluxo Kapso acima.
        const metaAppSecret = Deno.env.get("WHATSAPP_APP_SECRET");
        if (metaAppSecret) {
          const sig256 = req.headers.get("x-hub-signature-256");
          if (!sig256 || !sig256.startsWith("sha256=")) {
            console.error("[webhook:meta] SECURITY: Missing/invalid X-Hub-Signature-256 header — rejecting");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
          const providedHex = sig256.slice("sha256=".length);
          const valid = await verifyHmacSignature(rawBody, providedHex, metaAppSecret);
          if (!valid) {
            console.error("[webhook:meta] SECURITY: Invalid X-Hub-Signature-256 — rejecting");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
          console.log("[webhook:meta] Auth: X-Hub-Signature-256 verified");
        } else {
          console.warn("[webhook:meta] WHATSAPP_APP_SECRET not set — skipping signature verification (legacy mode)");
        }

        const metaMsgId = getMessageId(firstPayload, "meta");
        if (metaMsgId && await isDuplicate(metaMsgId, supabase)) {
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const messages = normalizeMetaMessages(firstPayload);
        for (const msg of messages) {
          await processNormalizedMessage(supabase, msg);
        }

        // Status updates (Meta format)
        for (const entry of firstPayload.entry || []) {
          for (const change of entry.changes || []) {
            if (change.value?.statuses) {
              for (const status of change.value.statuses) {
                await processStatusUpdate(supabase, status);
              }
            }
          }
        }

        return new Response("OK", { status: 200, headers: corsHeaders });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("[webhook] Error:", error instanceof Error ? `${error.message}\n${error.stack}` : error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
