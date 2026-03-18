/**
 * 🔧 EVOLUTION MANAGER - Edge Function
 *
 * Gerencia instâncias da Evolution API para cada tenant.
 * Operações: criar instância, obter QR Code, verificar status,
 * desconectar, deletar instância.
 *
 * Auth header correto (Evolution API v2): apikey: <AUTHENTICATION_API_KEY>
 *
 * @version 2.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


// ---------------------------------------------------------------------------
// Helpers — Logging & Alerting for conexoes tables
// ---------------------------------------------------------------------------

async function logConexaoEvent(
  supabaseClient: ReturnType<typeof createClient>,
  conexaoId: string,
  tenantId: string,
  evento: string,
  severidade: 'debug' | 'info' | 'warning' | 'error' | 'critical',
  descricao?: string,
  origem?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseClient.from('conexoes_logs').insert({
      conexao_id: conexaoId,
      tenant_id: tenantId,
      evento,
      severidade,
      descricao: descricao ?? null,
      origem: origem ?? 'evolution-manager',
      metadata: metadata ?? {},
    });
  } catch (e) {
    console.error('[logConexaoEvent] failed:', e);
  }
}

async function createConexaoAlerta(
  supabaseClient: ReturnType<typeof createClient>,
  conexaoId: string,
  tenantId: string,
  tipo: string,
  mensagem: string,
  severidade: 'info' | 'warning' | 'error' | 'critical'
) {
  try {
    // Don't duplicate: check if there's an unresolved alert of same type in last hour
    const { data: existing } = await supabaseClient
      .from('conexoes_alertas')
      .select('id')
      .eq('conexao_id', conexaoId)
      .eq('tipo', tipo)
      .eq('resolvido', false)
      .gte('created_at', new Date(Date.now() - 3600_000).toISOString())
      .limit(1);
    if (existing && existing.length > 0) return; // dedup

    await supabaseClient.from('conexoes_alertas').insert({
      conexao_id: conexaoId,
      tenant_id: tenantId,
      tipo,
      mensagem,
      severidade,
      lido: false,
      resolvido: false,
    });
  } catch (e) {
    console.error('[createConexaoAlerta] failed:', e);
  }
}

async function findConexao(supabaseClient: ReturnType<typeof createClient>, instanceName: string) {
  const { data } = await supabaseClient
    .from('conexoes_whatsapp')
    .select('id, tenant_id')
    .eq('instance_name', instanceName)
    .limit(1)
    .single();
  return data as { id: string; tenant_id: string } | null;
}

// Suporta tanto EVOLUTION_API_BASE_URL quanto EVOLUTION_API_URL (legado)
const EVOLUTION_BASE_URL = (
  Deno.env.get("EVOLUTION_API_BASE_URL") ||
  Deno.env.get("EVOLUTION_API_URL") ||
  ""
).replace(/\/$/, ""); // remove trailing slash

const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

const SUPABASE_WEBHOOK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;

// ---------------------------------------------------------------------------
// EvolutionClient — encapsula todas as chamadas à Evolution API v2
// ---------------------------------------------------------------------------

interface EvoResponse {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

async function evoFetch(
  path: string,
  method = "GET",
  body?: Record<string, unknown>
): Promise<EvoResponse> {
  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
    console.error("[evolution-manager] Missing EVOLUTION_API_BASE_URL or EVOLUTION_API_KEY");
    return { ok: false, status: 500, data: { error: "Evolution API not configured" } };
  }

  const url = `${EVOLUTION_BASE_URL}${path}`;

  // Evolution API v2 usa o header "apikey" com o AUTHENTICATION_API_KEY global
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": EVOLUTION_API_KEY,
    "bypass-tunnel-reminder": "true",
  };


  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Log detalhado sem expor a key
      console.error(
        `[evolution-manager] HTTP ${response.status} on ${method} ${path}`,
        JSON.stringify(data)
      );
    }

    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[evolution-manager] Fetch exception on ${method} ${path}:`, message);
    return { ok: false, status: 500, data: { error: message } };
  }
}

// ---------------------------------------------------------------------------
// Helpers para extrair QR Code de qualquer formato que a v2 retorne
// ---------------------------------------------------------------------------

function extractQRCode(data: Record<string, unknown>): string | null {
  // Formatos conhecidos da Evolution API v2:
  // { base64: "data:image/png;base64,..." }
  // { qrcode: { base64: "..." } }
  // { code: "2@..." }  ← raw string (não base64)
  const raw =
    (data?.base64 as string) ||
    ((data?.qrcode as Record<string, unknown>)?.base64 as string) ||
    null;

  if (!raw) return null;

  // Garante prefixo data URI
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

// ---------------------------------------------------------------------------
// Operações de instância
// ---------------------------------------------------------------------------

async function createInstance(instanceName: string, supabase: unknown, profile: { tenant_id: string }) {

  const webhookSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  const webhookConfig: Record<string, unknown> = {
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
  };

  // Pass the webhook secret as a header so the whatsapp-webhook function can verify authenticity
  if (webhookSecret) {
    webhookConfig.headers = { "x-webhook-secret": webhookSecret };
  }

  const result = await evoFetch("/instance/create", "POST", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    webhook: webhookConfig,
  });

  if (!result.ok) {
    const msg = (result.data?.message as string) || (result.data?.error as string) || "Failed to create instance";
    console.error(`[evolution-manager] createInstance failed (${result.status}):`, msg);
    return { success: false, error: msg, httpStatus: result.status };
  }

  // Salva configuração no banco
  const db = supabase as ReturnType<typeof createClient>;
  const { error: dbError } = await db.from("configuracoes_integracoes").insert({
    nome_integracao: "whatsapp_evolution",
    status: "inativa",
    api_key: "evolution_managed",
    endpoint_url: EVOLUTION_BASE_URL,
    observacoes: `Instance: ${instanceName}`,
    tenant_id: profile.tenant_id,
  });

  if (dbError) {
    console.error("[evolution-manager] DB insert error:", dbError.message);
  } else {
    console.log("[evolution-manager] DB record created for instance:", instanceName);
  }

  const qrcode = extractQRCode(result.data);

  if (!qrcode) {
    console.warn("[evolution-manager] createInstance: QR code not found in response. Keys:", Object.keys(result.data));
  }

  return {
    success: true,
    instanceName,
    instance: result.data?.instance,
    qrcode,
    hash: result.data?.hash,
    status: "aguardando_qr",
  };
}

async function getQRCode(instanceName: string) {

  // Evolution v2: GET /instance/connect/{instanceName}
  const result = await evoFetch(`/instance/connect/${instanceName}`);

  if (!result.ok) {
    const msg = (result.data?.message as string) || (result.data?.error as string) || "Failed to get QR Code";
    return { success: false, error: msg, httpStatus: result.status };
  }

  const qrcode = extractQRCode(result.data);

  if (!qrcode) {
    console.warn("[evolution-manager] getQRCode: QR code not found in response. Keys:", Object.keys(result.data));
  }

  return {
    success: true,
    qrcode,
    pairingCode: (result.data?.pairingCode as string) || null,
  };
}

async function getInstanceStatus(instanceName: string) {

  const result = await evoFetch(`/instance/connectionState/${instanceName}`);

  if (!result.ok) {
    const msg = (result.data?.message as string) || (result.data?.error as string) || "Failed to get status";
    return { success: false, error: msg, httpStatus: result.status };
  }

  const state =
    ((result.data?.instance as Record<string, unknown>)?.state as string) ||
    (result.data?.state as string) ||
    "unknown";


  return {
    success: true,
    state,
    connected: state === "open",
  };
}

async function disconnectInstance(instanceName: string, supabase: unknown, profile: { tenant_id: string }) {

  // Evolution v2: POST /instance/logout/{instanceName}  (não DELETE)
  const result = await evoFetch(`/instance/logout/${instanceName}`, "POST");

  const db = supabase as ReturnType<typeof createClient>;
  await db
    .from("configuracoes_integracoes")
    .update({ status: "inativa" })
    .eq("nome_integracao", "whatsapp_evolution")
    .ilike("observacoes", `%${instanceName}%`)
    .eq("tenant_id", profile.tenant_id);

  return {
    success: result.ok,
    error: result.ok ? undefined : ((result.data?.message as string) || "Disconnect failed"),
  };
}

async function deleteInstance(instanceName: string, supabase: unknown, profile: { tenant_id: string }) {

  const result = await evoFetch(`/instance/delete/${instanceName}`, "DELETE");

  const db = supabase as ReturnType<typeof createClient>;
  await db
    .from("configuracoes_integracoes")
    .delete()
    .eq("nome_integracao", "whatsapp_evolution")
    .ilike("observacoes", `%${instanceName}%`)
    .eq("tenant_id", profile.tenant_id);

  return {
    success: result.ok,
    error: result.ok ? undefined : ((result.data?.message as string) || "Delete failed"),
  };
}

async function listInstances() {
  const result = await evoFetch("/instance/fetchInstances");

  if (!result.ok) {
    return { success: false, error: (result.data?.message as string) || "Failed to list instances" };
  }

  return {
    success: true,
    instances: result.data || [],
  };
}

async function healthCheck() {

  // Evolution v2 expõe GET / que retorna info básica
  const result = await evoFetch("/");

  return {
    success: result.ok,
    configured: !!(EVOLUTION_BASE_URL && EVOLUTION_API_KEY),
    baseUrl: EVOLUTION_BASE_URL || null,
    httpStatus: result.status,
    response: result.ok ? result.data : undefined,
    error: result.ok ? undefined : ((result.data?.message as string) || `HTTP ${result.status}`),
  };
}

// ---------------------------------------------------------------------------
// Interface de request
// ---------------------------------------------------------------------------

interface EvolutionRequest {
  action: "create" | "qrcode" | "status" | "disconnect" | "delete" | "list" | "health";
  instanceName?: string;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔐 Autenticação Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("[evolution-manager] Auth error:", authError?.message);
      throw new Error("Unauthorized - Invalid token");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("Tenant not found");

    // SECURITY: Apenas admin e manager podem gerenciar instâncias WhatsApp
    if (!["admin", "manager"].includes(profile.role ?? "")) {
      return new Response(
        JSON.stringify({ error: "Permissão insuficiente. Apenas administradores e gerentes podem gerenciar instâncias WhatsApp." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica configuração da Evolution API
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Evolution API not configured. Set EVOLUTION_API_BASE_URL and EVOLUTION_API_KEY in Supabase Secrets.",
          hint: "EVOLUTION_API_BASE_URL=http://76.13.226.20:8080  EVOLUTION_API_KEY=<AUTHENTICATION_API_KEY do container>",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const requestData: EvolutionRequest = await req.json();
    const { action, instanceName } = requestData;

    const resolvedInstanceName = instanceName || `jurify_${profile.tenant_id.substring(0, 8)}`;

    let result: Record<string, unknown>;

    switch (action) {
      case "health":
        result = await healthCheck();
        break;

      case "create": {
        const { data: existing } = await supabase
          .from("configuracoes_integracoes")
          .select("id, observacoes, status")
          .eq("nome_integracao", "whatsapp_evolution")
          .maybeSingle();

        const extractName = (obs: string | null): string => {
          if (!obs) return resolvedInstanceName;
          const match = obs.match(/Instance:\s*(.+)/);
          return match ? match[1].trim() : resolvedInstanceName;
        };

        if (existing) {
          const existingName = extractName(existing.observacoes as string | null);
          if (existing.status !== "ativa") {
            console.log(`[evolution-manager] Reconnecting existing instance: ${existingName}`);
            result = await getQRCode(existingName);
            result.instanceName = existingName;
            result.reconnecting = true;
          } else {
            result = {
              success: true,
              message: "Instance already connected",
              instanceName: existingName,
              status: existing.status,
            };
          }
        } else {
          // Limpar qualquer instância antiga na Evolution API antes de criar nova
          console.log(`[evolution-manager] Cleaning up old instance before create: ${resolvedInstanceName}`);
          const logoutResult = await evoFetch(`/instance/logout/${resolvedInstanceName}`, "POST");
          if (logoutResult.ok) {
            console.log(`[evolution-manager] Logged out old instance: ${resolvedInstanceName}`);
          }
          const deleteResult = await evoFetch(`/instance/delete/${resolvedInstanceName}`, "DELETE");
          if (deleteResult.ok) {
            console.log(`[evolution-manager] Deleted old instance: ${resolvedInstanceName}`);
          }
          // Também limpa registros órfãos do banco
          await supabase
            .from("configuracoes_integracoes")
            .delete()
            .eq("nome_integracao", "whatsapp_evolution")
            .eq("tenant_id", profile.tenant_id);

          result = await createInstance(resolvedInstanceName, supabase, profile);
        }

        // Fire-and-forget logging for create action
        const createConexao = await findConexao(supabase, resolvedInstanceName);
        if (createConexao) {
          if (result.success) {
            logConexaoEvent(supabase, createConexao.id, createConexao.tenant_id, 'conexao_criada', 'info', `Instância ${resolvedInstanceName} criada com sucesso`).catch(() => {});
            if (result.qrcode) {
              logConexaoEvent(supabase, createConexao.id, createConexao.tenant_id, 'qr_gerado', 'info', 'QR Code gerado na criação da instância').catch(() => {});
            }
          } else {
            logConexaoEvent(supabase, createConexao.id, createConexao.tenant_id, 'erro_criacao', 'error', `Falha ao criar instância: ${result.error ?? 'unknown'}`).catch(() => {});
            createConexaoAlerta(supabase, createConexao.id, createConexao.tenant_id, 'erro_criacao', `Falha ao criar instância WhatsApp: ${result.error ?? 'unknown'}`, 'error').catch(() => {});
          }
        }
        break;
      }

      case "qrcode": {
        result = await getQRCode(resolvedInstanceName);
        // Fire-and-forget logging
        const qrConexao = await findConexao(supabase, resolvedInstanceName);
        if (qrConexao) {
          if (result.success) {
            logConexaoEvent(supabase, qrConexao.id, qrConexao.tenant_id, 'qr_gerado', 'info', 'QR Code solicitado com sucesso').catch(() => {});
          } else {
            logConexaoEvent(supabase, qrConexao.id, qrConexao.tenant_id, 'erro_qr', 'error', `Falha ao obter QR Code: ${result.error ?? 'unknown'}`).catch(() => {});
          }
        }
        break;
      }

      case "status": {
        result = await getInstanceStatus(resolvedInstanceName);
        if (result.success) {
          const dbStatus = result.connected ? "ativa" : "inativa";
          await supabase
            .from("configuracoes_integracoes")
            .update({ status: dbStatus })
            .eq("nome_integracao", "whatsapp_evolution")
            .ilike("observacoes", `%${resolvedInstanceName}%`)
            .eq("tenant_id", profile.tenant_id);
        }
        // Fire-and-forget logging for status
        const statusConexao = await findConexao(supabase, resolvedInstanceName);
        if (statusConexao) {
          if (result.success && result.connected) {
            logConexaoEvent(supabase, statusConexao.id, statusConexao.tenant_id, 'sessao_conectada', 'info', `Instância ${resolvedInstanceName} conectada`).catch(() => {});
            // Auto-resolve open desconexao alerts
            supabase.from('conexoes_alertas')
              .update({ resolvido: true, resolvido_em: new Date().toISOString() })
              .eq('conexao_id', statusConexao.id).eq('tipo', 'desconexao').eq('resolvido', false)
              .then(() => {}).catch(() => {});
          } else if (result.success && !result.connected) {
            logConexaoEvent(supabase, statusConexao.id, statusConexao.tenant_id, 'sessao_desconectada', 'warning', `Instância ${resolvedInstanceName} desconectada (state: ${result.state ?? 'unknown'})`).catch(() => {});
            createConexaoAlerta(supabase, statusConexao.id, statusConexao.tenant_id, 'desconexao', `Instância WhatsApp ${resolvedInstanceName} está desconectada`, 'warning').catch(() => {});
          } else {
            logConexaoEvent(supabase, statusConexao.id, statusConexao.tenant_id, 'erro_status', 'error', `Falha ao verificar status: ${result.error ?? 'unknown'}`).catch(() => {});
          }
        }
        break;
      }

      case "disconnect": {
        result = await disconnectInstance(resolvedInstanceName, supabase, profile);
        // Fire-and-forget logging
        const disconnConexao = await findConexao(supabase, resolvedInstanceName);
        if (disconnConexao) {
          if (result.success) {
            logConexaoEvent(supabase, disconnConexao.id, disconnConexao.tenant_id, 'sessao_desconectada', 'info', `Instância ${resolvedInstanceName} desconectada pelo usuário`).catch(() => {});
          } else {
            logConexaoEvent(supabase, disconnConexao.id, disconnConexao.tenant_id, 'erro_desconexao', 'error', `Falha ao desconectar: ${result.error ?? 'unknown'}`).catch(() => {});
          }
        }
        break;
      }

      case "delete": {
        // Lookup conexao BEFORE delete (since the record may be removed)
        const delConexao = await findConexao(supabase, resolvedInstanceName);
        result = await deleteInstance(resolvedInstanceName, supabase, profile);
        // Fire-and-forget logging
        if (delConexao) {
          if (result.success) {
            logConexaoEvent(supabase, delConexao.id, delConexao.tenant_id, 'conexao_removida', 'info', `Instância ${resolvedInstanceName} removida pelo usuário`).catch(() => {});
          } else {
            logConexaoEvent(supabase, delConexao.id, delConexao.tenant_id, 'erro_remocao', 'error', `Falha ao remover instância: ${result.error ?? 'unknown'}`).catch(() => {});
          }
        }
        break;
      }

      case "list":
        result = await listInstances();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[evolution-manager] Unhandled error:", error instanceof Error ? error.message : error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: statusCode }
    );
  }
});
