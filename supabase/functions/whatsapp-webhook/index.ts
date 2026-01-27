import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit, getRequestIdentifier } from "../_shared/rate-limiter.ts";

console.log("[whatsapp-webhook] Function started");

const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

const INTEGRATION_NAME = "whatsapp_oficial";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode !== "subscribe" || !token) {
        return new Response("Forbidden", { status: 403 });
      }

      if (WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
        console.log("[whatsapp-webhook] Verified via env token");
        return new Response(challenge, {
          headers: { "Content-Type": "text/plain" },
          status: 200,
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data, error } = await supabase
        .from("configuracoes_integracoes")
        .select("id")
        .eq("nome_integracao", INTEGRATION_NAME)
        .eq("verify_token", token)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[whatsapp-webhook] Verify token lookup failed", error);
        return new Response("Forbidden", { status: 403 });
      }

      if (data) {
        console.log("[whatsapp-webhook] Verified via stored token");
        return new Response(challenge, {
          headers: { "Content-Type": "text/plain" },
          status: 200,
        });
      }

      console.error("[whatsapp-webhook] Verification failed");
      return new Response("Forbidden", { status: 403 });
    }

    if (req.method === "POST") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const rateLimitCheck = await applyRateLimit(
        req,
        {
          maxRequests: 60,
          windowSeconds: 60,
          namespace: "whatsapp-webhook",
        },
        {
          supabase,
          corsHeaders,
        }
      );

      if (!rateLimitCheck.allowed) {
        console.warn("[whatsapp-webhook] Rate limit exceeded:", getRequestIdentifier(req), rateLimitCheck.result);
        return rateLimitCheck.response;
      }

      console.log(
        "[whatsapp-webhook] Rate limit OK:",
        `${rateLimitCheck.result.remaining}/${rateLimitCheck.result.limit} remaining`
      );

      const payload = await req.json();
      console.log("[whatsapp-webhook] Payload:", JSON.stringify(payload, null, 2));

      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          if (value && value.messages) {
            const phoneNumberId = value.metadata?.phone_number_id;

            for (const message of value.messages) {
              await processMessage(supabase, message, phoneNumberId);
            }
          }
        }
      }

      return new Response("OK", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        status: 200,
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("[whatsapp-webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function processMessage(supabase: any, message: any, phoneNumberId?: string) {
  try {
    if (message.type !== "text") {
      console.log("[whatsapp-webhook] Skipping non-text message type:", message.type);
      return;
    }

    const from = message.from;
    const text = message.text.body;
    const name = message._vendor?.name || "Unknown";

    console.log(`[whatsapp-webhook] Processing message from ${from}: ${text}`);

    let tenantId: string | null = null;
    let accessToken: string | null = null;

    if (phoneNumberId) {
      const { data: config, error: configError } = await supabase
        .from("configuracoes_integracoes")
        .select("tenant_id, api_key, phone_number_id")
        .eq("nome_integracao", INTEGRATION_NAME)
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (configError) {
        console.error("[whatsapp-webhook] Failed to load WhatsApp config:", configError);
      }

      if (config) {
        tenantId = config.tenant_id;
        accessToken = config.api_key;
      }
    }

    if (!tenantId) {
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("tenant_id")
        .eq("phone_number", from)
        .limit(1)
        .single();

      if (existingConv) {
        tenantId = existingConv.tenant_id;
      } else {
        const { data: tenant } = await supabase
          .from("profiles")
          .select("tenant_id")
          .limit(1)
          .single();

        tenantId = tenant?.tenant_id;
      }
    }

    if (!tenantId) {
      console.error("[whatsapp-webhook] No tenant found for message");
      return;
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("telefone", from)
      .eq("tenant_id", tenantId)
      .single();

    let leadId = lead?.id || null;

    if (!leadId) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          tenant_id: tenantId,
          nome_completo: name,
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
        console.error("[whatsapp-webhook] Error creating lead:", leadError);
        return;
      }
      leadId = newLead.id;
    }

    let conversationId = null;
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (conversation) {
      conversationId = conversation.id;
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await supabase.rpc("increment_unread_count", {
        conversation_id: conversationId,
      });
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
        console.error("[whatsapp-webhook] Error creating conversation:", convError);
        return;
      }
      conversationId = newConv.id;
    }

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      sender: "lead",
      content: text,
      message_type: "text",
      timestamp: new Date().toISOString(),
    });

    console.log("[whatsapp-webhook] Invoking AI Agent");

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke("ai-agent-processor", {
      body: {
        agentName: "Coordenador",
        agentSpecialization: "Triagem e Atendimento Inicial",
        systemPrompt:
          "Voce e um assistente juridico virtual. Seu objetivo e qualificar o lead e entender o problema juridico.",
        userPrompt: text,
        leadId: leadId,
        tenantId: tenantId,
        context: {
          channel: "whatsapp",
          phone: from,
        },
      },
    });

    if (aiError) {
      console.error("[whatsapp-webhook] Error invoking AI agent:", aiError);
      return;
    }

    const aiText = aiResponse?.result || "Desculpe, nao consegui processar sua mensagem no momento.";

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      sender: "ia",
      content: aiText,
      message_type: "text",
      timestamp: new Date().toISOString(),
    });

    await sendWhatsAppMessage(from, aiText, phoneNumberId, accessToken || WHATSAPP_ACCESS_TOKEN || "");
  } catch (error) {
    console.error("[whatsapp-webhook] Error processing message:", error);
  }
}

async function sendWhatsAppMessage(
  to: string,
  text: string,
  phoneNumberId?: string,
  accessToken?: string
) {
  const token = accessToken || "";
  const idToSendFrom = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || phoneNumberId;

  if (!token || !idToSendFrom) {
    console.error("[whatsapp-webhook] Missing WhatsApp credentials for sending");
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${idToSendFrom}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
      console.error("[whatsapp-webhook] Error sending WhatsApp message:", data);
    } else {
      console.log("[whatsapp-webhook] WhatsApp message sent:", data.messages?.[0]?.id);
    }
  } catch (error) {
    console.error("[whatsapp-webhook] Network error sending WhatsApp message:", error);
  }
}
