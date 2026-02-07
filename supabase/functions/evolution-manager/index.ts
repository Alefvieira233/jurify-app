/**
 * 🔧 EVOLUTION MANAGER - Edge Function
 *
 * Gerencia instâncias da Evolution API para cada tenant.
 * Operações: criar instância, obter QR Code, verificar status,
 * desconectar, deletar instância.
 *
 * @version 1.0.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

console.log("🔧 Evolution Manager Function Started");

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SUPABASE_WEBHOOK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;

interface EvolutionRequest {
  action: "create" | "qrcode" | "status" | "disconnect" | "delete" | "list";
  instanceName?: string;
}

// 📡 Chamada genérica à Evolution API
async function evolutionFetch(
  path: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data: any; status: number }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, data: { error: "Evolution API not configured" }, status: 500 };
  }

  const url = `${EVOLUTION_API_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("[evolution-manager] Fetch error:", error);
    return { ok: false, data: { error: error.message }, status: 500 };
  }
}

// 🆕 Cria uma nova instância na Evolution API
async function createInstance(instanceName: string, supabase: any, tenantId: string) {
  console.log(`[evolution-manager] Creating instance: ${instanceName}`);

  const result = await evolutionFetch("/instance/create", "POST", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    webhook: {
      url: SUPABASE_WEBHOOK_URL,
      byEvents: false,
      base64: true,
      events: [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE",
      ],
    },
  });

  if (!result.ok) {
    return { success: false, error: result.data?.message || "Failed to create instance" };
  }

  // Salva configuração no banco
  const { error: dbError } = await supabase.from("configuracoes_integracoes").insert({
    tenant_id: tenantId,
    nome_integracao: "whatsapp_evolution",
    status: "aguardando_qr",
    api_key: EVOLUTION_API_KEY,
    endpoint_url: EVOLUTION_API_URL,
    phone_number_id: instanceName,
    verify_token: null,
  });

  if (dbError) {
    console.error("[evolution-manager] DB error saving config:", dbError);
  }

  return {
    success: true,
    instance: result.data?.instance,
    qrcode: result.data?.qrcode,
    status: "aguardando_qr",
  };
}

// 📱 Obtém QR Code da instância
async function getQRCode(instanceName: string) {
  console.log(`[evolution-manager] Getting QR Code for: ${instanceName}`);

  const result = await evolutionFetch(`/instance/connect/${instanceName}`);

  if (!result.ok) {
    return { success: false, error: result.data?.message || "Failed to get QR Code" };
  }

  return {
    success: true,
    qrcode: result.data?.base64 || result.data?.qrcode?.base64 || result.data,
    pairingCode: result.data?.pairingCode || null,
  };
}

// 📊 Verifica status da instância
async function getInstanceStatus(instanceName: string) {
  console.log(`[evolution-manager] Checking status for: ${instanceName}`);

  const result = await evolutionFetch(`/instance/connectionState/${instanceName}`);

  if (!result.ok) {
    return { success: false, error: result.data?.message || "Failed to get status" };
  }

  const state = result.data?.instance?.state || result.data?.state || "unknown";

  return {
    success: true,
    state,
    connected: state === "open",
  };
}

// 🔌 Desconecta instância (logout)
async function disconnectInstance(instanceName: string, supabase: any) {
  console.log(`[evolution-manager] Disconnecting: ${instanceName}`);

  const result = await evolutionFetch(`/instance/logout/${instanceName}`, "DELETE");

  // Atualiza status no banco
  await supabase
    .from("configuracoes_integracoes")
    .update({ status: "desconectada" })
    .eq("nome_integracao", "whatsapp_evolution")
    .eq("phone_number_id", instanceName);

  return {
    success: result.ok,
    error: result.ok ? undefined : result.data?.message,
  };
}

// 🗑️ Deleta instância
async function deleteInstance(instanceName: string, supabase: any, tenantId: string) {
  console.log(`[evolution-manager] Deleting: ${instanceName}`);

  const result = await evolutionFetch(`/instance/delete/${instanceName}`, "DELETE");

  // Remove do banco
  await supabase
    .from("configuracoes_integracoes")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("nome_integracao", "whatsapp_evolution")
    .eq("phone_number_id", instanceName);

  return {
    success: result.ok,
    error: result.ok ? undefined : result.data?.message,
  };
}

// 📋 Lista todas as instâncias
async function listInstances() {
  const result = await evolutionFetch("/instance/fetchInstances");

  if (!result.ok) {
    return { success: false, error: result.data?.message || "Failed to list instances" };
  }

  return {
    success: true,
    instances: result.data || [],
  };
}

// 🚀 HANDLER PRINCIPAL
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔐 Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica usuário
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Busca tenant do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error("Tenant not found");
    }

    // Verifica se Evolution API está configurada
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Evolution API not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY in Supabase Secrets.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    // Parse request
    const requestData: EvolutionRequest = await req.json();
    const { action, instanceName } = requestData;

    // Gera nome da instância baseado no tenant se não fornecido
    const resolvedInstanceName = instanceName || `jurify_${profile.tenant_id.substring(0, 8)}`;

    let result: any;

    switch (action) {
      case "create":
        // Verifica se já existe uma instância para este tenant
        const { data: existing } = await supabase
          .from("configuracoes_integracoes")
          .select("id, phone_number_id, status")
          .eq("tenant_id", profile.tenant_id)
          .eq("nome_integracao", "whatsapp_evolution")
          .maybeSingle();

        if (existing) {
          // Se já existe mas está desconectada, tenta reconectar
          if (existing.status !== "ativa") {
            result = await getQRCode(existing.phone_number_id);
            result.instanceName = existing.phone_number_id;
            result.reconnecting = true;
          } else {
            result = {
              success: true,
              message: "Instance already exists and is connected",
              instanceName: existing.phone_number_id,
              status: existing.status,
            };
          }
        } else {
          result = await createInstance(resolvedInstanceName, supabase, profile.tenant_id);
          result.instanceName = resolvedInstanceName;
        }
        break;

      case "qrcode":
        result = await getQRCode(resolvedInstanceName);
        break;

      case "status":
        result = await getInstanceStatus(resolvedInstanceName);

        // Sincroniza status com o banco
        if (result.success) {
          const dbStatus = result.connected ? "ativa" : "desconectada";
          await supabase
            .from("configuracoes_integracoes")
            .update({ status: dbStatus })
            .eq("tenant_id", profile.tenant_id)
            .eq("nome_integracao", "whatsapp_evolution")
            .eq("phone_number_id", resolvedInstanceName);
        }
        break;

      case "disconnect":
        result = await disconnectInstance(resolvedInstanceName, supabase);
        break;

      case "delete":
        result = await deleteInstance(resolvedInstanceName, supabase, profile.tenant_id);
        break;

      case "list":
        result = await listInstances();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("[evolution-manager] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});
