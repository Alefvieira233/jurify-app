import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit, getRequestIdentifier } from "../_shared/rate-limiter.ts";

console.log("[whatsapp-webhook] Function started (Evolution API + Meta compatible)");

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
serve(async (req) => {
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
        if (EVOLUTION_WEBHOOK_SECRET) {
          const webhookSecret = req.headers.get("x-webhook-secret");
          if (webhookSecret !== EVOLUTION_WEBHOOK_SECRET) {
            console.error("[webhook:evolution] Invalid webhook secret — rejecting request");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
        } else {
          console.warn("[webhook:evolution] EVOLUTION_WEBHOOK_SECRET not set — skipping signature verification");
        }
        // --- EVOLUTION API ---
        const event = payload.event;
        console.log(`[webhook:evolution] Event: ${event}, Instance: ${payload.instance}`);

        // Eventos de conexão (QR Code, status)
        if (event === "connection.update") {
          const state = payload.data?.state;
          const instanceName = payload.instance;
          console.log(`[webhook:evolution] Connection: ${instanceName} → ${state}`);

          if (instanceName && state) {
            const dbStatus = state === "open" ? "ativa" : "inativa";
            await supabase
              .from("configuracoes_integracoes")
              .update({ status: dbStatus })
              .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
              .ilike("observacoes", `%${instanceName}%`);
          }

          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // QR Code atualizado
        if (event === "qrcode.updated") {
          const instanceName = payload.instance;
          const qrCode = payload.data?.qrcode?.base64 || payload.data?.qrcode;
          console.log(`[webhook:evolution] QR Code updated for: ${instanceName}`);

          if (instanceName && qrCode) {
            await supabase
              .from("configuracoes_integracoes")
              .update({
                status: "inativa",
                observacoes: `Instance: ${instanceName} | QR: pending`,
              })
              .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
              .ilike("observacoes", `%${instanceName}%`);
          }

          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Mensagem recebida
        if (event === "messages.upsert") {
          const msgId = getMessageId(payload, "evolution");
          if (msgId && await isDuplicate(msgId, supabase)) {
            console.log(`[webhook:evolution] Duplicate message ignored: ${msgId}`);
            return new Response("OK", { status: 200, headers: corsHeaders });
          }
          const normalized = normalizeEvolutionMessage(payload);
          if (normalized) {
            await processNormalizedMessage(supabase, normalized);
          }
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        // Outros eventos (ignorar silenciosamente)
        return new Response("OK", { status: 200, headers: corsHeaders });

      } else {
        // --- META OFFICIAL API (backward compatible) ---
        console.log("[webhook:meta] Processing Meta webhook");

        const metaMsgId = getMessageId(payload, "meta");
        if (metaMsgId && await isDuplicate(metaMsgId, supabase)) {
          console.log(`[webhook:meta] Duplicate message ignored: ${metaMsgId}`);
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
async function processStatusUpdate(supabase: ReturnType<typeof createClient>, status: MetaWebhookStatus) {
  try {
    const statusValue = status.status;
    const recipientId = status.recipient_id;

    if (statusValue === "read") {
      await supabase
        .from("whatsapp_messages")
        .update({ read: true })
        .eq("sender", "ia")
        .ilike("content", `%${recipientId}%`)
        .is("read", false);
    }

    if (statusValue === "failed") {
      const errorInfo = status.errors?.[0];
      console.error("[webhook] Message delivery failed:", {
        recipient: recipientId,
        error_code: errorInfo?.code,
        error_title: errorInfo?.title,
      });
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

    console.log(`[webhook:${provider}] Message from ${from}: ${text.substring(0, 80)}`);

    // --- RESOLVE TENANT ---
    let tenantId: string | null = null;

    // 1. Busca tenant diretamente via configuracoes_integracoes.tenant_id
    if (instanceName) {
      const { data: config } = await supabase
        .from("configuracoes_integracoes")
        .select("tenant_id")
        .eq("nome_integracao", INTEGRATION_NAME_EVOLUTION)
        .ilike("observacoes", `%${instanceName}%`)
        .not("tenant_id", "is", null)
        .maybeSingle();

      if (config?.tenant_id) {
        tenantId = config.tenant_id;
        console.log(`[webhook] Tenant resolved via integration config: ${tenantId}`);
      } else {
        console.log(`[webhook] No config found for instance: ${instanceName}`);
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

    if (!tenantId) {
      console.error(`[webhook:${provider}] No tenant found for ${from}`);
      return;
    }

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
          responsavel: "Sistema",
          status: "novo_lead",
          observacoes: text,
        })
        .select("id")
        .single();

      if (leadError) {
        console.error(`[webhook:${provider}] Error creating lead:`, leadError);
        return;
      }
      leadId = newLead.id;
    }

    // --- RESOLVE/CREATE CONVERSATION ---
    let conversationId = null;
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (conversation) {
      conversationId = conversation.id;
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

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
        console.error(`[webhook:${provider}] Error creating conversation:`, convError);
        return;
      }
      conversationId = newConv.id;
    }

    // --- SAVE MESSAGE ---
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      sender: "lead",
      content: text,
      message_type: messageType === "conversation" ? "text" : messageType,
      media_url: mediaUrl,
      timestamp: new Date().toISOString(),
    });

    // --- INVOKE AI AGENT (Coordenador = Recepcionista) ---
    console.log(`[webhook:${provider}] Invoking AI Agent (Coordenador)`);

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

    const coordenadorPrompt = `Voce e a recepcionista virtual do escritorio de advocacia Jurify. Seu nome e Ana.

REGRAS OBRIGATORIAS:
1. Seja educada, profissional e acolhedora. Use linguagem simples e direta.
2. Na PRIMEIRA mensagem de qualquer pessoa, cumprimente e pergunte como pode ajudar.
3. Seu objetivo principal e QUALIFICAR o lead: entender o problema juridico, urgencia e dados basicos.
4. Faca perguntas uma de cada vez, nao bombardeie o cliente.
5. Colete: nome completo, tipo de problema juridico (trabalhista, familia, consumidor, etc), urgencia.
6. Quando tiver informacoes suficientes, informe que um advogado especialista entrara em contato.
7. NUNCA de orientacao juridica especifica. Diga que o advogado ira analisar o caso.
8. Responda SEMPRE em portugues brasileiro.
9. Mantenha respostas curtas (maximo 3 paragrafos) — e WhatsApp, ninguem le textao.
10. Se o cliente mandar apenas "oi", "ola", "bom dia" etc, responda com uma saudacao e pergunte como pode ajudar.

FLUXO DE QUALIFICACAO:
- Saudacao → Entender problema → Coletar nome → Classificar area juridica → Verificar urgencia → Encaminhar

${conversationHistory ? `HISTORICO DA CONVERSA:\n${conversationHistory}\n` : ""}`;

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke("ai-agent-processor", {
      body: {
        agentName: "Coordenador",
        agentSpecialization: "Recepcao e Qualificacao de Leads Juridicos",
        systemPrompt: coordenadorPrompt,
        userPrompt: text,
        leadId: leadId,
        tenantId: tenantId,
        temperature: 0.6,
        maxTokens: 500,
        context: {
          channel: "whatsapp",
          phone: from,
          contactName: name,
          isFirstContact: !conversation,
        },
      },
    });

    if (aiError) {
      console.error(`[webhook:${provider}] Error invoking AI agent:`, aiError);
      return;
    }

    const aiText = aiResponse?.result || "Desculpe, nao consegui processar sua mensagem no momento.";

    // --- UPDATE LEAD STATUS IN CRM ---
    // Se é primeiro contato, atualiza status para "em_atendimento"
    if (!conversation) {
      await supabase
        .from("leads")
        .update({
          status: "em_atendimento",
          observacoes: `[WhatsApp] Primeiro contato: "${text.substring(0, 200)}"`,
        })
        .eq("id", leadId)
        .eq("tenant_id", tenantId);

      console.log(`[webhook:${provider}] Lead ${leadId} status updated to em_atendimento`);
    }

    // --- SAVE AI RESPONSE ---
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      sender: "ia",
      content: aiText,
      message_type: "text",
      timestamp: new Date().toISOString(),
    });

    // --- SEND REPLY ---
    if (provider === "evolution" && instanceName) {
      await sendViaEvolution(instanceName, from, aiText);
    } else {
      await sendViaMeta(from, aiText, tenantId, supabase);
    }
  } catch (error) {
    console.error(`[webhook] Error processing message:`, error);
  }
}

// ============================================
// 📤 ENVIO VIA EVOLUTION API
// ============================================
async function sendViaEvolution(instanceName: string, to: string, text: string) {
  const apiUrl = EVOLUTION_API_URL;
  const apiKey = EVOLUTION_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("[webhook:evolution] EVOLUTION_API_URL or EVOLUTION_API_KEY not configured");
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: to,
        text: text,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[webhook:evolution] Error sending message:", data);
    } else {
      console.log(`[webhook:evolution] Message sent to ${to} via ${instanceName}`);
    }
  } catch (error) {
    console.error("[webhook:evolution] Network error:", error);
  }
}

// ============================================
// 📤 ENVIO VIA META OFFICIAL API (backward compatible)
// ============================================
async function sendViaMeta(to: string, text: string, _tenantId: string, supabase: ReturnType<typeof createClient>) {
  let accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  let phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

  // Tenta buscar credenciais da integração Meta
  const { data: config } = await supabase
    .from("configuracoes_integracoes")
    .select("api_key, endpoint_url")
    .eq("nome_integracao", INTEGRATION_NAME_META)
    .eq("status", "ativa")
    .maybeSingle();

  if (config?.api_key) accessToken = config.api_key;
  if (config?.endpoint_url) phoneNumberId = config.endpoint_url;

  if (!accessToken || !phoneNumberId) {
    console.error("[webhook:meta] Missing credentials for sending");
    return;
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
      console.error("[webhook:meta] Error sending:", data);
    } else {
      console.log("[webhook:meta] Message sent:", data.messages?.[0]?.id);
    }
  } catch (error) {
    console.error("[webhook:meta] Network error:", error);
  }
}
