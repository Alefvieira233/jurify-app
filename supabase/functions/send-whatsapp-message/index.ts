/**
 * 🚀 SEND WHATSAPP MESSAGE - EDGE FUNCTION (SECURE)
 *
 * Edge Function segura para envio de mensagens WhatsApp.
 * Suporta Evolution API (self-hosted) e Meta Official API.
 * Detecta automaticamente o provider do tenant.
 *
 * @version 2.0.0
 * @security Enterprise Grade
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

console.log("🚀 Send WhatsApp Message Function Started (Evolution + Meta)");

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

// 🔒 TIPOS DE REQUISIÇÃO
interface SendMessageRequest {
  to: string;              // Número de telefone (ex: 5511999999999)
  text: string;            // Texto da mensagem
  leadId?: string;         // ID do lead (opcional)
  conversationId?: string; // ID da conversa (opcional)
  tenantId?: string;       // ID do tenant (opcional, será inferido do usuário)
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

// 🛡️ Validação de Input
function validateRequest(data: unknown): data is SendMessageRequest {
  const req = data as Partial<SendMessageRequest>;

  if (!req.to || typeof req.to !== "string") {
    throw new Error("Campo 'to' é obrigatório e deve ser uma string");
  }

  if (!req.text || typeof req.text !== "string") {
    throw new Error("Campo 'text' é obrigatório e deve ser uma string");
  }

  if (req.text.length > 4096) {
    throw new Error("Mensagem muito longa (máximo 4096 caracteres)");
  }

  // Validação básica de número de telefone (formato internacional)
  const phoneRegex = /^\d{10,15}$/;
  const cleanPhone = req.to.replace(/\D/g, "");
  if (!phoneRegex.test(cleanPhone)) {
    throw new Error("Número de telefone inválido (use formato internacional sem +)");
  }

  return true;
}

// 📤 Envia mensagem via Evolution API (self-hosted)
async function sendViaEvolution(
  to: string,
  text: string,
  instanceName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API credentials not configured" };
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: to,
          text: text,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Evolution API Error:", data);
      return {
        success: false,
        error: data.message || `Evolution API error: ${response.status}`,
      };
    }

    const messageId = data.key?.id || data.messageId || "sent";
    console.log(`✅ Evolution message sent to ${to} via ${instanceName}: ${messageId}`);

    return { success: true, messageId };
  } catch (error) {
    console.error("❌ Network error (Evolution):", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// 📤 Envia mensagem via WhatsApp Business API (Meta Official)
async function sendViaMeta(
  to: string,
  text: string,
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Meta API Error:", data);
      return {
        success: false,
        error: data.error?.message || `WhatsApp API error: ${response.status}`,
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`✅ Meta message sent successfully: ${messageId}`);

    return { success: true, messageId };
  } catch (error) {
    console.error("❌ Network error (Meta):", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// 💾 Salva mensagem no banco de dados
async function saveMessageToDatabase(
  supabase: ReturnType<typeof createClient>,
  request: SendMessageRequest,
  messageId: string,
  userId: string
): Promise<void> {
  try {
    // Se temos conversationId, salvamos a mensagem
    if (request.conversationId) {
      const { error } = await supabase.from("whatsapp_messages").insert({
        conversation_id: request.conversationId,
        sender: "agent",
        content: request.text,
        message_type: "text",
        timestamp: new Date().toISOString(),
        read: true, // Mensagens enviadas pelo agente já são "lidas"
      });

      if (error) {
        console.error("❌ Error saving message to database:", error);
        // Não interrompemos o fluxo se falhar o salvamento
      } else {
        console.log("✅ Message saved to database");

        // Atualiza última mensagem da conversa
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message: request.text,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", request.conversationId);
      }
    }
  } catch (error) {
    console.error("❌ Error saving message:", error);
    // Não interrompemos o fluxo se falhar o salvamento
  }
}

// 🔑 Busca credenciais do WhatsApp para o tenant (Evolution ou Meta)
interface WhatsAppCredentials {
  provider: "evolution" | "meta";
  instanceName?: string;   // Evolution: nome da instância
  phoneNumberId?: string;  // Meta: phone number ID
  accessToken?: string;    // Meta: access token
}

async function getWhatsAppCredentials(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string
): Promise<WhatsAppCredentials | null> {
  if (!tenantId) {
    // Fallback para credenciais globais Meta
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    if (phoneNumberId && accessToken) {
      return { provider: "meta", phoneNumberId, accessToken };
    }
    return null;
  }

  // 1. Tenta Evolution API primeiro (prioridade)
  const { data: evolutionConfig } = await supabase
    .from("configuracoes_integracoes")
    .select("observacoes, status")
    .eq("nome_integracao", "whatsapp_evolution")
    .eq("status", "ativa")
    .maybeSingle();

  if (evolutionConfig?.observacoes && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
    // Extract instanceName from observacoes (format: "Instance: nome")
    const match = evolutionConfig.observacoes.match(/Instance:\s*([^|]+)/);
    const instanceName = match ? match[1].trim() : null;
    if (instanceName) {
      return {
        provider: "evolution",
        instanceName,
      };
    }
  }

  // 2. Tenta Meta Official API
  const { data: metaConfig } = await supabase
    .from("configuracoes_integracoes")
    .select("api_key, endpoint_url")
    .eq("nome_integracao", "whatsapp_oficial")
    .eq("status", "ativa")
    .maybeSingle();

  if (metaConfig?.api_key && metaConfig?.endpoint_url) {
    return {
      provider: "meta",
      phoneNumberId: metaConfig.endpoint_url,
      accessToken: metaConfig.api_key,
    };
  }

  // 3. Fallback para credenciais globais Meta
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (phoneNumberId && accessToken) {
    return { provider: "meta", phoneNumberId, accessToken };
  }

  console.error("❌ No WhatsApp credentials found for tenant:", tenantId);
  return null;
}

// 🚀 HANDLER PRINCIPAL
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔐 Verificação de autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Inicializa Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Cliente com ANON key para validar JWT do usuário
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Verifica usuário autenticado usando ANON key
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    // Cliente com SERVICE ROLE para operações no banco (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 🛡️ Rate Limiting - Limite por usuário
    // Limite: 30 mensagens por minuto por usuário
    const rateLimitCheck = await applyRateLimit(
      req,
      {
        maxRequests: 30,
        windowSeconds: 60,
        namespace: "send-whatsapp",
      },
      {
        supabase,
        user,
        corsHeaders,
      }
    );

    if (!rateLimitCheck.allowed) {
      console.warn(
        `⚠️ Rate limit exceeded for user ${user.id}:`,
        rateLimitCheck.result
      );
      return rateLimitCheck.response;
    }

    console.log(
      `✅ Rate limit OK: ${rateLimitCheck.result.remaining}/${rateLimitCheck.result.limit} remaining`
    );

    // 📥 Parse e valida request
    const requestData = await req.json();
    validateRequest(requestData);

    const messageRequest = requestData as SendMessageRequest;

    // SECURITY: tenantId deve vir do profile autenticado, nunca do request body
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const tenantId = userProfile?.tenant_id;

    // 🔑 Busca credenciais do WhatsApp
    const credentials = await getWhatsAppCredentials(
      supabase,
      tenantId
    );

    if (!credentials) {
      throw new Error(
        "WhatsApp credentials not configured. Please contact support."
      );
    }

    // 📤 Envia mensagem via provider detectado
    let result: { success: boolean; messageId?: string; error?: string };

    if (credentials.provider === "evolution" && credentials.instanceName) {
      console.log(`📤 Sending via Evolution API (instance: ${credentials.instanceName})`);
      result = await sendViaEvolution(
        messageRequest.to,
        messageRequest.text,
        credentials.instanceName
      );
    } else if (credentials.provider === "meta" && credentials.phoneNumberId && credentials.accessToken) {
      console.log(`📤 Sending via Meta Official API`);
      result = await sendViaMeta(
        messageRequest.to,
        messageRequest.text,
        credentials.phoneNumberId,
        credentials.accessToken
      );
    } else {
      throw new Error("Invalid WhatsApp credentials configuration");
    }

    if (!result.success) {
      throw new Error(result.error || "Failed to send WhatsApp message");
    }

    // 💾 Salva mensagem no banco de dados (não-bloqueante)
    if (result.messageId) {
      saveMessageToDatabase(
        supabase,
        messageRequest,
        result.messageId,
        user.id
      ).catch(console.error);
    }

    // ✅ Retorna resposta de sucesso
    const response: SendMessageResponse = {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error in send-whatsapp-message:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 :
                       errorMessage.includes("obrigatório") || errorMessage.includes("inválido") ? 400 : 500;

    const response: SendMessageResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
