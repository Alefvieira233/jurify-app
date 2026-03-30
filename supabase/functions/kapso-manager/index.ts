/**
 * KAPSO MANAGER - Edge Function
 *
 * Gerencia conexões WhatsApp via Kapso API.
 * Operações: criar conexão, obter QR Code, verificar status,
 * desconectar, deletar conexão.
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { kapsoFetch, checkKapsoHealth } from "../_shared/kapso-client.ts";

// SEC-04: Escape LIKE wildcards in user-derived query values
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => '\\' + ch);
}

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
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseClient.from('conexoes_logs').insert({
      conexao_id: conexaoId,
      tenant_id: tenantId,
      evento,
      severidade,
      descricao: descricao ?? null,
      origem: 'kapso-manager',
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
    const { data: existing } = await supabaseClient
      .from('conexoes_alertas')
      .select('id')
      .eq('conexao_id', conexaoId)
      .eq('tipo', tipo)
      .eq('resolvido', false)
      .gte('created_at', new Date(Date.now() - 3600_000).toISOString())
      .limit(1);
    if (existing && existing.length > 0) return;

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
  try {
    const { data } = await supabaseClient
      .from('conexoes_whatsapp')
      .select('id, tenant_id')
      .eq('instance_name', instanceName)
      .limit(1)
      .single();
    return data as { id: string; tenant_id: string } | null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kapso Instance Operations
// ---------------------------------------------------------------------------

async function createConnection(
  instanceName: string,
  supabase: ReturnType<typeof createClient>,
  profile: { tenant_id: string }
) {
  // For Kapso QR-based connections, we use the Kapso API to create an instance
  // Kapso supports both official API and QR code connections
  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;
  const webhookSecret = Deno.env.get("KAPSO_WEBHOOK_SECRET");

  const result = await kapsoFetch('/instances', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      webhookUrl,
      webhookSecret,
      events: [
        'whatsapp.message.received',
        'whatsapp.message.sent',
        'whatsapp.message.delivered',
        'whatsapp.message.read',
      ],
    }),
  });

  const data = await result.json().catch(() => ({}));

  if (!result.ok) {
    const msg = data?.message || data?.error || `Failed to create connection (${result.status})`;
    console.error(`[kapso-manager] createConnection failed:`, msg);
    return { success: false, error: msg, httpStatus: result.status };
  }

  // Save config to DB
  const { error: dbError } = await supabase.from("configuracoes_integracoes").insert({
    nome_integracao: "whatsapp_kapso",
    status: "inativa",
    api_key: "kapso_managed",
    endpoint_url: Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai",
    observacoes: `Instance: ${instanceName}`,
    tenant_id: profile.tenant_id,
  });

  if (dbError) {
    console.error("[kapso-manager] DB insert error:", dbError.message);
  }

  const qrcode = data?.qrcode?.base64 || data?.base64 || null;
  const formattedQr = qrcode
    ? (qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`)
    : null;

  return {
    success: true,
    instanceName,
    instance: data?.instance,
    qrcode: formattedQr,
    pairingCode: data?.pairingCode || null,
    status: "aguardando_qr",
  };
}

async function getQRCode(instanceName: string) {
  const result = await kapsoFetch(`/instances/${instanceName}/qrcode`);
  const data = await result.json().catch(() => ({}));

  if (!result.ok) {
    const msg = data?.message || data?.error || "Failed to get QR Code";
    return { success: false, error: msg, httpStatus: result.status };
  }

  const qrcode = data?.qrcode?.base64 || data?.base64 || null;
  const formattedQr = qrcode
    ? (qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`)
    : null;

  return {
    success: true,
    qrcode: formattedQr,
    pairingCode: data?.pairingCode || null,
  };
}

async function getConnectionStatus(instanceName: string) {
  const result = await kapsoFetch(`/instances/${instanceName}/status`);
  const data = await result.json().catch(() => ({}));

  if (!result.ok) {
    const msg = data?.message || data?.error || "Failed to get status";
    return { success: false, error: msg, httpStatus: result.status };
  }

  const state = data?.state || data?.status || "unknown";
  return {
    success: true,
    state,
    connected: state === "open" || state === "connected",
  };
}

async function disconnectConnection(
  instanceName: string,
  supabase: ReturnType<typeof createClient>,
  profile: { tenant_id: string }
) {
  const result = await kapsoFetch(`/instances/${instanceName}/logout`, { method: 'POST' });

  await supabase
    .from("configuracoes_integracoes")
    .update({ status: "inativa" })
    .eq("nome_integracao", "whatsapp_kapso")
    .ilike("observacoes", `%${escapeLike(instanceName)}%`)
    .eq("tenant_id", profile.tenant_id);

  return {
    success: result.ok,
    error: result.ok ? undefined : "Disconnect failed",
  };
}

async function deleteConnection(
  instanceName: string,
  supabase: ReturnType<typeof createClient>,
  profile: { tenant_id: string }
) {
  const result = await kapsoFetch(`/instances/${instanceName}`, { method: 'DELETE' });

  await supabase
    .from("configuracoes_integracoes")
    .delete()
    .eq("nome_integracao", "whatsapp_kapso")
    .ilike("observacoes", `%${escapeLike(instanceName)}%`)
    .eq("tenant_id", profile.tenant_id);

  return {
    success: result.ok,
    error: result.ok ? undefined : "Delete failed",
  };
}

async function listConnections() {
  const result = await kapsoFetch('/instances');
  const data = await result.json().catch(() => ({}));

  if (!result.ok) {
    return { success: false, error: data?.message || "Failed to list connections" };
  }

  return { success: true, instances: data || [] };
}

// ---------------------------------------------------------------------------
// Request interface
// ---------------------------------------------------------------------------

interface KapsoRequest {
  action: "create" | "qrcode" | "status" | "disconnect" | "delete" | "list" | "health";
  instanceName?: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
      throw new Error("Unauthorized - Invalid token");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("Tenant not found");

    if (!["admin", "manager", "user", "viewer"].includes(profile.role ?? "")) {
      return new Response(
        JSON.stringify({ error: "Permissão insuficiente. Faça login para gerenciar conexões WhatsApp." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: KapsoRequest = await req.json();
    const { action, instanceName } = requestData;

    const resolvedInstanceName = instanceName || `jurify_${profile.tenant_id.substring(0, 8)}`;

    let result: Record<string, unknown>;

    switch (action) {
      case "health": {
        const health = await checkKapsoHealth();
        result = { success: health.status === "connected", ...health };
        break;
      }

      case "create": {
        const { data: existing } = await supabase
          .from("configuracoes_integracoes")
          .select("id, observacoes, status")
          .eq("nome_integracao", "whatsapp_kapso")
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();

        const extractName = (obs: string | null): string => {
          if (!obs) return resolvedInstanceName;
          const match = obs.match(/Instance:\s*(.+)/);
          return match ? match[1].trim() : resolvedInstanceName;
        };

        if (existing) {
          const existingName = extractName(existing.observacoes as string | null);
          if (existing.status !== "ativa") {
            result = await getQRCode(existingName);
            result.instanceName = existingName;
            result.reconnecting = true;
          } else {
            result = {
              success: true,
              message: "Connection already active",
              instanceName: existingName,
              status: existing.status,
            };
          }
        } else {
          // Clean up orphan records
          await supabase
            .from("configuracoes_integracoes")
            .delete()
            .eq("nome_integracao", "whatsapp_kapso")
            .eq("tenant_id", profile.tenant_id);

          result = await createConnection(resolvedInstanceName, supabase, profile);
        }

        // Fire-and-forget logging
        (async () => {
          try {
            const conexao = await findConexao(supabase, resolvedInstanceName);
            if (conexao) {
              if (result.success) {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'conexao_criada', 'info', `Instância ${resolvedInstanceName} criada`).catch(() => {});
              } else {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'falha_reconexao', 'error', `Falha ao criar: ${result.error ?? 'unknown'}`).catch(() => {});
                createConexaoAlerta(supabase, conexao.id, conexao.tenant_id, 'falha_reconexao', `Falha ao criar conexão WhatsApp: ${result.error ?? 'unknown'}`, 'error').catch(() => {});
              }
            }
          } catch (e) { console.error('[kapso-manager] create logging failed:', e); }
        })();
        break;
      }

      case "qrcode": {
        result = await getQRCode(resolvedInstanceName);
        (async () => {
          try {
            const conexao = await findConexao(supabase, resolvedInstanceName);
            if (conexao) {
              if (result.success) {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'qr_gerado', 'info', 'QR Code solicitado com sucesso').catch(() => {});
              } else {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'qr_expirado', 'error', `Falha ao obter QR Code: ${result.error ?? 'unknown'}`).catch(() => {});
              }
            }
          } catch (e) { console.error('[kapso-manager] qr logging failed:', e); }
        })();
        break;
      }

      case "status": {
        result = await getConnectionStatus(resolvedInstanceName);
        if (result.success) {
          const dbStatus = result.connected ? "ativa" : "inativa";
          await supabase
            .from("configuracoes_integracoes")
            .update({ status: dbStatus })
            .eq("nome_integracao", "whatsapp_kapso")
            .ilike("observacoes", `%${escapeLike(resolvedInstanceName)}%`)
            .eq("tenant_id", profile.tenant_id);
        }
        (async () => {
          try {
            const conexao = await findConexao(supabase, resolvedInstanceName);
            if (conexao) {
              if (result.success && result.connected) {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'sessao_conectada', 'info', `Instância ${resolvedInstanceName} conectada`).catch(() => {});
                supabase.from('conexoes_alertas')
                  .update({ resolvido: true, resolvido_em: new Date().toISOString() })
                  .eq('conexao_id', conexao.id).eq('tipo', 'desconexao').eq('resolvido', false)
                  .then(() => {}).catch(() => {});
              } else if (result.success && !result.connected) {
                logConexaoEvent(supabase, conexao.id, conexao.tenant_id, 'sessao_desconectada', 'warning', `Instância ${resolvedInstanceName} desconectada (state: ${result.state ?? 'unknown'})`).catch(() => {});
                createConexaoAlerta(supabase, conexao.id, conexao.tenant_id, 'desconexao', `Instância WhatsApp ${resolvedInstanceName} está desconectada`, 'warning').catch(() => {});
              }
            }
          } catch (e) { console.error('[kapso-manager] status logging failed:', e); }
        })();
        break;
      }

      case "disconnect": {
        result = await disconnectConnection(resolvedInstanceName, supabase, profile);
        (async () => {
          try {
            const conexao = await findConexao(supabase, resolvedInstanceName);
            if (conexao) {
              logConexaoEvent(supabase, conexao.id, conexao.tenant_id,
                result.success ? 'sessao_desconectada' : 'falha_reconexao',
                result.success ? 'info' : 'error',
                result.success ? `Desconectado pelo usuário` : `Falha ao desconectar: ${result.error ?? 'unknown'}`
              ).catch(() => {});
            }
          } catch (e) { console.error('[kapso-manager] disconnect logging failed:', e); }
        })();
        break;
      }

      case "delete": {
        const delConexao = await findConexao(supabase, resolvedInstanceName);
        result = await deleteConnection(resolvedInstanceName, supabase, profile);
        if (delConexao) {
          logConexaoEvent(supabase, delConexao.id, delConexao.tenant_id,
            result.success ? 'conexao_removida' : 'erro_remocao',
            result.success ? 'info' : 'error',
            result.success ? `Instância removida` : `Falha ao remover: ${result.error ?? 'unknown'}`
          ).catch(() => {});
        }
        break;
      }

      case "list":
        result = await listConnections();
        break;

      // test-platform action removed — was temporary API probe

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[kapso-manager] Unhandled error:", error instanceof Error ? error.message : error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: statusCode }
    );
  }
});
