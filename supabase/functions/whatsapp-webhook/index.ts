import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { buildLegalContext } from "../_shared/legal-context.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";

// whatsapp-webhook: Kapso Cloud API + Meta Official API webhook handler

/**
 * Calls a Supabase Edge Function via HTTP fetch.
 * Uses service role key for auth. Avoids functions.invoke() issues.
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`${functionName} failed: HTTP ${response.status} — ${errText}`);
  }

  return response.json() as Promise<T>;
}

/** Escapa caracteres especiais do LIKE para evitar manipulação de padrões */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

// ============================================
// 🎯 AUTO-QUALIFICATION: Analyze conversation to qualify leads
// ============================================
interface QualificationResult {
  suggestedStatus: string;
  extractedName: string | null;
  extractedArea: string | null;
  extractedUrgency: 'alta' | 'media' | 'baixa' | null;
  temperature: 'hot' | 'warm' | 'cold';
}

function analyzeQualification(
  messages: Array<{ sender: string; content: string }>,
  currentStatus: string,
  _aiResponseText: string
): QualificationResult {
  const leadMessages = messages.filter(m => m.sender === 'lead').map(m => m.content.toLowerCase());
  const allText = leadMessages.join(' ');

  // Extract name (look for patterns like "meu nome é X", "sou X", "me chamo X")
  let extractedName: string | null = null;
  const namePatterns = [
    /meu nome (?:é|e)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i,
    /(?:sou|me chamo)\s+(?:o|a)?\s*([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i,
  ];
  for (const pattern of namePatterns) {
    for (const msg of messages.filter(m => m.sender === 'lead')) {
      const match = msg.content.match(pattern);
      if (match?.[1] && match[1].length > 2) {
        extractedName = match[1].trim();
        break;
      }
    }
    if (extractedName) break;
  }

  // Extract legal area
  const areaMap: Record<string, string> = {
    'trabalhist': 'Trabalhista',
    'familia': 'Família', 'divorcio': 'Família', 'divórcio': 'Família',
    'pensao': 'Família', 'pensão': 'Família', 'guarda': 'Família',
    'consumidor': 'Consumidor',
    'criminal': 'Criminal', 'penal': 'Criminal',
    'tributar': 'Tributário', 'imposto': 'Tributário',
    'imovel': 'Imobiliário', 'imóvel': 'Imobiliário', 'imobiliar': 'Imobiliário',
    'contrato': 'Contratual', 'contrat': 'Contratual',
    'previden': 'Previdenciário', 'inss': 'Previdenciário', 'aposentad': 'Previdenciário',
    'empresarial': 'Empresarial', 'societar': 'Empresarial',
    'civel': 'Cível', 'cível': 'Cível',
    'acidente': 'Cível', 'indeniza': 'Cível',
  };
  let extractedArea: string | null = null;
  for (const [keyword, area] of Object.entries(areaMap)) {
    if (allText.includes(keyword)) {
      extractedArea = area;
      break;
    }
  }

  // Detect urgency
  const urgencyHigh = ['urgente', 'urgência', 'hoje', 'amanhã', 'prazo', 'audiência amanhã', 'preso', 'liminar', 'emergência', 'socorro'];
  const urgencyMed = ['preciso', 'importante', 'rápido', 'logo', 'breve'];
  let extractedUrgency: 'alta' | 'media' | 'baixa' | null = null;
  if (urgencyHigh.some(u => allText.includes(u))) extractedUrgency = 'alta';
  else if (urgencyMed.some(u => allText.includes(u))) extractedUrgency = 'media';
  else if (leadMessages.length >= 3) extractedUrgency = 'baixa';

  // Determine temperature
  let temperature: 'hot' | 'warm' | 'cold' = 'cold';
  if (extractedUrgency === 'alta' || (extractedName && extractedArea)) temperature = 'hot';
  else if (extractedArea || extractedUrgency === 'media') temperature = 'warm';

  // Determine suggested status based on conversation progress
  let suggestedStatus = currentStatus;
  const messageCount = leadMessages.length;

  // First message → move to qualification
  if (currentStatus === 'novo' && messageCount >= 1) {
    suggestedStatus = 'qualificado';
  }
  // 2+ messages with some data → still qualifying
  if (messageCount >= 2 && (extractedName || extractedArea)) {
    suggestedStatus = 'qualificado';
  }
  // Name AND area identified → ready for proposal
  if (extractedName && extractedArea) {
    suggestedStatus = 'proposta';
  }

  // Don't downgrade status (never go backwards in pipeline)
  const statusOrder = ['novo', 'em_contato', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const suggestedIdx = statusOrder.indexOf(suggestedStatus);
  if (suggestedIdx < currentIdx) suggestedStatus = currentStatus;

  return { suggestedStatus, extractedName, extractedArea, extractedUrgency, temperature };
}

// --- Typed webhook payloads ---

interface KapsoMessageKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
}

interface KapsoMessageData {
  key?: KapsoMessageKey;
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown>;
}

interface KapsoWebhookPayload {
  event?: string;
  instance?: string;
  data?: KapsoMessageData & Record<string, unknown>;
}

interface MetaWebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; id?: string };
  document?: { caption?: string; filename?: string; id?: string };
  audio?: { id?: string };
  _vendor?: { name?: string };
}

interface MetaWebhookStatus {
  status?: string;
  recipient_id?: string;
  errors?: Array<{ code?: string; title?: string }>;
}

interface MetaWebhookChange {
  value?: {
    messages?: MetaWebhookMessage[];
    statuses?: MetaWebhookStatus[];
  };
}

interface MetaWebhookEntry {
  changes?: MetaWebhookChange[];
}

interface MetaWebhookPayload {
  entry?: MetaWebhookEntry[];
}

type WebhookPayload = KapsoWebhookPayload & MetaWebhookPayload & Record<string, unknown>;

const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const KAPSO_WEBHOOK_SECRET = Deno.env.get("KAPSO_WEBHOOK_SECRET");

/** Timing-safe string comparison to prevent timing attacks on webhook secrets */
function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    crypto.subtle.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

const INTEGRATION_NAME_KAPSO = "whatsapp_kapso";
const INTEGRATION_NAME_META = "whatsapp_oficial";

// ============================================
// 🔍 DETECTA ORIGEM DO WEBHOOK (Kapso vs Meta)
// ============================================
interface NormalizedMessage {
  from: string;
  name: string;
  text: string;
  messageType: string;
  mediaUrl: string | null;
  instanceName: string | null;
  provider: "kapso" | "meta";
}

// Kapso sends structured events starting with "whatsapp."
function isKapsoPayload(payload: WebhookPayload): boolean {
  const event = (payload as Record<string, unknown>)?.event;
  if (typeof event === "string" && event.startsWith("whatsapp.")) return true;
  // Kapso legacy format (messages.upsert event)
  return !!(payload?.event || payload?.instance || payload?.data?.key);
}

function normalizeKapsoMessage(payload: WebhookPayload): NormalizedMessage | null {
  const event = payload.event;

  // Kapso uses "whatsapp.message.received" or legacy "messages.upsert"
  if (event !== "messages.upsert" && event !== "whatsapp.message.received") return null;

  const data = payload.data;
  if (!data) return null;

  const key = data.key;
  // Ignora mensagens enviadas por nós (fromMe = true)
  if (key?.fromMe) return null;

  const remoteJid = key?.remoteJid || "";
  // Extrai número do JID (formato: 5511999999999@s.whatsapp.net)
  const from = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

  if (!from) return null;

  const name = data.pushName || "Unknown";
  const messageType = data.messageType || "conversation";
  let text = "";
  let mediaUrl: string | null = null;

  const msg = data.message;
  if (!msg) return null;

  if (msg.conversation) {
    text = msg.conversation;
  } else if (msg.extendedTextMessage?.text) {
    text = msg.extendedTextMessage.text;
  } else if (msg.imageMessage) {
    text = msg.imageMessage.caption || "[Imagem recebida]";
    mediaUrl = msg.imageMessage.url || null;
  } else if (msg.documentMessage) {
    text = msg.documentMessage.caption || `[Documento: ${msg.documentMessage.fileName || "arquivo"}]`;
    mediaUrl = msg.documentMessage.url || null;
  } else if (msg.audioMessage) {
    text = "[Audio recebido]";
    mediaUrl = msg.audioMessage.url || null;
  } else if (msg.videoMessage) {
    text = msg.videoMessage.caption || "[Video recebido]";
    mediaUrl = msg.videoMessage.url || null;
  } else if (msg.stickerMessage) {
    text = "[Sticker recebido]";
  } else if (msg.contactMessage) {
    text = `[Contato: ${msg.contactMessage.displayName || ""}]`;
  } else if (msg.locationMessage) {
    text = `[Localizacao: ${msg.locationMessage.degreesLatitude},${msg.locationMessage.degreesLongitude}]`;
  } else {
    text = `[${messageType} recebido]`;
  }

  if (!text) return null;

  return {
    from,
    name,
    text,
    messageType: messageType === "conversation" ? "text" : messageType,
    mediaUrl,
    instanceName: payload.instance || null,
    provider: "kapso",
  };
}

function normalizeMetaMessages(payload: WebhookPayload): NormalizedMessage[] {
  const results: NormalizedMessage[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const message of value.messages) {
        const from = message.from;
        const name = message._vendor?.name || "Unknown";
        const msgType = message.type || "text";
        let text = "";
        let mediaUrl: string | null = null;

        switch (msgType) {
          case "text":
            text = message.text?.body || "";
            break;
          case "image":
            text = message.image?.caption || "[Imagem recebida]";
            mediaUrl = message.image?.id || null;
            break;
          case "document":
            text = message.document?.caption || `[Documento: ${message.document?.filename || "arquivo"}]`;
            mediaUrl = message.document?.id || null;
            break;
          case "audio":
            text = "[Audio recebido]";
            mediaUrl = message.audio?.id || null;
            break;
          default:
            text = `[${msgType} recebido]`;
            break;
        }

        if (text && from) {
          results.push({
            from,
            name,
            text,
            messageType: msgType,
            mediaUrl,
            instanceName: null,
            provider: "meta",
          });
        }
      }
    }
  }

  return results;
}

// ============================================
// 🔑 DEDUPLICATION: Track processed message IDs
// ============================================
const processedMessages = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isInMemoryDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Clean expired entries
  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_TTL_MS) processedMessages.delete(key);
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

async function isDuplicate(
  messageId: string,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Fast path: in-memory check (survives within same instance)
  if (isInMemoryDuplicate(messageId)) return true;

  // Durable check: atomic upsert to avoid race condition between SELECT + INSERT
  const { data } = await supabase
    .from("webhook_events")
    .upsert(
      { event_id: messageId, source: "whatsapp" },
      { onConflict: "event_id,source", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  // If upsert returned a row, it was newly inserted → NOT a duplicate
  // If upsert returned null, the row already existed (ignored) → IS a duplicate
  return !data;
}

function getMessageId(payload: WebhookPayload, provider: "kapso" | "meta"): string | null {
  if (provider === "kapso") {
    return payload?.data?.key?.id || null;
  }
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const message of change?.value?.messages || []) {
        return message.id || null;
      }
    }
  }
  return null;
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

      if (WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, {
          headers: { "Content-Type": "text/plain" },
          status: 200,
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data } = await supabase
        .from("configuracoes_integracoes")
        .select("id")
        .eq("nome_integracao", INTEGRATION_NAME_META)
        .eq("verify_token", token)
        .limit(1)
        .maybeSingle();

      if (data) {
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

      const rateLimitCheck = await applyRateLimit(
        req,
        { maxRequests: 120, windowSeconds: 60, namespace: "whatsapp-webhook" },
        { supabase, corsHeaders }
      );

      if (!rateLimitCheck.allowed) {
        console.warn("[webhook] Rate limit exceeded");
        return rateLimitCheck.response;
      }

      const payload = await req.json();

      // ============================================
      // 🔀 ROTEAMENTO: Kapso ou Meta?
      // ============================================
      if (isKapsoPayload(payload)) {
        // Verify Kapso webhook signature if secret is configured
        const webhookSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-kapso-signature");

        if (!KAPSO_WEBHOOK_SECRET) {
          console.error("[webhook:kapso] CRITICAL: KAPSO_WEBHOOK_SECRET not configured — rejecting");
          return new Response("Service misconfigured", { status: 503, headers: corsHeaders });
        }
        if (!webhookSecret || !timingSafeCompare(webhookSecret, KAPSO_WEBHOOK_SECRET)) {
          console.error("[webhook:kapso] SECURITY: Invalid webhook secret — rejecting");
          return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        // --- KAPSO API ---
        const event = payload.event;
        const instanceName = payload.instance;
        console.log(`[webhook:kapso] Event: ${event} | Instance: ${instanceName}`);

        // Eventos de conexão (QR Code, status)
        if (event === "connection.update") {
          const state = payload.data?.state;
          const instanceName = payload.instance;

          if (instanceName && state) {
            const dbStatus = state === "open" ? "ativa" : "inativa";

            // Tenta UPDATE primeiro
            const { count } = await supabase
              .from("configuracoes_integracoes")
              .update({ status: dbStatus })
              .eq("nome_integracao", INTEGRATION_NAME_KAPSO)
              .ilike("observacoes", `%${escapeLike(instanceName)}%`);

            // Se não atualizou nenhum registro, cria um novo (auto-repair)
            if ((count ?? 0) === 0 && state === "open") {
              const tenantPrefix = instanceName.replace("jurify_", "");
              if (tenantPrefix) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("tenant_id")
                  .ilike("tenant_id", `${escapeLike(tenantPrefix)}%`)
                  .limit(1)
                  .maybeSingle();

                if (profile?.tenant_id) {
                  const { error: insertErr } = await supabase
                    .from("configuracoes_integracoes")
                    .insert({
                      nome_integracao: INTEGRATION_NAME_KAPSO,
                      status: "ativa",
                      api_key: "kapso_managed",
                      endpoint_url: Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai",
                      observacoes: `Instance: ${instanceName}`,
                      tenant_id: profile.tenant_id,
                    });
                  if (insertErr) {
                    console.error("[webhook] Auto-repair insert error:", insertErr.message);
                  } else {
                    console.log("[webhook] Auto-repaired missing configuracoes_integracoes for", instanceName);
                  }
                }
              }
            }
          }

          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // QR Code atualizado
        if (event === "qrcode.updated") {
          const instanceName = payload.instance;
          const qrCode = payload.data?.qrcode?.base64 || payload.data?.qrcode;

          if (instanceName && qrCode) {
            await supabase
              .from("configuracoes_integracoes")
              .update({
                status: "inativa",
                observacoes: `Instance: ${instanceName} | QR: pending`,
              })
              .eq("nome_integracao", INTEGRATION_NAME_KAPSO)
              .ilike("observacoes", `%${escapeLike(instanceName)}%`);
          }

          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Mensagem recebida (Kapso: whatsapp.message.received | Legacy: messages.upsert)
        if (event === "messages.upsert" || event === "whatsapp.message.received") {
          const msgId = getMessageId(payload, "kapso");
          console.log(`[webhook:kapso] Message ID: ${msgId} | fromMe: ${payload.data?.key?.fromMe}`);
          if (msgId && await isDuplicate(msgId, supabase)) {
            console.log(`[webhook:kapso] Duplicate message ${msgId}, skipping`);
            return new Response("OK", { status: 200, headers: corsHeaders });
          }
          const normalized = normalizeKapsoMessage(payload);
          if (normalized) {
            console.log(`[webhook:kapso] Processing message from ${normalized.from}: "${normalized.text.substring(0, 50)}"`);
            await processNormalizedMessage(supabase, normalized);
          } else {
            console.warn(`[webhook:kapso] Could not normalize message (fromMe or empty)`);
          }
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Outros eventos
        console.log(`[webhook:kapso] Ignoring event: ${event}`);
        return new Response("OK", { status: 200, headers: corsHeaders });

      } else {
        // --- META OFFICIAL API (backward compatible) ---

        const metaMsgId = getMessageId(payload, "meta");
        if (metaMsgId && await isDuplicate(metaMsgId, supabase)) {
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const messages = normalizeMetaMessages(payload);
        for (const msg of messages) {
          await processNormalizedMessage(supabase, msg);
        }

        // Status updates (Meta format)
        for (const entry of payload.entry || []) {
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
    console.error("[webhook] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ============================================
// 📊 STATUS UPDATES (Meta format)
// ============================================
async function processStatusUpdate(supabase: ReturnType<typeof createClient>, status: MetaWebhookStatus & { id?: string }) {
  try {
    const statusValue = status.status;
    const metaMsgId = status.id; // Meta message ID from the status callback

    if (!metaMsgId) {
      console.warn("[webhook] Status update without message ID, skipping");
      return;
    }

    if (statusValue === "delivered") {
      await supabase
        .from("whatsapp_messages")
        .update({ send_status: "delivered" })
        .eq("provider_message_id", metaMsgId);
    }

    if (statusValue === "read") {
      await supabase
        .from("whatsapp_messages")
        .update({ read: true, send_status: "read" })
        .eq("provider_message_id", metaMsgId);
    }

    if (statusValue === "failed") {
      const errorInfo = status.errors?.[0];
      const errorMsg = errorInfo?.title || `Error code: ${errorInfo?.code || "unknown"}`;
      console.error("[webhook] Message delivery failed:", {
        messageId: metaMsgId,
        recipient: status.recipient_id,
        error_code: errorInfo?.code,
        error_title: errorInfo?.title,
      });

      await supabase
        .from("whatsapp_messages")
        .update({ send_status: "failed", send_error: errorMsg })
        .eq("provider_message_id", metaMsgId);
    }
  } catch (error) {
    console.error("[webhook] Error processing status update:", error);
  }
}

// ============================================
// 📨 PROCESSA MENSAGEM NORMALIZADA (funciona para ambos providers)
// ============================================
async function processNormalizedMessage(supabase: ReturnType<typeof createClient>, msg: NormalizedMessage) {
  try {
    const { from, name, text, messageType, mediaUrl, instanceName, provider } = msg;

    console.log(`[processMsg:${provider}] START from=${from} instance=${instanceName} type=${messageType}`);

    // --- RESOLVE TENANT ---
    let tenantId: string | null = null;

    // 1. Busca tenant diretamente via configuracoes_integracoes.tenant_id
    if (instanceName) {
      const { data: config } = await supabase
        .from("configuracoes_integracoes")
        .select("tenant_id")
        .eq("nome_integracao", INTEGRATION_NAME_KAPSO)
        .ilike("observacoes", `%${escapeLike(instanceName)}%`)
        .not("tenant_id", "is", null)
        .maybeSingle();

      if (config?.tenant_id) {
        tenantId = config.tenant_id;
        // tenant resolved from integration config
      } else {
        console.warn(`[webhook] No config found for instance: ${instanceName}`);
      }
    }

    // 2. Fallback: busca por conversa existente
    if (!tenantId) {
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("tenant_id")
        .eq("phone_number", from)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) tenantId = existingConv.tenant_id;
    }

    // 3. Fallback: extrai tenant_id do nome da instância (formato: jurify_XXXXXXXX)
    if (!tenantId && instanceName) {
      const tenantPrefix = instanceName.replace("jurify_", "");
      if (tenantPrefix && tenantPrefix !== instanceName) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .ilike("tenant_id", `${escapeLike(tenantPrefix)}%`)
          .limit(1)
          .maybeSingle();

        if (profile?.tenant_id) {
          tenantId = profile.tenant_id;
          console.log(`[webhook:${provider}] Tenant resolved from instance name: ${instanceName}`);

          // Auto-repair: cria o registro faltante em configuracoes_integracoes
          void supabase.from("configuracoes_integracoes").insert({
            nome_integracao: INTEGRATION_NAME_KAPSO,
            status: "ativa",
            api_key: "kapso_managed",
            endpoint_url: Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai",
            observacoes: `Instance: ${instanceName}`,
            tenant_id: tenantId,
          }).then(({ error }) => {
            if (error) console.error("[webhook] Auto-repair insert error:", error.message);
            else console.log("[webhook] Auto-repaired configuracoes_integracoes for", instanceName);
          });
        }
      }
    }

    if (!tenantId) {
      console.error(`[processMsg:${provider}] FAILED: No tenant found for ${from} (instance=${instanceName})`);
      return;
    }

    console.log(`[processMsg:${provider}] Tenant resolved: ${tenantId}`);

    // --- RESOLVE/CREATE LEAD ---
    const { data: lead } = await supabase
      .from("leads")
      .select("id, status, area_juridica")
      .eq("telefone", from)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let leadId = lead?.id || null;
    const currentLeadStatus: string = lead?.status || 'novo';

    if (!leadId) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          tenant_id: tenantId,
          nome: name,
          telefone: from,
          email: null,
          area_juridica: "Nao informado",
          origem: "whatsapp",
          status: "novo",
          descricao: text,
          metadata: { responsavel_nome: "Sistema" },
        })
        .select("id")
        .single();

      if (leadError) {
        console.error(`[processMsg:${provider}] Error creating lead:`, leadError);
        return;
      }
      leadId = newLead.id;
      console.log(`[processMsg:${provider}] Created new lead: ${leadId}`);
    } else {
      console.log(`[processMsg:${provider}] Found existing lead: ${leadId}`);
    }

    // --- RESOLVE/CREATE CONVERSATION ---
    let conversationId = null;
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id, ia_active")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (conversation) {
      conversationId = conversation.id;
      console.log(`[processMsg:${provider}] Found existing conversation: ${conversationId}`);
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("tenant_id", tenantId);

      await supabase.rpc("increment_unread_count", { conversation_id: conversationId });
    } else {
      const { data: newConv, error: convError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          tenant_id: tenantId,
          lead_id: leadId,
          phone_number: from,
          contact_name: name,
          last_message: text,
          last_message_at: new Date().toISOString(),
          status: "ativo",
          unread_count: 1,
        })
        .select("id")
        .single();

      if (convError) {
        console.error(`[processMsg:${provider}] Error creating conversation:`, convError);
        return;
      }
      conversationId = newConv.id;
      console.log(`[processMsg:${provider}] Created new conversation: ${conversationId}`);
    }

    // --- SAVE MESSAGE (inbound = already delivered) ---
    const { data: savedMsg, error: msgInsertError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      sender: "lead",
      content: text,
      message_type: messageType === "conversation" ? "text" : messageType,
      media_url: mediaUrl,
      timestamp: new Date().toISOString(),
      send_status: "delivered",
      processed_by_agent: false,
      // Legacy columns (kept for backward compatibility)
      session_id: conversationId,
      direction: "inbound",
      from_number: from,
      message_text: text,
    }).select("id").single();

    const inboundMsgId = savedMsg?.id || null;

    if (msgInsertError) {
      console.error(`[processMsg:${provider}] Error saving message:`, msgInsertError);
    } else {
      console.log(`[processMsg:${provider}] Message saved to conversation ${conversationId}`);
    }

    // --- CHECK ia_active BEFORE INVOKING AI ---
    // For existing conversations, respect the ia_active flag.
    // New conversations (just created) default to ia_active = true.
    const iaEnabled = conversation ? (conversation.ia_active !== false) : true;

    if (!iaEnabled) {
      console.log(`[processMsg:${provider}] IA disabled for conversation ${conversationId}, skipping AI`);
      return;
    }

    console.log(`[processMsg:${provider}] Starting AI pipeline for conversation ${conversationId}`);

    // ========================================
    // STAGE 1: MEDIA PROCESSING
    // ========================================
    let processedText = text;
    let mediaCategory = "text";

    if (msg.mediaUrl && msg.messageType !== "text") {
      console.log(`[processMsg:${provider}] Processing media: ${msg.messageType}`);
      try {
        const mediaResult = await callEdgeFunction<{
          extractedText: string;
          mediaCategory: string;
          processingMethod: string;
          durationMs: number;
        }>("media-processor", {
          mediaUrl: msg.mediaUrl,
          messageType: msg.messageType,
          caption: text !== `[${msg.messageType.charAt(0).toUpperCase() + msg.messageType.slice(1)} recebido]` ? text : undefined,
          tenantId: tenantId,
        });

        processedText = mediaResult.extractedText;
        mediaCategory = mediaResult.mediaCategory;
        console.log(`[processMsg:${provider}] Media processed (${mediaResult.processingMethod}, ${mediaResult.durationMs}ms): "${processedText.substring(0, 80)}..."`);
      } catch (mediaErr) {
        console.error(`[processMsg:${provider}] Media processing failed, using raw text:`, mediaErr);
      }
    }

    // ========================================
    // STAGE 2: BUILD CONTEXT + ORCHESTRATE
    // ========================================

    // Legal context
    const legalCtx = await buildLegalContext(supabase, leadId, tenantId, processedText);

    // Command detection
    const COMMANDS: Record<string, string> = {
      "/prazos": "liste os prazos processuais do cliente",
      "/processos": "liste os processos ativos do cliente",
      "/documentos": "informe quantos documentos o cliente tem no sistema",
      "/honorarios": "informe o status dos honorários do cliente",
      "/status": "dê um resumo completo dos casos do cliente",
    };
    const commandKey = Object.keys(COMMANDS).find((cmd) =>
      processedText.trim().toLowerCase().startsWith(cmd)
    );
    const commandIntent = commandKey ? COMMANDS[commandKey] : null;

    // Conversation history
    let conversationHistory = "";
    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("sender, content")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (recentMessages && recentMessages.length > 1) {
      conversationHistory = recentMessages
        .reverse()
        .map((m: { sender: string; content: string }) => `${m.sender === "lead" ? "Cliente" : "Assistente"}: ${m.content}`)
        .join("\n");
    }

    // Get office name from tenants
    let officeName = "nosso escritório";
    let assistantName = "Ana";
    try {
      const { data: tenantConfig } = await supabase
        .from("tenants")
        .select("nome, configuracoes")
        .eq("id", tenantId)
        .maybeSingle();

      if (tenantConfig?.nome) officeName = tenantConfig.nome;
      const config = tenantConfig?.configuracoes as Record<string, unknown> | null;
      if (config?.whatsapp_assistant_name) assistantName = config.whatsapp_assistant_name as string;
    } catch { /* use defaults */ }

    // Orchestrate: decide which specialist agent handles this
    let agentName: string;
    let agentPrompt: string;
    let agentTemp: number;
    let agentMaxTokens: number;

    if (commandKey) {
      // Commands always go to juridico
      agentName = "Assistente Jurídico";
      agentPrompt = "";
      agentTemp = 0.3;
      agentMaxTokens = 800;
    } else {
      try {
        const routing = await callEdgeFunction<{
          agent: string;
          agentDefinition: { name: string; specialization: string; systemPrompt: string; temperature: number; maxTokens: number };
          reason: string;
        }>("agent-orchestrator", {
          messageText: processedText,
          hasLegalContext: legalCtx.has_context,
          hasMedia: mediaCategory !== "text",
          mediaCategory,
          isFirstContact: !conversation,
          leadId,
          tenantId,
        });

        agentName = routing.agentDefinition.name;
        agentPrompt = routing.agentDefinition.systemPrompt;
        agentTemp = routing.agentDefinition.temperature;
        agentMaxTokens = routing.agentDefinition.maxTokens;
        console.log(`[processMsg:${provider}] Orchestrator routed to: ${routing.agent} (${routing.reason})`);
      } catch (orchErr) {
        console.error(`[processMsg:${provider}] Orchestrator failed, using default:`, orchErr);
        agentName = legalCtx.has_context ? "Assistente Jurídico" : "Recepcionista";
        agentPrompt = "";
        agentTemp = 0.5;
        agentMaxTokens = legalCtx.has_context ? 800 : 400;
      }
    }

    // Build final system prompt
    let finalSystemPrompt = agentPrompt ||
      `Você é ${assistantName}, ${agentName.toLowerCase()} do escritório ${officeName}. Atenda o cliente de forma profissional e objetiva em português brasileiro. Respostas curtas (WhatsApp).`;

    finalSystemPrompt = `Você trabalha no escritório ${officeName}. Seu nome é ${assistantName}.\n\n${finalSystemPrompt}`;

    if (conversationHistory) {
      finalSystemPrompt += `\n\nHISTÓRICO DA CONVERSA:\n${conversationHistory}`;
    }

    // Add legal context if available
    if (legalCtx.has_context) {
      const sections = [
        legalCtx.processos.length > 0
          ? `PROCESSOS ATIVOS (${legalCtx.processos.length}):\n` +
            legalCtx.processos.map((p) =>
              `- ${p.numero_processo ?? "Sem nº"} | ${p.tipo_acao} | ${p.fase_processual} | ${p.tribunal ?? "Sem tribunal"}`
            ).join("\n")
          : null,
        legalCtx.prazos_urgentes.length > 0
          ? `PRAZOS URGENTES (próximos 30 dias):\n` +
            legalCtx.prazos_urgentes.map((p) =>
              `- ${p.tipo}: ${p.descricao} — VENCE EM ${p.dias_restantes} DIA(S) (${new Date(p.data_prazo).toLocaleDateString("pt-BR")})`
            ).join("\n")
          : null,
        legalCtx.honorarios.length > 0
          ? `HONORÁRIOS:\n` +
            legalCtx.honorarios.map((h) =>
              `- ${h.tipo}: R$ ${h.valor_total_acordado ?? 0} acordado / R$ ${h.valor_recebido ?? 0} recebido — ${h.status}`
            ).join("\n")
          : null,
        legalCtx.documentos_count > 0
          ? `DOCUMENTOS: ${legalCtx.documentos_count} arquivo(s) no sistema`
          : null,
        legalCtx.memories.length > 0
          ? `HISTÓRICO RELEVANTE:\n` + legalCtx.memories.map((m) => `- ${m.content}`).join("\n")
          : null,
      ].filter(Boolean).join("\n\n");

      finalSystemPrompt += `\n\n== CONTEXTO JURÍDICO DO CLIENTE ==\n${sections}\n\nIMPORTANTE: Use os dados acima para responder com precisão. Responda de forma contextualizada e objetiva.`;
    }

    // ========================================
    // STAGE 3: CALL SPECIALIST AGENT (Direct OpenAI)
    // ========================================
    let aiResponse: { result: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string } | null = null;
    let aiError: Error | null = null;

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const aiStartTime = Date.now();
    let executionRowId: string | null = null;

    try {
      const { data: execData } = await supabase
        .from("agent_executions")
        .insert({
          execution_id: executionId,
          lead_id: leadId,
          tenant_id: tenantId,
          status: "processing",
          current_agent: agentName,
          agents_involved: [agentName],
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      executionRowId = execData?.id ?? null;
    } catch { /* non-critical */ }

    try {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

      const openai = new OpenAI({ apiKey: openaiApiKey });

      const aiMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: commandIntent ?? processedText },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let completion;
      try {
        completion = await openai.chat.completions.create(
          {
            model: DEFAULT_OPENAI_MODEL,
            messages: aiMessages,
            temperature: agentTemp,
            max_tokens: agentMaxTokens,
          },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const resultText = completion.choices[0]?.message?.content || "";
      aiResponse = {
        result: resultText,
        usage: completion.usage
          ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
          : undefined,
        model: completion.model,
      };

      // Mark execution completed
      const duration = Date.now() - aiStartTime;
      void supabase
        .from("agent_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_duration_ms: duration,
          total_tokens: aiResponse.usage?.total_tokens || 0,
        })
        .eq("execution_id", executionId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] execution complete error:", error.message); });

      // Log AI processing (non-blocking)
      if (executionRowId) {
        void supabase.from("agent_ai_logs").insert({
          execution_id: executionRowId,
          agent_name: agentName,
          lead_id: leadId,
          tenant_id: tenantId,
          model: aiResponse.model,
          prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
          completion_tokens: aiResponse.usage?.completion_tokens || 0,
          total_tokens: aiResponse.usage?.total_tokens || 0,
          result_preview: resultText.substring(0, 200),
          system_prompt: finalSystemPrompt.substring(0, 500),
          user_prompt: (commandIntent ?? processedText).substring(0, 500),
          full_result: resultText.substring(0, 2000),
          context: { mediaCategory, agent: agentName, hasLegalContext: legalCtx.has_context },
          created_at: new Date().toISOString(),
        }).then(({ error }) => { if (error) console.error("[webhook] ai_log insert error:", error.message); });
      }

      console.log(`[processMsg:${provider}] ${agentName} responded: "${resultText.substring(0, 80)}..."`);
    } catch (err) {
      aiError = err instanceof Error ? err : new Error(String(err));
      console.error(`[processMsg:${provider}] AI error (using fallback):`, aiError.message);

      void supabase
        .from("agent_executions")
        .update({
          status: "failed",
          error_message: aiError.message,
          completed_at: new Date().toISOString(),
        })
        .eq("execution_id", executionId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] execution fail error:", error.message); });
    }

    const aiText = aiError
      ? `Olá! Recebi sua mensagem e em breve um de nossos advogados entrará em contato. Obrigado pelo contato com ${officeName}!`
      : (aiResponse?.result || "Desculpe, não consegui processar sua mensagem no momento.");

    // --- HUMAN HANDOFF: detect uncertainty ---
    const HANDOFF_PATTERNS = [
      "não tenho como informar",
      "não sei informar",
      "precisa entrar em contato",
      "recomendo falar com um advogado",
      "não consigo acessar",
    ];
    const shouldHandoff = HANDOFF_PATTERNS.some((p) => aiText.toLowerCase().includes(p));
    if (shouldHandoff && conversationId) {
      void supabase
        .from("whatsapp_conversations")
        .update({ ia_active: false })
        .eq("id", conversationId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] handoff update error:", error.message); });
      void supabase.from("notificacoes").insert({
        tenant_id: tenantId,
        tipo: "alerta",
        titulo: "Conversa requer atenção humana",
        mensagem: `A IA não conseguiu responder ao cliente ${name} (${from}). Conversa pausada.`,
      }).then(({ error }) => { if (error) console.error("[webhook] notificacao insert error:", error.message); });
    }

    // --- SAVE TO AGENT MEMORY (non-blocking, only when has legal context) ---
    if (legalCtx.has_context && text.length > 30 && aiResponse?.result) {
      void (async () => {
        try {
          await supabase.from("agent_memory").insert({
            tenant_id: tenantId,
            lead_id: leadId,
            agent_name: agentName,
            memory_type: "conversation",
            content: `Cliente: "${text.substring(0, 200)}". Assistente: "${(aiResponse.result as string).substring(0, 300)}"`,
            importance: legalCtx.prazos_urgentes.length > 0 ? 7 : 5,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { command: commandKey ?? null, processos_count: legalCtx.processos.length },
          });
        } catch { /* non-critical */ }
      })();
    }

    // --- AUTO-QUALIFY LEAD IN CRM ---
    const messagesForAnalysis = (recentMessages || []).map((m: { sender: string; content: string }) => ({
      sender: m.sender,
      content: m.content,
    }));

    const qualification = analyzeQualification(messagesForAnalysis, currentLeadStatus, aiText);

    const leadUpdate: Record<string, unknown> = {
      status: qualification.suggestedStatus,
      updated_at: new Date().toISOString(),
    };

    if (qualification.extractedName && name === "Unknown") {
      leadUpdate.nome = qualification.extractedName;
    }
    if (qualification.extractedArea) {
      leadUpdate.area_juridica = qualification.extractedArea;
    }
    if (qualification.temperature) {
      leadUpdate.temperature = qualification.temperature;
    }
    if (!conversation) {
      leadUpdate.descricao = `[WhatsApp] Primeiro contato: "${text.substring(0, 200)}"`;
    }

    await supabase
      .from("leads")
      .update(leadUpdate)
      .eq("id", leadId)
      .eq("tenant_id", tenantId);

    if (qualification.suggestedStatus !== currentLeadStatus) {
      console.log(`[processMsg:${provider}] Lead ${leadId} qualified: ${currentLeadStatus} → ${qualification.suggestedStatus} (area=${qualification.extractedArea}, temp=${qualification.temperature})`);
    }

    // --- SEND REPLY FIRST, THEN SAVE ---
    console.log(`[processMsg:${provider}] Sending reply via ${provider} to ${from}`);
    let sendResult: SendResult;
    if (provider === "kapso") {
      sendResult = await sendViaKapso(from, aiText);
    } else {
      sendResult = await sendViaMeta(from, aiText, tenantId, supabase);
    }

    const aiProcessedOk = !aiError && !!aiResponse?.result;

    // --- SAVE AI RESPONSE WITH DELIVERY STATUS ---
    const { error: aiMsgError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      sender: "ia",
      content: aiText,
      message_type: "text",
      timestamp: new Date().toISOString(),
      send_status: sendResult.success ? "sent" : "failed",
      provider_message_id: sendResult.messageId,
      send_error: sendResult.error,
      processed_by_agent: aiProcessedOk,
      // Legacy columns (kept for backward compatibility)
      session_id: conversationId,
      direction: "outbound",
      to_number: from,
      message_text: aiText,
    });

    if (aiMsgError) {
      console.error(`[processMsg:${provider}] Error saving AI response:`, aiMsgError);
    }

    // --- UPDATE AGENT STATUS ON CONVERSATION ---
    const agentStatus = aiError ? "failed" : (shouldHandoff ? "waiting_human" : "idle");
    void supabase
      .from("whatsapp_conversations")
      .update({
        agent_status: agentStatus,
        last_agent_error: aiError ? "AI processing failed" : null,
        agent_processed_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("tenant_id", tenantId)
      .then(({ error: agentErr }) => {
        if (agentErr) console.error("[webhook] agent_status update error:", agentErr.message);
      });

    // --- MARK INBOUND MESSAGE AS PROCESSED ---
    if (inboundMsgId && aiProcessedOk) {
      void supabase
        .from("whatsapp_messages")
        .update({ processed_by_agent: true })
        .eq("id", inboundMsgId)
        .then(({ error: updateErr }) => {
          if (updateErr) console.error("[webhook] processed_by_agent update error:", updateErr.message);
        });
    }

    if (!sendResult.success) {
      console.error(`[processMsg:${provider}] SEND FAILED: ${sendResult.error}`);
    }
    console.log(`[processMsg:${provider}] PIPELINE COMPLETE for ${from} (sent=${sendResult.success})`);
  } catch (error) {
    console.error(`[processMsg] EXCEPTION:`, error);
  }
}

// ============================================
// 📤 ENVIO VIA KAPSO API (com retry exponencial)
// ============================================
interface SendResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

async function sendViaKapso(to: string, text: string): Promise<SendResult> {
  try {
    const { sendTextMessage } = await import("../_shared/kapso-client.ts");
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await sendTextMessage(to, text);
        return { success: true, messageId: result.messageId, error: null };
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[webhook:kapso] Send error, retry in ${delay}ms (attempt ${attempt + 1}):`, error);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          const errorMsg = error instanceof Error ? error.message : "Send failed after retries";
          console.error("[webhook:kapso] Send failed after retries:", error);
          return { success: false, messageId: null, error: errorMsg };
        }
      }
    }
    return { success: false, messageId: null, error: "Max retries exceeded" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Kapso API not configured";
    console.error("[webhook:kapso] Kapso import/config error:", error);
    return { success: false, messageId: null, error: errorMsg };
  }
}

// ============================================
// 📤 ENVIO VIA META OFFICIAL API (backward compatible)
// ============================================
async function sendViaMeta(to: string, text: string, tenantId: string, supabase: ReturnType<typeof createClient>): Promise<SendResult> {
  let accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  let phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

  // Tenta buscar credenciais da integração Meta scoped by tenant
  let configQuery = supabase
    .from("configuracoes_integracoes")
    .select("api_key, endpoint_url")
    .eq("nome_integracao", INTEGRATION_NAME_META)
    .eq("status", "ativa");

  if (tenantId) {
    configQuery = configQuery.eq("tenant_id", tenantId);
  }

  const { data: config } = await configQuery.maybeSingle();

  if (config?.api_key) accessToken = config.api_key;
  if (config?.endpoint_url) phoneNumberId = config.endpoint_url;

  if (!accessToken || !phoneNumberId) {
    console.error("[webhook:meta] Missing credentials for sending");
    return { success: false, messageId: null, error: "Meta API credentials not configured" };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error("[webhook:meta] Error sending:", data);
      return { success: false, messageId: null, error: errorMsg };
    }
    const messageId = data?.messages?.[0]?.id || null;
    return { success: true, messageId, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    console.error("[webhook:meta] Network error:", error);
    return { success: false, messageId: null, error: errorMsg };
  }
}
