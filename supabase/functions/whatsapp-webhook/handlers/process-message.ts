import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildLegalContext } from "../../_shared/legal-context.ts";
import { DEFAULT_OPENAI_MODEL } from "../../_shared/ai-model.ts";
import { callOpenAI, BudgetExceededError } from "../../_shared/ai-caller.ts";
import { AGENT_TOOLS, type AgentToolName } from "../../_shared/agent-tools.ts";
import { executeAgentTool, buildToolContext } from "../../_shared/agent-tools-executor.ts";
import { sanitizeInput, redactPII } from "../../_shared/security.ts";
import type { NormalizedMessage } from "../../_shared/whatsapp-logic.ts";
import { callEdgeFunction, escapeLike } from "./edge-function-client.ts";
import { analyzeQualification } from "./qualification.ts";
import { sendViaKapso, sendViaMeta, type SendResult } from "./send-reply.ts";
import {
  parseScheduleFromText,
  detectScheduleIntent,
  hasScheduleConflict,
  formatScheduleForLead,
  validateBusinessHours,
} from "../../_shared/schedule-parser.ts";

const INTEGRATION_NAME_KAPSO = "whatsapp_kapso";

// ============================================
// SLASH COMMANDS — DB-backed tenant-editable registry
// ============================================
// Seeded in migration 20260417000008. Cached in-memory for 5 min per tenant
// to avoid a round-trip on every incoming WhatsApp message. Legacy hardcoded
// map below acts as a defense-in-depth fallback if the DB query fails.
type SlashCommandEntry = { intent: string; agent: string };
type SlashCommandMap = Record<string, SlashCommandEntry>;

const LEGACY_COMMANDS: SlashCommandMap = {
  "/prazos":      { intent: "liste os prazos processuais do cliente com datas e urgência",                                                  agent: "juridico" },
  "/processos":   { intent: "liste os processos ativos do cliente com número, fase e tribunal",                                               agent: "juridico" },
  "/documentos":  { intent: "informe quantos documentos o cliente tem no sistema e quais tipos",                                              agent: "analista_documentos" },
  "/honorarios":  { intent: "informe o status dos honorários do cliente: valores acordados, pagos e pendentes",                               agent: "juridico" },
  "/status":      { intent: "dê um resumo completo e organizado de todos os casos, prazos e pendências do cliente",                           agent: "juridico" },
  "/audiencias":  { intent: "liste as audiências e compromissos agendados do cliente nos próximos 60 dias",                                   agent: "juridico" },
  "/andamento":   { intent: "descreva o andamento cronológico dos processos do cliente, do mais recente ao mais antigo",                      agent: "juridico" },
};

const COMMANDS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const commandsCache = new Map<string, { map: SlashCommandMap; expiresAt: number }>();

async function getSlashCommands(
  supabase: ReturnType<typeof createClient>,
  tenantId: string | null,
): Promise<SlashCommandMap> {
  const cacheKey = tenantId ?? "__global__";
  const now = Date.now();
  const cached = commandsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.map;

  try {
    // Fetch both tenant-specific AND global (tenant_id IS NULL) rows in one round-trip.
    // Tenant-specific rows take precedence (merge order below).
    let query = supabase
      .from("slash_commands")
      .select("command, intent, agent_type, tenant_id")
      .eq("active", true);

    query = tenantId
      ? query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      : query.is("tenant_id", null);

    const { data, error } = await query;
    if (error) {
      console.error("[slash-commands] DB lookup failed — using legacy fallback:", error.message);
      commandsCache.set(cacheKey, { map: LEGACY_COMMANDS, expiresAt: now + COMMANDS_CACHE_TTL_MS });
      return LEGACY_COMMANDS;
    }

    // Build map: global first, tenant-specific overrides on top.
    const map: SlashCommandMap = {};
    const rows = (data ?? []) as Array<{ command: string; intent: string; agent_type: string; tenant_id: string | null }>;
    for (const r of rows.filter((r) => r.tenant_id === null)) {
      map[r.command] = { intent: r.intent, agent: r.agent_type };
    }
    for (const r of rows.filter((r) => r.tenant_id !== null)) {
      map[r.command] = { intent: r.intent, agent: r.agent_type };
    }
    // Empty result (fresh DB without seeds) → use legacy to preserve behavior.
    const final = Object.keys(map).length > 0 ? map : LEGACY_COMMANDS;
    commandsCache.set(cacheKey, { map: final, expiresAt: now + COMMANDS_CACHE_TTL_MS });
    return final;
  } catch (err) {
    console.error("[slash-commands] unexpected error — using legacy fallback:", err instanceof Error ? err.message : err);
    commandsCache.set(cacheKey, { map: LEGACY_COMMANDS, expiresAt: now + COMMANDS_CACHE_TTL_MS });
    return LEGACY_COMMANDS;
  }
}

// ============================================
// 📨 PROCESSA MENSAGEM NORMALIZADA (funciona para ambos providers)
// ============================================
export async function processNormalizedMessage(
  supabase: ReturnType<typeof createClient>,
  msg: NormalizedMessage,
) {
  try {
    const { from, name, text, messageType, mediaUrl, instanceName, provider, messageId } = msg;

    console.log(`[processMsg:${provider}] START from=${from} instance=${instanceName} type=${messageType}`);

    // --- RESOLVE TENANT (multi-tenant: each tenant has own Kapso account) ---
    let tenantId: string | null = null;
    let resolvedVia = "";

    // 1. PRIMARY: Match by exact phone_number_id in observacoes JSON
    //    Format stored: {"phone_number_id":"<id>", ...}
    //    Do NOT filter by status — temporary disconnects must not break resolution
    if (instanceName) {
      const exactMatch = `"phone_number_id":"${escapeLike(instanceName)}"`;
      const { data: configByInstance } = await supabase
        .from("configuracoes_integracoes")
        .select("tenant_id")
        .eq("nome_integracao", INTEGRATION_NAME_KAPSO)
        .not("tenant_id", "is", null)
        .ilike("observacoes", `%${exactMatch}%`)
        .maybeSingle();

      if (configByInstance?.tenant_id) {
        tenantId = configByInstance.tenant_id;
        resolvedVia = "configuracoes_integracoes.observacoes(exact)";
      }
    }

    // 1b. FALLBACK: Match by instance_name (phone_number_id) in conexoes_whatsapp
    if (!tenantId && instanceName) {
      const { data: connByInstance } = await supabase
        .from("conexoes_whatsapp")
        .select("tenant_id")
        .eq("instance_name", instanceName)
        .limit(1)
        .maybeSingle();

      if (connByInstance?.tenant_id) {
        tenantId = connByInstance.tenant_id;
        resolvedVia = "conexoes_whatsapp.instance_name";
        console.warn(`[processMsg:${provider}] Tenant resolved via fallback method 1b (conexoes_whatsapp.instance_name) — consider adding phone_number_id to observacoes`);
      }
    }

    // 1c. REMOVED 2026-05-07 (P0 SECURITY FIX) — cross-tenant leakage.
    // Matching `from` (lead phone) against `conexoes_whatsapp.telefone` (tenant phone)
    // was semantically incorrect; também pegava tenant errado quando dois tenants
    // tinham números próximos durante migrações. Resolução agora é estrita:
    // PRIMARY (phone_number_id em observacoes) ou 1b (instance_name).

    // NOTE: Method 2 (single-config-shortcut) was REMOVED — it's dangerous for multi-tenant
    // because it assigns messages to a tenant based on being the only config, not on actual match.

    // 3. REMOVED 2026-05-07 (P0 SECURITY FIX) — cross-tenant leakage.
    // Last-resort match em `whatsapp_conversations.phone_number` roteava mensagens
    // pro tenant que falou por último com o lead. O mesmo telefone pode existir
    // legitimamente em vários tenants (B2B leads, advogados-clientes), então
    // contexto/histórico/IA de tenant A vazavam pro tenant B. Sem fallback frouxo.

    if (!tenantId) {
      // P0 SECURITY: strict tenant resolution failed. Sem fallback por telefone do lead.
      console.error(`[processMsg:${provider}] TENANT_RESOLUTION_FAILED_STRICT | from=${from} | instance=${instanceName} | type=${messageType} | text="${redactPII(text.substring(0, 80))}"`);
      // Persist failed resolution for diagnostics
      void supabase.from("webhook_events").insert({
        event_id: `unresolved_${Date.now()}_${from}`,
        source: `unresolved|from=${from}|instance=${instanceName}|type=${messageType}`,
      }).then(({ error }) => {
        if (error) console.warn("[processMsg] Failed to log unresolved event:", error.message);
      });

      // --- NOTIFY only tenants with matching WhatsApp instance ---
      if (instanceName) {
        void (async () => {
          try {
            // Find tenants that own this WhatsApp instance
            const { data: matchingConns } = await supabase
              .from("conexoes_whatsapp")
              .select("tenant_id")
              .eq("instance_name", instanceName)
              .limit(5);

            const affectedTenantIds = matchingConns?.map(c => c.tenant_id).filter(Boolean) ?? [];

            if (affectedTenantIds.length > 0) {
              const notifications = affectedTenantIds.map(tid => ({
                tenant_id: tid,
                tipo: "alerta" as const,
                titulo: "⚠️ Mensagem WhatsApp não roteada",
                mensagem: `Uma mensagem não pôde ser direcionada corretamente. Verifique a configuração da instância "${instanceName}" em Integrações.`,
                ativo: true,
              }));
              await supabase.from("notificacoes").insert(notifications);
              console.log(`[processMsg:${provider}] Notified ${affectedTenantIds.length} tenant(s) about unresolved message for instance ${instanceName}`);
            } else {
              console.warn(`[processMsg:${provider}] No tenants found for instance ${instanceName} — message dropped with no notification target`);
            }
          } catch (notifErr) {
            console.error("[processMsg] Failed to notify about unresolved tenant:", notifErr);
          }
        })();
      }

      return;
    }

    console.log(`[processMsg:${provider}] Tenant resolved: ${tenantId} via ${resolvedVia}`);

    // --- HEARTBEAT + AUTO-REPAIR: update last_heartbeat on every message, fix telefone if NULL ---
    if (instanceName) {
      const now = new Date().toISOString();
      // Always update heartbeat to confirm connection is alive
      void supabase
        .from("conexoes_whatsapp")
        .update({
          last_heartbeat: now,
          last_sync: now,
          status: "connected",
        })
        .eq("tenant_id", tenantId)
        .eq("instance_name", instanceName)
        .then(({ error }) => {
          if (error) console.warn("[processMsg] heartbeat update error:", error.message);
        });
      // Auto-repair: fill telefone if missing
      if (from) {
        void supabase
          .from("conexoes_whatsapp")
          .update({ telefone: from })
          .eq("tenant_id", tenantId)
          .eq("instance_name", instanceName)
          .is("telefone", null)
          .then(({ error }) => {
            if (error) console.warn("[processMsg] auto-repair telefone error:", error.message);
          });
      }
    }

    // --- RESOLVE DEPARTMENT + RESPONSAVEL from WhatsApp connection ---
    let connectionDepartamentoId: string | null = null;
    let connectionResponsavelId: string | null = null;
    if (instanceName) {
      const { data: whatsappConn } = await supabase
        .from("conexoes_whatsapp")
        .select("departamento_id, responsavel_id")
        .eq("tenant_id", tenantId)
        .eq("instance_name", instanceName)
        .limit(1)
        .maybeSingle();
      if (whatsappConn) {
        connectionDepartamentoId = whatsappConn.departamento_id;
        connectionResponsavelId = whatsappConn.responsavel_id;
      }
    }

    // If no responsável from connection, find first available member in the department
    if (!connectionResponsavelId && connectionDepartamentoId) {
      const { data: deptoMember } = await supabase
        .from("departamento_membros")
        .select("profile_id")
        .eq("departamento_id", connectionDepartamentoId)
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (deptoMember?.profile_id) {
        connectionResponsavelId = deptoMember.profile_id;
      }
    }

    // Last resort: find first admin/manager in tenant
    if (!connectionResponsavelId) {
      const { data: firstManager } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .in("role", ["admin", "administrador", "manager", "gerente"])
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (firstManager?.user_id) {
        connectionResponsavelId = firstManager.user_id;
      }
    }

    // --- RESOLVE/CREATE LEAD ---
    // Usa RPC find_lead_by_phone (normaliza telefone) pra bater variantes de formatação
    // Fallback em query direta se RPC indisponível (compat com ambientes sem migration)
    let lead: { id: string; status: string | null; area_juridica: string | null; departamento_id: string | null; responsavel_id: string | null; temperature: string | null; lead_score: number | null } | null = null;
    const { data: foundByRpc } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ id: string; status: string | null; area_juridica: string | null; departamento_id: string | null; responsavel_id: string | null }> | null; error: unknown }>;
    }).rpc("find_lead_by_phone", { _tenant_id: tenantId, _phone: from });
    if (foundByRpc && foundByRpc.length > 0) {
      const found = foundByRpc[0];
      // RPC retorna só subset — busca restante (temperature, lead_score)
      const { data: full } = await supabase
        .from("leads")
        .select("id, status, area_juridica, departamento_id, responsavel_id, temperature, lead_score")
        .eq("id", found.id)
        .maybeSingle();
      lead = full as typeof lead;
    } else {
      // Fallback: busca exata (usado se RPC não existe)
      const { data: fallback } = await supabase
        .from("leads")
        .select("id, status, area_juridica, departamento_id, responsavel_id, temperature, lead_score")
        .eq("telefone", from)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      lead = fallback as typeof lead;
    }

    let leadId = lead?.id || null;
    const currentLeadStatus: string = lead?.status || 'novo';
    const isFirstContact = !leadId;

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
          departamento_id: connectionDepartamentoId,
          responsavel_id: connectionResponsavelId,
          metadata: { responsavel_nome: "Sistema", auto_assigned: true, source_instance: instanceName },
        })
        .select("id")
        .single();

      if (leadError) {
        console.error(`[processMsg:${provider}] Error creating lead:`, leadError);
        return;
      }
      leadId = newLead.id;
      console.log(`[processMsg:${provider}] Created new lead: ${leadId} (dept=${connectionDepartamentoId}, resp=${connectionResponsavelId})`);
    } else {
      // Auto-assign department/responsável if lead exists but lacks them
      const updates: Record<string, unknown> = {};
      if (!lead.departamento_id && connectionDepartamentoId) {
        updates.departamento_id = connectionDepartamentoId;
      }
      if (!lead.responsavel_id && connectionResponsavelId) {
        updates.responsavel_id = connectionResponsavelId;
      }
      if (Object.keys(updates).length > 0) {
        void supabase.from("leads").update(updates).eq("id", leadId).eq("tenant_id", tenantId)
          .then(({ error }) => { if (error) console.warn("[processMsg] auto-assign lead update error:", error.message); });
        console.log(`[processMsg:${provider}] Auto-assigned existing lead ${leadId}: dept=${updates.departamento_id ?? 'kept'}, resp=${updates.responsavel_id ?? 'kept'}`);
      }
      console.log(`[processMsg:${provider}] Found existing lead: ${leadId}`);
    }

    // --- RESOLVE/CREATE CONVERSATION ---
    let conversationId = null;
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id, ia_active, updated_at")
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
      // Use the same responsavel already resolved for the lead (department → member → admin fallback)
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
          responsavel_id: connectionResponsavelId,
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

    // --- LGPD CONSENT LOG (Lei 13.709/2018, art. 7º/8º/37) ---
    // Registra consentimento implícito do titular dos dados na primeira interação
    // via WhatsApp. Imutável — auditável pela ANPD.
    if (isFirstContact && leadId && conversationId) {
      void supabase.from("lgpd_consent_log").insert({
        tenant_id: tenantId,
        lead_id: leadId,
        conversation_id: conversationId,
        phone_number: from,
        consent_channel: "whatsapp",
        consent_type: "implicit_first_contact",
        consent_version: "v1.0",
        consent_text: "Iniciou conversa via WhatsApp. Consentimento implícito conforme LGPD art. 7º, IX (legítimo interesse / atendimento ao titular).",
        policy_url: "https://jurify.app/privacidade",
        metadata: { source_instance: instanceName ?? null, provider, first_message: text.substring(0, 200) },
      }).then(({ error }) => {
        if (error) console.warn(`[processMsg:${provider}] LGPD consent log insert error:`, error.message);
      });
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
      message_id: messageId,
      // Legacy columns (kept for backward compatibility)
      session_id: conversationId,
      direction: "inbound",
      from_number: from,
    }).select("id").single();

    const inboundMsgId = savedMsg?.id || null;

    if (msgInsertError) {
      console.error(`[processMsg:${provider}] Error saving message:`, msgInsertError);
    } else {
      console.log(`[processMsg:${provider}] Message saved to conversation ${conversationId}`);
    }

    // --- AUDIO TRANSCRIPTION (fire-and-forget, antes do sentiment pra que ele leia o texto transcrito) ---
    if (inboundMsgId && messageType === "audio") {
      void (async () => {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (!supabaseUrl || !serviceKey) return;
          await fetch(`${supabaseUrl}/functions/v1/transcribe-whatsapp-audio`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: inboundMsgId }),
            signal: AbortSignal.timeout(70_000),
          });
        } catch (e) {
          console.warn("[processMsg] audio transcription failed (non-critical):", e instanceof Error ? e.message : e);
        }
      })();
    }

    // --- SENTIMENT ANALYSIS (fire-and-forget) ---
    if (inboundMsgId) {
      void (async () => {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (!supabaseUrl || !serviceKey) return;
          // Delay pequeno pra dar tempo da transcrição terminar (audio + sentiment lê o transcribed)
          if (messageType === "audio") await new Promise(r => setTimeout(r, 8000));
          await fetch(`${supabaseUrl}/functions/v1/analyze-whatsapp-sentiment`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: inboundMsgId }),
            signal: AbortSignal.timeout(20_000),
          });
        } catch (e) {
          console.warn("[processMsg] sentiment analysis failed (non-critical):", e instanceof Error ? e.message : e);
        }
      })();
    }

    // --- AUTO-REPLY (greeting / away) ---
    void (async () => {
      try {
        const { maybeSendAutoReply } = await import("../../_shared/auto-reply.ts");
        const { getTenantKapsoConfig } = await import("../../_shared/kapso-client.ts");
        const cfg = await getTenantKapsoConfig(supabase, tenantId);
        const sent = await maybeSendAutoReply(supabase, cfg, {
          tenantId,
          conversationId: conversationId!,
          fromPhone: from,
        });
        if (sent) {
          console.log(`[processMsg:${provider}] auto-reply sent: ${sent}`);
        }
      } catch (err) {
        console.error("[processMsg] auto-reply error (non-critical):", err);
      }
    })();

    // --- CHECK ia_active BEFORE INVOKING AI ---
    // For existing conversations, respect the ia_active flag.
    // New conversations (just created) default to ia_active = true.
    // AUTO-REACTIVATE: If ia_active=false for >2 hours and new message arrives, reactivate
    // — UNLESS the conversation is under an explicit handoff_until cooldown (default 24h).
    // The cooldown is set by the HANDOFF_REGEX block below; humans can clear it via UI.
    let iaEnabled = conversation ? (conversation.ia_active !== false) : true;

    if (!iaEnabled && conversation?.updated_at) {
      // Re-fetch handoff_until separately to avoid breaking on environments where
      // migration 20260417000003 hasn't been applied yet (column may not exist).
      const { data: convCooldown } = await supabase
        .from("whatsapp_conversations")
        .select("handoff_until")
        .eq("id", conversationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const handoffUntil = (convCooldown as { handoff_until?: string | null } | null)?.handoff_until ?? null;
      const cooldownActive = handoffUntil ? new Date(handoffUntil).getTime() > Date.now() : false;

      const hoursSinceUpdate = (Date.now() - new Date(conversation.updated_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate >= 2 && !cooldownActive) {
        console.log(`[processMsg:${provider}] Auto-reactivating IA for conversation ${conversationId} (inactive ${Math.round(hoursSinceUpdate)}h)`);
        iaEnabled = true;
        void supabase
          .from("whatsapp_conversations")
          .update({ ia_active: true, updated_at: new Date().toISOString() })
          .eq("id", conversationId)
          .eq("tenant_id", tenantId)
          .then(({ error: reactivateErr }) => {
            if (reactivateErr) console.error("[processMsg] ia_active reactivation error:", reactivateErr.message);
          });
      } else if (cooldownActive) {
        console.log(`[processMsg:${provider}] IA auto-reactivate blocked by handoff cooldown until ${handoffUntil} (conversation ${conversationId})`);
      }
    }

    if (!iaEnabled) {
      console.log(`[processMsg:${provider}] IA disabled for conversation ${conversationId}, skipping AI`);
      return;
    }

    console.log(`[processMsg:${provider}] Starting AI pipeline for conversation ${conversationId}`);

    // ========================================
    // STAGE 1: MEDIA PROCESSING
    // ========================================
    // Sanitize incoming message text against prompt injection
    const sanitized = sanitizeInput(text, 5000);
    let processedText = sanitized.safe ? sanitized.text : text.trim().slice(0, 5000);
    if (!sanitized.safe) {
      console.warn(`[processMsg:${provider}] Prompt injection detected in WhatsApp message, using raw truncated text`);
    }
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

    // Command detection — tenant-editable via `slash_commands` table (5-min cache,
    // legacy hardcoded map as defense-in-depth fallback).
    const COMMANDS = await getSlashCommands(supabase, tenantId);
    const commandKey = Object.keys(COMMANDS).find((cmd) =>
      processedText.trim().toLowerCase().startsWith(cmd)
    );
    const commandIntent = commandKey ? COMMANDS[commandKey]!.intent : null;

    // Conversation history — smart context: summarize old messages, keep recent ones verbatim
    let conversationHistory = "";
    const RECENT_LIMIT = 10;
    const OLDER_LIMIT = 40; // fetch more to build summary

    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("sender, content, timestamp")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false })
      .limit(RECENT_LIMIT);

    if (recentMessages && recentMessages.length > 1) {
      const recentReversed = [...recentMessages].reverse();

      // Check if there are older messages beyond the recent window
      const { count: totalCount } = await supabase
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId);

      if (totalCount && totalCount > RECENT_LIMIT) {
        // Fetch oldest messages for summary context (ascending = oldest first, limit caps volume)
        const { data: olderMessages } = await supabase
          .from("whatsapp_messages")
          .select("sender, content")
          .eq("conversation_id", conversationId)
          .order("timestamp", { ascending: true })
          .limit(OLDER_LIMIT);

        if (olderMessages && olderMessages.length > 0) {
          // Build compressed summary of older messages
          const clientTopics = new Set<string>();
          const assistantActions = new Set<string>();
          let clientName = "";

          for (const m of olderMessages) {
            const content = m.content.toLowerCase();
            if (m.sender === "lead") {
              // Extract key topics mentioned by client
              if (content.length > 20) {
                clientTopics.add(m.content.substring(0, 120));
              }
              // Try to capture name
              const nameMatch = m.content.match(/(?:meu nome (?:é|e)|sou|me chamo)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i);
              if (nameMatch?.[1]) clientName = nameMatch[1];
            } else {
              if (content.length > 20) {
                assistantActions.add(m.content.substring(0, 120));
              }
            }
          }

          const summaryParts: string[] = [];
          summaryParts.push(`[RESUMO: ${totalCount} mensagens no total, mostrando ${recentReversed.length} recentes]`);
          if (clientName) summaryParts.push(`Cliente se identificou como: ${clientName}`);
          if (clientTopics.size > 0) {
            const topics = [...clientTopics].slice(0, 5).map(t => `- ${t}`).join("\n");
            summaryParts.push(`Tópicos anteriores do cliente:\n${topics}`);
          }
          if (assistantActions.size > 0) {
            const actions = [...assistantActions].slice(0, 3).map(a => `- ${a}`).join("\n");
            summaryParts.push(`Respostas anteriores do assistente:\n${actions}`);
          }

          conversationHistory = summaryParts.join("\n") + "\n\n--- MENSAGENS RECENTES ---\n";
        }
      }

      // Always include recent messages verbatim
      conversationHistory += recentReversed
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

    // ========================================
    // STAGE 3: ROUTE TO AGENT (orchestrator + DB lookup)
    // ========================================
    let agentType: string; // "recepcionista", "juridico", "comercial", etc.
    let agentName: string;
    let agentPrompt: string;
    let agentTemp: number;
    let agentMaxTokens: number;

    // ── STATE-BASED HANDOFF: pula orchestrator se conversa tem handoff pendente ──
    // Quando agente A diz "vou te conectar com Dra. Jacira", o webhook grava
    // `pending_handoff_to='juridico_bancario'` no state. Próxima mensagem PULA
    // o orchestrator (não-determinístico) e vai direto pro agente alvo.
    let handoffOverride: string | null = null;
    let handoffSetAt: string | null = null;
    try {
      const { data: handoffRow } = await supabase
        .from("conversation_state")
        .select("pending_handoff_to, pending_handoff_set_at")
        .eq("conversation_id", conversationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (handoffRow?.pending_handoff_to) {
        // Expira após 30min pra evitar handoff stale (lead voltando dias depois)
        const setAt = (handoffRow as { pending_handoff_set_at?: string }).pending_handoff_set_at;
        if (setAt && Date.now() - new Date(setAt).getTime() < 30 * 60 * 1000) {
          handoffOverride = (handoffRow as { pending_handoff_to: string }).pending_handoff_to;
          handoffSetAt = setAt;
        }
      }
    } catch (handoffErr) {
      console.warn(`[processMsg:${provider}] handoff state read failed:`, handoffErr instanceof Error ? handoffErr.message : String(handoffErr));
    }

    if (commandKey) {
      agentType = COMMANDS[commandKey]!.agent;
    } else if (handoffOverride) {
      agentType = handoffOverride;
      console.log(`[processMsg:${provider}] HANDOFF override → ${agentType} (set_at=${handoffSetAt})`);
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
        agentType = routing.agent;
        console.log(`[processMsg:${provider}] Orchestrator routed to: ${agentType} (${routing.reason})`);
      } catch (orchErr) {
        console.error(`[processMsg:${provider}] Orchestrator failed, using default:`, orchErr);
        agentType = legalCtx.has_context ? "juridico" : "recepcionista";
      }
    }

    // Load CUSTOMIZED agent from tenant's agentes_ia table (user can edit prompts!)
    const { data: dbAgent } = await supabase
      .from("agentes_ia")
      .select("nome, prompt_sistema, temperatura, max_tokens, script_saudacao")
      .eq("tenant_id", tenantId)
      .eq("tipo", agentType)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (dbAgent?.prompt_sistema) {
      // Use the tenant's customized prompt (sanitize to prevent prompt injection)
      agentName = dbAgent.nome || agentType;
      const sanitizedPrompt = sanitizeInput(dbAgent.prompt_sistema, 4000);
      agentPrompt = sanitizedPrompt.safe ? sanitizedPrompt.text : dbAgent.prompt_sistema.trim().slice(0, 4000);
      agentTemp = Math.min(Math.max(dbAgent.temperatura ?? 0.5, 0), 1); // Clamp 0-1
      agentMaxTokens = Math.min(dbAgent.max_tokens ?? 500, 2000); // Cap at 2000
      console.log(`[processMsg:${provider}] Using tenant's custom agent: ${agentName}`);
    } else {
      // Fallback to hardcoded defaults (agent-prompts.ts)
      const { AGENTS } = await import("../../_shared/agent-prompts.ts");
      const fallback = AGENTS[agentType] || AGENTS.recepcionista;
      agentName = fallback.name;
      agentPrompt = fallback.systemPrompt;
      agentTemp = fallback.temperature;
      agentMaxTokens = fallback.maxTokens;
      console.log(`[processMsg:${provider}] Using default agent (no DB override): ${agentName}`);
    }

    // Build final system prompt with office context
    let finalSystemPrompt = `Você trabalha no escritório ${officeName}. Seu nome é ${assistantName}.\n\n${agentPrompt}`;

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

    // Budget enforcement is delegated to ai-caller.callOpenAI (daily + monthly).
    // The webhook is fire-and-forget — BudgetExceededError surfaces in catch below
    // and maps to the existing budgetExceeded path (friendly fallback, admin notif).
    let budgetExceeded = false;

    try {
      // ── ONDA 17: Conversation state stateful ──
      // Lê fase atual da conversa pra dar ao agente contexto de pipeline.
      // Phases: greeting → qualifying → scheduling → confirmed → follow_up → closed.
      let conversationPhase: string = "greeting";
      let accumulatedContext: Record<string, unknown> = {};
      try {
        const { data: stateRow } = await supabase
          .from("conversation_state")
          .select("current_phase, accumulated_context, last_agent_type")
          .eq("conversation_id", conversationId)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (stateRow) {
          conversationPhase = (stateRow as { current_phase?: string }).current_phase ?? "greeting";
          accumulatedContext = ((stateRow as { accumulated_context?: Record<string, unknown> }).accumulated_context) ?? {};
        }
      } catch (stateErr) {
        console.warn(`[processMsg:${provider}] Failed to read conversation_state:`, stateErr instanceof Error ? stateErr.message : String(stateErr));
      }

      // Detecta se a mensagem do lead pede ação CRM (agendar/reagendar/cancelar/mover Kanban).
      // Se sim, expõe as agent tools pra que a IA possa executar essas operações via function calling.
      // Caso contrário, mantém fluxo de texto puro (mais barato/rápido).
      const lowerText = processedText.toLowerCase();
      // P0-1 (auditoria 2026-05-25): detecção de intent de transferência na
      // MENSAGEM DO LEAD (não mais regex post-hoc na resposta da IA). Ativa o
      // tool gate (hasActionIntent) para que o agente possa chamar
      // transfer_to_agent diretamente. Padrões cobrem 3 famílias de pedido:
      //   1. "me transfere/transfira/transferir para/com X"
      //   2. "quero/posso/preciso falar com (Dr/Dra) X"
      //   3. "passa/passe/encaminha para X" / "chama o X"
      const hasTransferIntent =
        /\btransfer(?:e|i|ir|ÊNCIA|ência|a[-\s]?me)\s+(?:para|pro|pra|com)\b/i.test(lowerText) ||
        /\b(?:quero|posso|preciso|gostaria|posso\s+por\s+favor)\s+falar\s+(?:com|diretamente\s+com)\b/i.test(lowerText) ||
        /\bpod(?:e|eria)?\s+(?:me\s+)?(?:transferir|passar|encaminhar|conectar)\b/i.test(lowerText) ||
        /\b(?:chama|chame|encaminha|passa|passe)\s+(?:o|a|para|pro|pra)\b.*\bdra?\.?\s+\w+/i.test(lowerText);

      const hasActionIntent =
        detectScheduleIntent(processedText) ||
        /\b(remarcar|reagendar|reagendamento|trocar.*hor[áa]rio|mudar.*hor[áa]rio|adiar|antecipar)\b/i.test(lowerText) ||
        /\b(cancelar|desmarcar|n[ãa]o\s+(quero|posso)\s+mais|cancelamento)\b/i.test(lowerText) ||
        /\b(disponibilidade|hor[áa]rios?\s+livres?|quando\s+pode|qual\s+(dia|hor[áa]rio))\b/i.test(lowerText) ||
        hasTransferIntent;

      // Augmenta o system prompt com info de fase + contexto acumulado pra agente
      // ter consciência do estado da conversa (quem é o lead, o que já foi falado,
      // qual fase do funil a conversa está).
      const phaseInstructions: Record<string, string> = {
        greeting: "Esta é uma das primeiras mensagens. Cumprimente brevemente, identifique o motivo do contato e colete dados básicos do caso.",
        qualifying: "Você está coletando informações sobre o caso do cliente. Faça perguntas relevantes pra entender área jurídica, urgência e contexto. Quando tiver info suficiente, sugira marcar uma reunião com o advogado.",
        scheduling: "Você está negociando data/horário de reunião com o cliente. Use as ferramentas check_availability, suggest_slots e schedule_meeting pra confirmar disponibilidade real e marcar.",
        confirmed: "Reunião já confirmada. Trate dúvidas pré-reunião, lembrete, ou pedidos de remarcar/cancelar.",
        follow_up: "Pós-reunião. Pergunte se o cliente tem dúvidas, oferecer próximos passos, evolução do caso.",
        closed: "Conversa encerrada. Trate como reativação se cliente voltar a falar.",
      };
      const stateContextNote = `\n\n[CONTEXTO DA CONVERSA]\nFase atual: ${conversationPhase}\n${phaseInstructions[conversationPhase] ?? ""}\n${Object.keys(accumulatedContext).length > 0 ? "Dados já coletados: " + JSON.stringify(accumulatedContext) : ""}`;

      const aiMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[]; name?: string }> = [
        { role: "system", content: finalSystemPrompt + stateContextNote },
        { role: "user", content: commandIntent ?? processedText },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      // Tool context (built once per turn — re-used across loop iterations).
      // P0-2 (2026-05-25): conversationId precisa fluir até aqui para a tool
      // transfer_to_agent gravar pending_handoff_to em conversation_state.
      const toolContext = hasActionIntent && tenantId
        ? await buildToolContext(
            supabase as never,
            tenantId,
            leadId,
            resolvedResponsavelId,
            responsavelNome,
            conversationId,
          )
        : null;

      let aiResult: Awaited<ReturnType<typeof callOpenAI>> | null = null;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      // P0-5 (auditoria 2026-05-25): flag para o parser legacy de agendamento
      // saber que a IA já lidou com o assunto via function-calling neste turn.
      // Sem isso, IA agendava via tool e logo em seguida o parser regex rodava
      // e sobrescrevia a resposta com "Você já tem agendamento ativo".
      let aiUsedSchedulingTool = false;
      let aiUsedTransferTool = false;
      const MAX_TOOL_ITERATIONS = 4;

      try {
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
          aiResult = await callOpenAI(supabase, {
            tenantId: tenantId!,
            leadId,
            agentName,
            model: DEFAULT_OPENAI_MODEL,
            messages: aiMessages as never,
            temperature: agentTemp,
            maxTokens: agentMaxTokens,
            abortSignal: controller.signal,
            source: "whatsapp-webhook",
            persistLog: false,
            metadata: { mediaCategory, hasLegalContext: legalCtx.has_context, agent: agentName, tool_iter: iter },
            ...(hasActionIntent && toolContext
              ? { tools: AGENT_TOOLS as never, toolChoice: "auto" }
              : {}),
          });

          totalTokensIn += aiResult.tokens_in;
          totalTokensOut += aiResult.tokens_out;

          // deno-lint-ignore no-explicit-any
          const raw = (aiResult as { raw?: any }).raw;
          const message = raw?.choices?.[0]?.message;
          const toolCalls = (message?.tool_calls ?? []) as Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;

          if (!hasActionIntent || !toolContext || toolCalls.length === 0 || iter >= MAX_TOOL_ITERATIONS) {
            // No tools requested OR loop exhausted — break with current aiResult
            break;
          }

          // Append the assistant message with tool_calls to history
          aiMessages.push({
            role: "assistant",
            content: message?.content ?? "",
            tool_calls: toolCalls as never,
          });

          // Execute each tool and append result
          // P0-2 (2026-05-25): se `transfer_to_agent` foi executado com sucesso,
          // encerramos o loop imediatamente e usamos `handoff_message` como
          // resposta visível ao cliente — evita que a IA "explique de novo" ou
          // faça pergunta extra após anunciar a transferência.
          let handoffShortCircuit: string | null = null;
          for (const tc of toolCalls) {
            // deno-lint-ignore no-explicit-any
            let parsedArgs: any = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || "{}");
            } catch (parseErr) {
              console.warn(`[processMsg:${provider}] Tool args parse failed for ${tc.function.name}:`, parseErr);
            }
            const toolResult = await executeAgentTool(
              toolContext,
              tc.function.name as AgentToolName,
              parsedArgs,
            );
            console.log(`[processMsg:${provider}] tool ${tc.function.name} → success=${toolResult.success}${toolResult.error ? ` err=${toolResult.error}` : ""}`);
            aiMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(toolResult),
            });

            // P0-5: marca que a IA já lidou com agendamento/transferência neste
            // turn — usado pelo parser legacy abaixo para não rodar duplicado.
            if (toolResult.success) {
              if (
                tc.function.name === "schedule_meeting" ||
                tc.function.name === "reschedule_meeting" ||
                tc.function.name === "cancel_meeting" ||
                tc.function.name === "check_availability" ||
                tc.function.name === "suggest_slots"
              ) {
                aiUsedSchedulingTool = true;
              }
              if (tc.function.name === "transfer_to_agent") {
                aiUsedTransferTool = true;
              }
            }

            if (
              tc.function.name === "transfer_to_agent" &&
              toolResult.success &&
              typeof parsedArgs?.handoff_message === "string" &&
              parsedArgs.handoff_message.trim().length > 0
            ) {
              handoffShortCircuit = parsedArgs.handoff_message.trim().substring(0, 800);
            }
          }

          if (handoffShortCircuit) {
            // Substitui a resposta da IA pelo texto curto e direto do handoff.
            aiResult = {
              ...aiResult,
              content: handoffShortCircuit,
            };
            console.log(`[processMsg:${provider}] handoff short-circuit → using handoff_message as final response`);
            break;
          }
          // Loop continues — re-call OpenAI with tool results
        }
      } finally {
        clearTimeout(timeoutId);
      }

      // Sum totals across iterations
      if (aiResult) {
        aiResult = {
          ...aiResult,
          tokens_in: totalTokensIn || aiResult.tokens_in,
          tokens_out: totalTokensOut || aiResult.tokens_out,
          tokens_total: (totalTokensIn + totalTokensOut) || aiResult.tokens_total,
        };
      }

      const resultText = aiResult?.content ?? "";
      if (!resultText) {
        console.error(`[processMsg:${provider}] OpenAI returned EMPTY content. Model: ${aiResult.model} | Usage: in=${aiResult.tokens_in} out=${aiResult.tokens_out}`);
      }
      aiResponse = {
        result: resultText,
        usage: aiResult.tokens_total > 0
          ? { prompt_tokens: aiResult.tokens_in, completion_tokens: aiResult.tokens_out, total_tokens: aiResult.tokens_total }
          : undefined,
        model: aiResult.model,
      };
      // Token usage already recorded inside callOpenAI.

      // P0-6 (auditoria 2026-05-25): UPDATE síncrono — o `void ... .then(...)` anterior
      // perdia corrida com a finalização do edge runtime, deixando 25/25 execuções em
      // `processing` mesmo após sucesso. Métrica + observabilidade morriam.
      const duration = Date.now() - aiStartTime;
      try {
        const { error: execUpdateErr } = await supabase
          .from("agent_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            total_duration_ms: duration,
            total_tokens: aiResponse.usage?.total_tokens || 0,
          })
          .eq("execution_id", executionId)
          .eq("tenant_id", tenantId);
        if (execUpdateErr) {
          console.error("[webhook] execution complete error:", execUpdateErr.message);
        }
      } catch (execUpdateThrow) {
        console.error("[webhook] execution complete threw:", execUpdateThrow);
      }

      // Log AI processing (non-blocking) — keep webhook-specific row for
      // system_prompt + user_prompt (not captured by ai-caller's log).
      if (executionRowId) {
        // SECURITY: Redact PII from prompts and results BEFORE truncation to prevent leaks.
        const redactedResult = redactPII(resultText);
        const redactedSystem = redactPII(finalSystemPrompt);
        const redactedUser = redactPII(commandIntent ?? processedText);

        void supabase.from("agent_ai_logs").insert({
          execution_id: executionRowId,
          agent_name: agentName,
          lead_id: leadId,
          tenant_id: tenantId,
          model: aiResponse.model,
          prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
          completion_tokens: aiResponse.usage?.completion_tokens || 0,
          total_tokens: aiResponse.usage?.total_tokens || 0,
          result_preview: redactedResult.substring(0, 200),
          system_prompt: redactedSystem.substring(0, 500),
          user_prompt: redactedUser.substring(0, 500),
          full_result: redactedResult.substring(0, 2000),
          context: { mediaCategory, agent: agentName, hasLegalContext: legalCtx.has_context },
          created_at: new Date().toISOString(),
        }).then(({ error }) => { if (error) console.error("[webhook] ai_log insert error:", error.message); });
      }

      console.log(`[processMsg:${provider}] ${agentName} responded: "${resultText.substring(0, 80)}..."`);

      // ── ONDA 17: Update conversation phase + state-based handoff ──
      try {
        let nextPhase = conversationPhase;
        const ctxPatch: Record<string, unknown> = {
          last_message_at: new Date().toISOString(),
          last_user_message: processedText.substring(0, 200),
        };

        if (conversationPhase === "greeting") {
          nextPhase = "qualifying";
        } else if (conversationPhase === "qualifying" && hasActionIntent) {
          nextPhase = "scheduling";
        } else if (conversationPhase === "scheduling") {
          if (/reuni[ãa]o (agendada|marcada|confirmada)|agendamento confirmado/i.test(resultText)) {
            nextPhase = "confirmed";
          }
        }

        if (!accumulatedContext.lead_name && name && name !== "Unknown") {
          ctxPatch.lead_name = name;
        }
        if (!accumulatedContext.area_juridica && lead?.area_juridica && lead.area_juridica !== "Nao informado") {
          ctxPatch.area_juridica = lead.area_juridica;
        }

        // ── HANDOFF DETECTION: detecta menção do agente alvo no texto da resposta ──
        // Lógica simplificada: se a resposta MENCIONA outro agente específico (Jacira/Gabriel/Marcos)
        // E o agente atual NÃO é esse, é sinal de handoff verbal.
        // Guard: nunca dispara handoff pro próprio agente que está respondendo (evita loop).
        let detectedHandoff: string | null = null;
        const mentionsJacira = /\b(?:dra?\.?\s*jacira|doutora\s+jacira|jacira\s+gomes)\b/i.test(resultText);
        const mentionsGabriel = /\b(?:dr\.?\s*gabriel|doutor\s+gabriel|assistente\s+jur[íi]dico)\b/i.test(resultText);
        const mentionsMarcos = /\b(?:marcos|consultor\s+comercial)\b/i.test(resultText);

        if (mentionsJacira && agentType !== "juridico_bancario") {
          detectedHandoff = "juridico_bancario";
        } else if (mentionsGabriel && agentType !== "juridico") {
          detectedHandoff = "juridico";
        } else if (mentionsMarcos && agentType !== "comercial") {
          detectedHandoff = "comercial";
        }

        // Se este turno usou handoff override, limpa o flag (one-shot consumido)
        const clearHandoff = !!handoffOverride;
        // Se detectou novo handoff, sobrescreve (mais recente vence)
        const setHandoff = detectedHandoff;

        if (
          nextPhase !== conversationPhase ||
          Object.keys(ctxPatch).length > 0 ||
          setHandoff !== null ||
          clearHandoff
        ) {
          await supabase.rpc("update_conversation_phase", {
            _conversation_id: conversationId,
            _tenant_id: tenantId,
            _new_phase: nextPhase,
            _agent_type: agentType,
            _context_patch: ctxPatch,
            _pending_handoff_to: setHandoff,
            _clear_pending_handoff: clearHandoff && setHandoff === null,
          });
          if (nextPhase !== conversationPhase) {
            console.log(`[processMsg:${provider}] phase ${conversationPhase} → ${nextPhase}`);
          }
          if (setHandoff) {
            console.log(`[processMsg:${provider}] HANDOFF detected → next msg routes to ${setHandoff}`);
          }
          if (clearHandoff && !setHandoff) {
            console.log(`[processMsg:${provider}] handoff override consumed (cleared)`);
          }
        }
      } catch (phaseErr) {
        console.warn(`[processMsg:${provider}] phase update failed:`, phaseErr instanceof Error ? phaseErr.message : String(phaseErr));
      }
    } catch (err) {
      // Budget-exceeded is a known path → keep the old "budget exhausted" UX
      // (canned fallback + admin alert) instead of the generic failure message.
      if (err instanceof BudgetExceededError) {
        budgetExceeded = true;
        console.warn(`[whatsapp-webhook] AI budget exceeded (${err.scope}) for tenant ${tenantId} — skipping AI response`);
        try {
          const { error: execFailErr } = await supabase
            .from("agent_executions")
            .update({
              status: "failed",
              error_message: `budget_exceeded:${err.scope ?? "unknown"}`,
              completed_at: new Date().toISOString(),
            })
            .eq("execution_id", executionId)
            .eq("tenant_id", tenantId);
          if (execFailErr) {
            console.error("[webhook] execution fail (budget) error:", execFailErr.message);
          }
        } catch (execFailThrow) {
          console.error("[webhook] execution fail (budget) threw:", execFailThrow);
        }
      } else {
        aiError = err instanceof Error ? err : new Error(String(err));
        console.error(`[processMsg:${provider}] AI error (using fallback):`, aiError.message);

        try {
          const { error: execFailErr } = await supabase
            .from("agent_executions")
            .update({
              status: "failed",
              error_message: aiError.message,
              completed_at: new Date().toISOString(),
            })
            .eq("execution_id", executionId)
            .eq("tenant_id", tenantId);
          if (execFailErr) {
            console.error("[webhook] execution fail (ai) error:", execFailErr.message);
          }
        } catch (execFailThrow) {
          console.error("[webhook] execution fail (ai) threw:", execFailThrow);
        }
      }
    }

    let aiText: string;
    if (aiError) {
      aiText = `Olá! Recebi sua mensagem e em breve um de nossos advogados entrará em contato. Obrigado pelo contato com ${officeName}!`;
      console.error(`[processMsg:${provider}] AI FAILED: ${aiError.message}`);
    } else if (budgetExceeded) {
      aiText = `Olá! Recebi sua mensagem. No momento nosso assistente virtual está em manutenção, mas já encaminhei para nossa equipe e um advogado entrará em contato em breve. Obrigado pelo contato com ${officeName}!`;
      console.warn(`[processMsg:${provider}] AI budget exceeded — sending fallback`);

      // Notify tenant admins about budget exhaustion so they can take action
      void supabase.from("notificacoes").insert({
        tenant_id: tenantId,
        tipo: "alerta",
        titulo: "⚠️ Cota de IA esgotada — respostas automáticas pausadas",
        mensagem: `O limite diário de tokens da IA foi atingido. Leads estão recebendo resposta genérica. Último lead afetado: ${name} (${from}). Considere aumentar o limite em Configurações > IA.`,
        ativo: true,
      }).then(({ error }) => { if (error) console.error("[webhook] budget notification error:", error.message); });
    } else if (aiResponse?.result) {
      aiText = aiResponse.result;
    } else {
      aiText = `Olá! Recebi sua mensagem e vou encaminhar para nossa equipe. Obrigado pelo contato com ${officeName}!`;
      console.warn(`[processMsg:${provider}] AI returned empty result — sending fallback`);
    }

    // --- LEAD CONFIRMATION: transiciona agendamento 'agendado' → 'confirmado' ---
    // Dispara quando lead diz "confirmo/confirmado/ok" curto e tem agendamento pendente recente.
    const CONFIRM_REGEX = /^(confirmo|confirmado|confirmada|pode confirmar|t[áa] confirmado|ok confirmado|confirmei|confirm[áa]vel)[!?.\s]*$/i;
    const leadConfirmed = text.trim().length < 40 && CONFIRM_REGEX.test(text.trim());
    if (leadConfirmed && leadId) {
      const { data: pending } = await supabase
        .from("agendamentos")
        .select("id, data_hora, responsavel")
        .eq("lead_id", leadId)
        .eq("tenant_id", tenantId)
        .eq("status", "agendado")
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true })
        .limit(1);

      if (pending && pending.length > 0) {
        const ag = pending[0] as { id: string; data_hora: string; responsavel: string };
        const { error: updErr } = await supabase
          .from("agendamentos")
          .update({ status: "confirmado", updated_at: new Date().toISOString() })
          .eq("id", ag.id)
          .eq("tenant_id", tenantId);
        if (!updErr) {
          const when = formatScheduleForLead(new Date(ag.data_hora));
          aiText = `Perfeito, confirmado! Te espero em ${when} com ${ag.responsavel}. Qualquer imprevisto me avisa com antecedência.`;
          console.log(`[processMsg:${provider}] Lead ${leadId} confirmed agendamento ${ag.id}`);
        }
      }
    }

    // --- CONSULTATION SCHEDULING: intenção do lead + parsing data/hora + detecção de conflito ---
    // Substitui fluxo antigo reativo por agendamento proativo:
    //   1. Detecta intenção de agendar (mesmo sem sugestão prévia da IA).
    //   2. Tenta extrair data/hora específica da mensagem ("quinta às 14h", "amanhã 10h").
    //   3. Se extraiu: checa conflito com mesmo responsável; se livre, insere e confirma ao lead.
    //   4. Se não extraiu: responde pedindo data/hora em vez de agendar hardcoded.
    //
    // Evita duplicação: não agenda se o lead já tiver agendamento futuro ativo.
    //
    // P0-5 (auditoria 2026-05-25): gateamos o parser legacy por aiUsedSchedulingTool
    // e aiUsedTransferTool. Quando a IA já lidou com a intenção via function-call
    // (schedule/reschedule/cancel/transfer), o parser regex NÃO roda — evita
    // sobrescrita da resposta IA com "Você já tem agendamento ativo".
    const leadWantsToSchedule =
      !leadConfirmed &&
      !aiUsedSchedulingTool &&
      !aiUsedTransferTool &&
      detectScheduleIntent(text);

    if (leadWantsToSchedule && leadId) {
      // Checa se lead já tem agendamento ativo futuro — evita duplicação
      const { data: existingAgendamento } = await supabase
        .from("agendamentos")
        .select("id, data_hora, responsavel, status")
        .eq("lead_id", leadId)
        .eq("tenant_id", tenantId)
        .in("status", ["agendado", "confirmado"])
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true })
        .limit(1);

      if (existingAgendamento && existingAgendamento.length > 0) {
        const existing = existingAgendamento[0] as { data_hora: string; responsavel: string };
        const when = formatScheduleForLead(new Date(existing.data_hora));
        aiText = `Você já tem um atendimento agendado com ${existing.responsavel} em ${when}. Se precisar reagendar, me avisa qual outra data/hora prefere.`;
      } else {
        const parsed = parseScheduleFromText(text);

        // RESOLVE responsavel_id (FK criada em 20260413000004) com fallback em camadas:
        //   1. lead.responsavel_id (já vinculado ao lead)
        //   2. connectionResponsavelId (resolvido por departamento/conexão)
        //   3. profile match por nome ILIKE em lead.responsavel (text legado)
        //   4. primeiro admin/manager do tenant
        let resolvedResponsavelId: string | null = lead?.responsavel_id ?? null;
        if (!resolvedResponsavelId && connectionResponsavelId) {
          resolvedResponsavelId = connectionResponsavelId;
        }
        if (!resolvedResponsavelId) {
          // lead.responsavel é texto livre legado — tenta match case-insensitive
          // deno-lint-ignore no-explicit-any
          const leadResponsavelText = (lead as any)?.responsavel as string | undefined;
          if (leadResponsavelText && leadResponsavelText.trim().length > 0) {
            const { data: byName } = await supabase
              .from("profiles")
              .select("id")
              .eq("tenant_id", tenantId)
              .ilike("nome_completo", leadResponsavelText.trim())
              .maybeSingle();
            resolvedResponsavelId = (byName as { id?: string } | null)?.id ?? null;
          }
        }
        if (!resolvedResponsavelId) {
          // Fallback: primeiro admin/manager do tenant
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("id, user_roles!inner(role, ativo)")
            .eq("tenant_id", tenantId)
            .eq("user_roles.tenant_id", tenantId)
            .in("user_roles.role", ["admin", "manager"])
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          resolvedResponsavelId = (adminProfile as { id?: string } | null)?.id ?? null;
        }

        const responsavelNome = resolvedResponsavelId
          ? (await supabase.from("profiles").select("nome_completo").eq("id", resolvedResponsavelId).maybeSingle())?.data?.nome_completo ?? "Advogado"
          : "Advogado";

        if (parsed && parsed.confidence >= 0.5) {
          // Valida janela comercial (seg-sex, 8h-20h)
          const validation = validateBusinessHours(parsed.dateTimeUTC);
          if (!validation.valid) {
            aiText = validation.message!;
          } else {
          // Checa conflito em DUAS frentes: tabela interna + Google Calendar real do responsável.
          // Sem isso o agente marcaria por cima de eventos do Calendar fora do Jurify (audiência, almoço, etc.).
          const conflict = await hasScheduleConflict(
            supabase as never,
            tenantId,
            responsavelNome,
            parsed.dateTimeUTC,
            60,
            resolvedResponsavelId,
          );

          let calendarBusy = false;
          if (resolvedResponsavelId && !conflict) {
            try {
              const slotEnd = new Date(parsed.dateTimeUTC.getTime() + 60 * 60 * 1000);
              const { data: availRes } = await supabase.functions.invoke("google-calendar", {
                body: {
                  action: "checkAvailabilityForResponsavel",
                  data: {
                    responsavelId: resolvedResponsavelId,
                    timeMin: parsed.dateTimeUTC.toISOString(),
                    timeMax: slotEnd.toISOString(),
                  },
                },
              });
              const busy = (availRes as { busy?: Array<{ start: string; end: string }>; connected?: boolean } | null)?.busy ?? [];
              calendarBusy = busy.length > 0;
              if (calendarBusy) {
                console.log(`[processMsg:${provider}] Google Calendar busy at ${parsed.dateTimeUTC.toISOString()} for responsavel ${resolvedResponsavelId}`);
              }
            } catch (availErr) {
              console.warn(`[processMsg:${provider}] checkAvailability failed (best-effort):`, availErr instanceof Error ? availErr.message : String(availErr));
            }
          }

          if (conflict || calendarBusy) {
            // Sugere 3 slots livres pelos próximos 7 dias úteis
            let suggestionText = "";
            if (resolvedResponsavelId) {
              try {
                const { data: slotsRes } = await supabase.functions.invoke("google-calendar", {
                  body: {
                    action: "suggestSlotsForResponsavel",
                    data: {
                      responsavelId: resolvedResponsavelId,
                      from: parsed.dateTimeUTC.toISOString(),
                      daysToScan: 7,
                      slotMinutes: 60,
                      count: 3,
                    },
                  },
                });
                const slots = (slotsRes as { slots?: Array<{ start: string; end: string }> } | null)?.slots ?? [];
                if (slots.length > 0) {
                  const formatted = slots
                    .map((s, i) => `${i + 1}. ${formatScheduleForLead(new Date(s.start))}`)
                    .join("\n");
                  suggestionText = `\n\nTenho esses horários livres:\n${formatted}\n\nQual prefere?`;
                }
              } catch (suggErr) {
                console.warn(`[processMsg:${provider}] suggestSlots failed:`, suggErr instanceof Error ? suggErr.message : String(suggErr));
              }
            }
            const when = formatScheduleForLead(parsed.dateTimeUTC);
            aiText = `Infelizmente ${responsavelNome} já tem compromisso em ${when}.${suggestionText || " Pode me indicar outro horário?"}`;
          } else {
            // P0 RACE FIX (2026-05-07): usa RPC com pg_try_advisory_xact_lock pra
            // serializar check+insert por (tenant_id, lead_id). Webhooks concorrentes
            // do mesmo lead não criam duplicate booking nem duplicate Calendar event.
            const areaJuridica = lead?.area_juridica ?? "Não especificada";
            const observacoesText = `Agendado automaticamente via WhatsApp a partir da mensagem do lead: "${parsed.matched}".`;

            const { data: rpcRows, error: rpcErr } = await (supabase as unknown as {
              rpc: (fn: string, args: Record<string, unknown>) => Promise<{
                data: Array<{ acquired: boolean; agendamento_id: string | null; conflict_reason: string | null }> | null;
                error: { message: string } | null;
              }>;
            }).rpc("try_acquire_schedule_slot", {
              _tenant_id: tenantId,
              _lead_id: leadId,
              _data_hora: parsed.dateTimeUTC.toISOString(),
              _slot_minutes: 60,
              _responsavel_id: resolvedResponsavelId ?? null,
              _responsavel_nome: responsavelNome,
              _area_juridica: areaJuridica,
              _observacoes: observacoesText,
            });

            const rpcRow = rpcRows && rpcRows.length > 0 ? rpcRows[0] : null;
            const acquired = rpcRow?.acquired === true;
            const conflictReason = rpcRow?.conflict_reason ?? null;
            const newAgendamentoId = rpcRow?.agendamento_id ?? null;
            const agendError = rpcErr;

            console.log(`[processMsg:${provider}] schedule_lock leadId=${leadId} acquired=${acquired} reason=${conflictReason ?? 'ok'}`);

            if (!acquired && !rpcErr) {
              // Race detectada ou idempotência: lead já tem agendamento ou outro fluxo está processando.
              const when = formatScheduleForLead(parsed.dateTimeUTC);
              if (conflictReason === 'lead_already_scheduled') {
                aiText = `Você já tem um agendamento ativo conosco. Caso queira remarcar, é só me avisar.`;
              } else if (conflictReason === 'responsavel_conflict') {
                aiText = `Infelizmente ${responsavelNome} já tem compromisso em ${when}. Pode me indicar outro horário?`;
              } else {
                // lock_busy
                aiText = `Estou processando seu pedido anterior, só um instante…`;
              }
            } else if (!agendError && acquired) {
              const when = formatScheduleForLead(parsed.dateTimeUTC);

              // Cria evento no Google Calendar SINCRONICAMENTE (em vez de fire-and-forget)
              // pra capturar o link Meet e enviar pro lead na mesma mensagem.
              let meetLink: string | null = null;
              if (newAgendamentoId && resolvedResponsavelId) {
                try {
                  const { data: tokenRow } = await supabase
                    .from("google_calendar_tokens")
                    .select("user_id")
                    .eq("user_id", resolvedResponsavelId)
                    .maybeSingle();

                  if (tokenRow) {
                    // Lead email pra adicionar como attendee
                    const { data: leadFull } = await supabase
                      .from("leads")
                      .select("email")
                      .eq("id", leadId)
                      .maybeSingle();
                    const leadEmail = (leadFull as { email?: string } | null)?.email ?? null;
                    const attendeeEmails = leadEmail ? [leadEmail] : [];

                    const eventEnd = new Date(parsed.dateTimeUTC.getTime() + 60 * 60 * 1000).toISOString();
                    const { data: calendarRes, error: calendarErr } = await supabase.functions.invoke("google-calendar", {
                      body: {
                        action: "createEventForResponsavel",
                        data: {
                          responsavelId: resolvedResponsavelId,
                          tenantId,
                          agendamentoId: newAgendamentoId,
                          createMeetLink: true,
                          attendeeEmails,
                          eventData: {
                            summary: `Reunião com ${name}`,
                            description: `Agendamento via WhatsApp.\nLead: ${name} (${from})\nÁrea: ${areaJuridica}\nObs: ${observacoesText}`,
                            start: { dateTime: parsed.dateTimeUTC.toISOString(), timeZone: "America/Sao_Paulo" },
                            end: { dateTime: eventEnd, timeZone: "America/Sao_Paulo" },
                          },
                        },
                      },
                    });

                    if (calendarErr) {
                      console.warn(`[processMsg:${provider}] Calendar sync failed:`, calendarErr.message);
                    } else {
                      const event = (calendarRes as { event?: { id?: string; hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ uri?: string; entryPointType?: string }> } } } | null)?.event;
                      const eventId = event?.id ?? null;
                      meetLink = event?.hangoutLink
                        ?? event?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri
                        ?? null;
                      if (eventId) {
                        await supabase
                          .from("agendamentos")
                          .update({ google_event_id: eventId, link_videochamada: meetLink })
                          .eq("id", newAgendamentoId)
                          .eq("tenant_id", tenantId);
                        console.log(`[processMsg:${provider}] Calendar event ${eventId} (meet=${!!meetLink}) linked to agendamento ${newAgendamentoId}`);
                      }
                    }
                  } else {
                    console.log(`[processMsg:${provider}] No Google token for responsavel ${resolvedResponsavelId} — skipping Calendar sync`);
                  }
                } catch (err) {
                  console.warn(`[processMsg:${provider}] Calendar sync exception:`, err instanceof Error ? err.message : String(err));
                }
              }

              const meetSuffix = meetLink
                ? `\n\n📹 Link da videochamada (Google Meet):\n${meetLink}`
                : "";
              aiText = `Perfeito! Reunião agendada com ${responsavelNome} em ${when}. Você receberá um lembrete antes. Caso precise remarcar, é só me avisar.${meetSuffix}`;
              console.log(`[processMsg:${provider}] Auto-scheduled lead ${leadId} at ${parsed.dateTimeUTC.toISOString()} responsavel_id=${resolvedResponsavelId} (matched: "${parsed.matched}")`);

              void supabase.from("notificacoes").insert({
                tenant_id: tenantId,
                tipo: "sucesso",
                titulo: `📅 Consulta agendada via WhatsApp`,
                mensagem: `Lead "${name}" (${from}) solicitou e agendou reunião em ${when} com ${responsavelNome}.${meetLink ? " Meet: " + meetLink : ""}`,
                ativo: true,
              }).then(({ error }) => { if (error) console.error("[webhook] schedule notification error:", error.message); });
            } else if (agendError) {
              console.error(`[processMsg:${provider}] try_acquire_schedule_slot RPC failed:`, agendError.message);
              aiText = `Tive um problema técnico ao registrar seu agendamento. Nossa equipe já foi notificada e entrará em contato em breve.`;
            }
          }
          } // fecha else de validateBusinessHours
        } else {
          // Intenção detectada mas sem data/hora — sugere slots livres pra dar opções concretas
          let suggestionText = "";
          if (resolvedResponsavelId) {
            try {
              const { data: slotsRes } = await supabase.functions.invoke("google-calendar", {
                body: {
                  action: "suggestSlotsForResponsavel",
                  data: {
                    responsavelId: resolvedResponsavelId,
                    from: new Date().toISOString(),
                    daysToScan: 7,
                    slotMinutes: 60,
                    count: 3,
                  },
                },
              });
              const slots = (slotsRes as { slots?: Array<{ start: string; end: string }> } | null)?.slots ?? [];
              if (slots.length > 0) {
                const formatted = slots
                  .map((s, i) => `${i + 1}. ${formatScheduleForLead(new Date(s.start))}`)
                  .join("\n");
                suggestionText = `\n\nTenho esses horários livres:\n${formatted}\n\nQual prefere? Ou pode sugerir outra data.`;
              }
            } catch { /* fallback ao texto simples */ }
          }
          aiText = `Claro, posso agendar uma reunião com ${responsavelNome}.${suggestionText || ' Qual dia e horário fica melhor pra você? (ex.: "quinta às 14h", "amanhã de manhã")'}`;
        }
      }
    }

    // --- HUMAN HANDOFF: detect when AI can't handle the conversation ---
    // Uses regex for flexible matching of intent patterns (not exact substrings)
    const HANDOFF_REGEX_PATTERNS = [
      // AI admitting it can't answer
      /n[aã]o\s+(tenho|consigo|posso)\s+(como\s+)?(informar|responder|acessar|verificar|confirmar)/i,
      /n[aã]o\s+sei\s+(informar|responder|dizer)/i,
      /n[aã]o\s+tenho\s+(essa|esta|a)\s+(informa[çc][aã]o|resposta)/i,
      /n[aã]o\s+(tenho|possuo)\s+acesso/i,
      // AI recommending human contact
      /recomendo\s+(falar|consultar|conversar)\s+(com\s+)?(um\s+)?(advogado|especialista|profissional|atendente)/i,
      /precis[ao]\s+(falar|entrar\s+em\s+contato|conversar)/i,
      /entre\s+em\s+contato\s+(com|diretamente)/i,
      /encaminhar\s+(para|ao|à)\s+(um\s+)?(advogado|equipe|atendente)/i,
      // AI expressing uncertainty about legal matters
      /n[aã]o\s+(devo|posso)\s+dar\s+(um\s+)?parecer/i,
      /fora\s+d[ao]\s+(meu|minha)\s+(escopo|alcance|capacidade)/i,
      /somente\s+um\s+(advogado|profissional)\s+(pode|poderá)/i,
      /essa\s+quest[aã]o\s+(exige|requer|necessita)\s+(an[aá]lise|avalia[çc][aã]o)\s+(presencial|detalhada|humana)/i,
    ];
    const lowerAiText = aiText.toLowerCase();
    const shouldHandoff = HANDOFF_REGEX_PATTERNS.some((rx) => rx.test(lowerAiText));
    if (shouldHandoff && conversationId) {
      console.log(`[processMsg:${provider}] HANDOFF triggered for ${from} — pausing AI (24h cooldown)`);
      // Cooldown 24h: bloqueia auto-reactivate até humano limpar o campo
      // (migration 20260417000003 adicionou whatsapp_conversations.handoff_until).
      const handoffUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      void supabase
        .from("whatsapp_conversations")
        .update({ ia_active: false, handoff_until: handoffUntil })
        .eq("id", conversationId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] handoff update error:", error.message); });
      void supabase.from("notificacoes").insert({
        tenant_id: tenantId,
        tipo: "alerta",
        titulo: "🔔 Conversa requer atenção humana",
        mensagem: `O agente "${agentName}" detectou que não consegue atender o cliente ${name} (${from}). A IA foi pausada nesta conversa. Responda manualmente na aba WhatsApp.`,
        ativo: true,
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
            content: `Cliente: "${text.substring(0, 200)}". Assistente: "${(aiResponse!.result as string).substring(0, 300)}"`,
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

      // --- RE-ROTEAMENTO DINÂMICO DE DEPARTAMENTO ---
      // Se área detectada difere da área atual do lead E existe depto no tenant
      // cujo nome bate (fuzzy) com a nova área, reatribui depto + responsável.
      // Exemplos: "Direito de Família" → depto "Família"; "Trabalhista" → depto "Trabalhista".
      const currentArea = (lead?.area_juridica as string | null) ?? "";
      const newArea = qualification.extractedArea;
      const areaChanged = currentArea.trim().toLowerCase() !== newArea.trim().toLowerCase();

      if (areaChanged && newArea) {
        // Extrai keyword principal da área ("Direito de Família" → "família")
        const keyword = newArea
          .replace(/^direito\s+(de\s+|do\s+|da\s+)?/i, "")
          .trim()
          .toLowerCase();

        if (keyword.length >= 3) {
          const { data: matchingDepto } = await supabase
            .from("departamentos")
            .select("id, nome")
            .eq("tenant_id", tenantId)
            .eq("ativo", true)
            .ilike("nome", `%${keyword}%`)
            .limit(1)
            .maybeSingle();

          if (matchingDepto?.id && matchingDepto.id !== (lead?.departamento_id as string | null)) {
            leadUpdate.departamento_id = matchingDepto.id;

            // Busca primeiro membro ativo do novo depto como responsável
            const { data: deptoMember } = await supabase
              .from("departamento_membros")
              .select("profile_id")
              .eq("departamento_id", matchingDepto.id)
              .eq("tenant_id", tenantId)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (deptoMember?.profile_id) {
              leadUpdate.responsavel_id = deptoMember.profile_id;
            }

            console.log(`[processMsg:${provider}] Lead ${leadId} re-roteado: area="${currentArea}" → "${newArea}", depto → ${matchingDepto.nome}`);
          }
        }
      }
    }
    // Only ESCALATE temperature (never downgrade — respect manual admin overrides)
    if (qualification.temperature) {
      const tempOrder: Record<string, number> = { cold: 0, warm: 1, hot: 2 };
      const currentTemp = (lead?.temperature as string) || 'cold';
      if ((tempOrder[qualification.temperature] ?? 0) > (tempOrder[currentTemp] ?? 0)) {
        leadUpdate.temperature = qualification.temperature;
      }
    }
    // Only increase score (never decrease — scores represent accumulated qualification)
    if (qualification.leadScore > 0) {
      const currentScore = (lead?.lead_score as number) || 0;
      if (qualification.leadScore > currentScore) {
        leadUpdate.lead_score = qualification.leadScore;
      }
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

      // --- NOTIFY ADMIN/TEAM about lead qualification ---
      const statusLabels: Record<string, string> = {
        novo: 'Novo Lead', em_contato: 'Em Contato', qualificado: 'Qualificado',
        proposta: 'Proposta', negociacao: 'Negociação', ganho: 'Ganho',
      };
      const leadName = qualification.extractedName || name || from;
      const newStatusLabel = statusLabels[qualification.suggestedStatus] || qualification.suggestedStatus;
      const urgencyEmoji = qualification.extractedUrgency === 'alta' ? '🔴' :
                           qualification.extractedUrgency === 'media' ? '🟡' : '🟢';

      void supabase.from("notificacoes").insert({
        tenant_id: tenantId,
        tipo: qualification.temperature === 'hot' ? 'alerta' : 'info',
        titulo: `${urgencyEmoji} Lead qualificado: ${leadName}`,
        mensagem: `${agentName} qualificou o lead como "${newStatusLabel}"${qualification.extractedArea ? ` — Área: ${qualification.extractedArea}` : ''}${qualification.extractedUrgency ? ` — Urgência: ${qualification.extractedUrgency}` : ''}. Confira na aba de Leads.`,
        ativo: true,
      }).then(({ error: notifErr }) => {
        if (notifErr) console.error("[webhook] Notification insert error:", notifErr.message);
      });
    }

    // --- SEND REPLY FIRST, THEN SAVE ---
    console.log(`[processMsg:${provider}] Sending reply via ${provider} to ${from}`);
    let sendResult: SendResult;
    if (provider === "kapso") {
      sendResult = await sendViaKapso(from, aiText, tenantId, supabase);
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
