import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit, getRequestIdentifier } from "../_shared/rate-limiter.ts";
import { buildLegalContext } from "../_shared/legal-context.ts";

// whatsapp-webhook: Evolution API + Meta compatible

/** Escapa caracteres especiais do LIKE para evitar manipulação de padrões */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

// --- Typed webhook payloads ---

interface EvolutionMessageKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
}

interface EvolutionMessageData {
  key?: EvolutionMessageKey;
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown>;
}

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: EvolutionMessageData & Record<string, unknown>;
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

type WebhookPayload = EvolutionWebhookPayload & MetaWebhookPayload & Record<string, unknown>;

const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");

const INTEGRATION_NAME_EVOLUTION = "whatsapp_evolution";
const INTEGRATION_NAME_META = "whatsapp_oficial";

// ============================================
// 🔍 DETECTA ORIGEM DO WEBHOOK (Evolution vs Meta)
// ============================================
interface NormalizedMessage {
  from: string;
  name: string;
  text: string;
  messageType: string;
  mediaUrl: string | null;
  instanceName: string | null;
  provider: "evolution" | "meta";
}

function isEvolutionPayload(payload: WebhookPayload): boolean {
  return !!(payload?.event || payload?.instance || payload?.data?.key);
}

function normalizeEvolutionMessage(payload: WebhookPayload): NormalizedMessage | null {
  const event = payload.event;

  // Só processa mensagens recebidas (não enviadas pelo bot)
  if (event !== "messages.upsert") return null;

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
    provider: "evolution",
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

        if (text) {
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

  // Durable check: DB-backed idempotency
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", messageId)
    .eq("source", "whatsapp")
    .maybeSingle();

  if (existing) return true;

  // Record event for future dedup
  await supabase
    .from("webhook_events")
    .insert({ event_id: messageId, source: "whatsapp" })
    .select()
    .maybeSingle();

  return false;
}

function getMessageId(payload: WebhookPayload, provider: "evolution" | "meta"): string | null {
  if (provider === "evolution") {
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

    // GET = Meta webhook verification (Evolution não usa GET)
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
      // 🔀 ROTEAMENTO: Evolution ou Meta?
      // ============================================
      if (isEvolutionPayload(payload)) {
        // Verify Evolution webhook signature if secret is configured
        const webhookSecret = req.headers.get("x-webhook-secret");

        if (EVOLUTION_WEBHOOK_SECRET) {
          if (webhookSecret !== EVOLUTION_WEBHOOK_SECRET) {
            console.error("[webhook:evolution] SECURITY: Invalid webhook secret — rejecting. Got:", webhookSecret ? "***" : "(empty)");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
        } else {
          console.warn("[webhook:evolution] EVOLUTION_WEBHOOK_SECRET not configured — accepting without validation");
        }

        // --- EVOLUTION API ---
        const event = payload.event;
        const instanceName = payload.instance;
        console.log(`[webhook:evolution] Event: ${event} | Instance: ${instanceName}`);

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
              .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
              .ilike("observacoes", `%${escapeLike(instanceName)}%`);

            // Se não atualizou nenhum registro, cria um novo (auto-repair)
            if ((count ?? 0) === 0 && state === "open") {
              // Extrai tenant_id do nome da instância (formato: jurify_XXXXXXXX)
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
                      nome_integracao: INTEGRATION_NAME_EVOLUTION,
                      status: "ativa",
                      api_key: "evolution_managed",
                      endpoint_url: EVOLUTION_API_URL || "evolution",
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
              .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
              .ilike("observacoes", `%${escapeLike(instanceName)}%`);
          }

          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Mensagem recebida
        if (event === "messages.upsert") {
          const msgId = getMessageId(payload, "evolution");
          console.log(`[webhook:evolution] Message ID: ${msgId} | fromMe: ${payload.data?.key?.fromMe}`);
          if (msgId && await isDuplicate(msgId, supabase)) {
            console.log(`[webhook:evolution] Duplicate message ${msgId}, skipping`);
            return new Response("OK", { status: 200, headers: corsHeaders });
          }
          const normalized = normalizeEvolutionMessage(payload);
          if (normalized) {
            console.log(`[webhook:evolution] Processing message from ${normalized.from}: "${normalized.text.substring(0, 50)}"`);
            await processNormalizedMessage(supabase, normalized);
          } else {
            console.warn(`[webhook:evolution] Could not normalize message (fromMe or empty)`);
          }
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Outros eventos
        console.log(`[webhook:evolution] Ignoring event: ${event}`);
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
        .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
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
            nome_integracao: INTEGRATION_NAME_EVOLUTION,
            status: "ativa",
            api_key: "evolution_managed",
            endpoint_url: EVOLUTION_API_URL || "evolution",
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
      .select("id")
      .eq("telefone", from)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let leadId = lead?.id || null;

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
          status: "novo_lead",
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

    console.log(`[processMsg:${provider}] Invoking AI agent for conversation ${conversationId}`);

    // --- INVOKE AI AGENT (Coordenador = Recepcionista) ---

    // Busca configuracao do escritorio para personalizar o prompt da IA
    let officeName = "nosso escritorio";
    let assistantName = "Ana";
    try {
      // Try escritorios table first (custom table some tenants may have)
      const { data: tenantConfig } = await supabase
        .from("escritorios")
        .select("nome, whatsapp_assistant_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (tenantConfig?.nome) officeName = tenantConfig.nome;
      if (tenantConfig?.whatsapp_assistant_name) assistantName = tenantConfig.whatsapp_assistant_name;
    } catch {
      // Table may not exist — try configuracoes_integracoes as fallback
      try {
        const { data: intConfig } = await supabase
          .from("configuracoes_integracoes")
          .select("observacoes")
          .eq("tenant_id", tenantId)
          .eq("nome_integracao", "whatsapp_config")
          .maybeSingle();

        if (intConfig?.observacoes) {
          // Parse "office:NomeEscritorio;assistant:NomeAssistente" format
          const obs = intConfig.observacoes as string;
          const officeMatch = obs.match(/office:\s*(.+?)(?:;|$)/);
          const assistantMatch = obs.match(/assistant:\s*(.+?)(?:;|$)/);
          if (officeMatch?.[1]) officeName = officeMatch[1].trim();
          if (assistantMatch?.[1]) assistantName = assistantMatch[1].trim();
        }
      } catch {
      }
    }

    // Busca historico recente da conversa para contexto
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

    const coordenadorPrompt = `Voce e a recepcionista virtual do escritorio de advocacia ${officeName}. Seu nome e ${assistantName}.

REGRAS OBRIGATORIAS:
1. Seja educada, profissional e acolhedora. Use linguagem simples e direta.
2. Na PRIMEIRA mensagem de qualquer pessoa, cumprimente e pergunte como pode ajudar.
3. Seu objetivo principal e QUALIFICAR o lead: entender o problema juridico, urgencia e dados basicos.
4. Faca perguntas uma de cada vez, nao bombardeie o cliente.
5. Colete: nome completo, tipo de problema juridico (trabalhista, familia, consumidor, etc), urgencia.
6. Quando tiver informacoes suficientes, informe que um advogado especialista de ${officeName} entrara em contato.
7. NUNCA de orientacao juridica especifica. Diga que o advogado ira analisar o caso.
8. Responda SEMPRE em portugues brasileiro.
9. Mantenha respostas curtas (maximo 3 paragrafos) — e WhatsApp, ninguem le textao.
10. Se o cliente mandar apenas "oi", "ola", "bom dia" etc, responda com uma saudacao e pergunte como pode ajudar.

FLUXO DE QUALIFICACAO:
- Saudacao → Entender problema → Coletar nome → Classificar area juridica → Verificar urgencia → Encaminhar

${conversationHistory ? `HISTORICO DA CONVERSA:\n${conversationHistory}\n` : ""}`;

    // --- DETECT COMMAND ---
    const COMMANDS: Record<string, string> = {
      "/prazos": "liste os prazos processuais do cliente",
      "/processos": "liste os processos ativos do cliente",
      "/documentos": "informe quantos documentos o cliente tem no sistema",
      "/honorarios": "informe o status dos honorários do cliente",
      "/status": "dê um resumo completo dos casos do cliente",
    };
    const commandKey = Object.keys(COMMANDS).find((cmd) =>
      text.trim().toLowerCase().startsWith(cmd)
    );
    const commandIntent = commandKey ? COMMANDS[commandKey] : null;

    // --- BUILD LEGAL CONTEXT ---
    const legalCtx = await buildLegalContext(supabase, leadId, tenantId, text);

    // --- UPGRADE SYSTEM PROMPT IF HAS LEGAL CONTEXT ---
    let finalSystemPrompt = coordenadorPrompt;
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

      finalSystemPrompt = coordenadorPrompt +
        `\n\n== CONTEXTO JURÍDICO DO CLIENTE ==\n${sections}\n\n` +
        `IMPORTANTE: Este é um cliente existente. Use os dados acima para responder com precisão. ` +
        `Não diga que não tem acesso — você TEM. Responda de forma contextualizada e objetiva.`;
    }

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke("ai-agent-processor", {
      body: {
        agentName: legalCtx.has_context ? "Assistente Juridico" : "Coordenador",
        agentSpecialization: legalCtx.has_context
          ? "Assistência jurídica contextual para clientes ativos"
          : "Recepcao e Qualificacao de Leads Juridicos",
        systemPrompt: finalSystemPrompt,
        userPrompt: commandIntent ?? text,
        leadId: leadId,
        tenantId: tenantId,
        temperature: 0.5,
        maxTokens: legalCtx.has_context ? 800 : 500,
        context: {
          channel: "whatsapp",
          phone: from,
          contactName: name,
          isFirstContact: !conversation,
          has_legal_context: legalCtx.has_context,
          active_processos: legalCtx.processos.length,
          urgent_prazos: legalCtx.prazos_urgentes.length,
          command: commandKey ?? null,
        },
      },
    });

    const aiText = aiError
      ? `Ola! Recebi sua mensagem e em breve um de nossos advogados entrara em contato. Obrigado pelo contato com ${officeName}!`
      : (aiResponse?.result || "Desculpe, nao consegui processar sua mensagem no momento.");

    if (aiError) {
      console.error(`[processMsg:${provider}] AI agent error (using fallback):`, aiError);
    } else {
      console.log(`[processMsg:${provider}] AI responded: "${aiText.substring(0, 80)}..."`);
    }

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
            agent_name: "Assistente Juridico",
            memory_type: "conversation",
            content: `Cliente: "${text.substring(0, 200)}". Assistente: "${(aiResponse.result as string).substring(0, 300)}"`,
            importance: legalCtx.prazos_urgentes.length > 0 ? 7 : 5,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { command: commandKey ?? null, processos_count: legalCtx.processos.length },
          });
        } catch { /* non-critical */ }
      })();
    }

    // --- UPDATE LEAD STATUS IN CRM ---
    // Se é primeiro contato, atualiza status para "em_atendimento"
    if (!conversation) {
      await supabase
        .from("leads")
        .update({
          status: "em_atendimento",
          descricao: `[WhatsApp] Primeiro contato: "${text.substring(0, 200)}"`,
        })
        .eq("telefone", from)
        .eq("tenant_id", tenantId);

    }

    // --- SEND REPLY FIRST, THEN SAVE ---
    console.log(`[processMsg:${provider}] Sending reply via ${provider} to ${from}`);
    let sendResult: SendResult;
    if (provider === "evolution" && instanceName) {
      sendResult = await sendViaEvolution(instanceName, from, aiText);
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
// 📤 ENVIO VIA EVOLUTION API (com retry exponencial)
// ============================================
interface SendResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

async function sendViaEvolution(instanceName: string, to: string, text: string): Promise<SendResult> {
  const apiUrl = EVOLUTION_API_URL;
  const apiKey = EVOLUTION_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("[webhook:evolution] EVOLUTION_API_URL or EVOLUTION_API_KEY not configured");
    return { success: false, messageId: null, error: "Evolution API not configured" };
  }

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({ number: to, text }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Retry on server errors (5xx), not client errors (4xx)
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[webhook:evolution] HTTP ${response.status}, retry in ${delay}ms (attempt ${attempt + 1})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        const errorMsg = typeof data?.message === "string" ? data.message : `HTTP ${response.status}`;
        console.error("[webhook:evolution] Error sending message:", data);
        return { success: false, messageId: null, error: errorMsg };
      }

      // Extract messageId from Evolution response
      const messageId = data?.key?.id || data?.messageId || null;
      return { success: true, messageId, error: null };
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[webhook:evolution] Network error, retry in ${delay}ms (attempt ${attempt + 1}):`, error);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        const errorMsg = error instanceof Error ? error.message : "Network error after retries";
        console.error("[webhook:evolution] Network error after retries:", error);
        return { success: false, messageId: null, error: errorMsg };
      }
    }
  }
  return { success: false, messageId: null, error: "Max retries exceeded" };
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

    const data = await response.json();
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
