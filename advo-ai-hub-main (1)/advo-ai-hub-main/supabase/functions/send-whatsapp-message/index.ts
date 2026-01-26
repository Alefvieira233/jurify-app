/**
 * 🚀 SEND WHATSAPP MESSAGE - EDGE FUNCTION (SECURE)
 *
 * Edge Function segura para envio de mensagens WhatsApp.
 * Todas as credenciais são mantidas no servidor (Supabase Secrets).
 *
 * @version 1.0.0
 * @security Enterprise Grade
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

console.log("🚀 Send WhatsApp Message Function Started");

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

// 📤 Envia mensagem via WhatsApp Business API
async function sendWhatsAppMessage(
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
      console.error("❌ WhatsApp API Error:", data);
      return {
        success: false,
        error: data.error?.message || `WhatsApp API error: ${response.status}`,
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`✅ WhatsApp message sent successfully: ${messageId}`);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("❌ Network error sending WhatsApp message:", error);
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

// 🔑 Busca credenciais do WhatsApp para o tenant
async function getWhatsAppCredentials(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string
): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  // Estratégia de credenciais:
  // 1. Se o tenant tem credenciais próprias configuradas, usa as dele
  // 2. Caso contrário, usa as credenciais globais (Supabase Secrets)

  // TODO: Implementar tabela 'whatsapp_configs' para credenciais por tenant
  // Por enquanto, usamos as credenciais globais
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!phoneNumberId || !accessToken) {
    console.error("❌ WhatsApp credentials not configured in Supabase Secrets");
    return null;
  }

  return { phoneNumberId, accessToken };
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    console.log(`✅ Authenticated user: ${user.id}`);

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

    // 🔑 Busca credenciais do WhatsApp
    const credentials = await getWhatsAppCredentials(
      supabase,
      messageRequest.tenantId
    );

    if (!credentials) {
      throw new Error(
        "WhatsApp credentials not configured. Please contact support."
      );
    }

    // 📤 Envia mensagem via WhatsApp API
    const result = await sendWhatsAppMessage(
      messageRequest.to,
      messageRequest.text,
      credentials.phoneNumberId,
      credentials.accessToken
    );

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
