import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { buildLegalContext } from "../../_shared/legal-context.ts";
import { DEFAULT_OPENAI_MODEL } from "../../_shared/ai-model.ts";
import { checkBudgetBeforeCall, recordTokenUsage } from "../../_shared/ai-budget.ts";
import { sanitizeInput } from "../../_shared/security.ts";
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
// 📨 PROCESSA MENSAGEM NORMALIZADA (funciona para ambos providers)
// ============================================
export async function processNormalizedMessage(
  supabase: ReturnType<typeof createClient>,
  msg: NormalizedMessage,
) {
  try {
    const { from, name, text, messageType, mediaUrl, instanceName, provider } = msg;

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

    // 1c. FALLBACK: Match by connected conexao_whatsapp with matching phone
    if (!tenantId && from) {
      const cleanFrom = from.replace(/\D/g, "");
      const { data: connMatch } = await supabase
        .from("conexoes_whatsapp")
        .select("tenant_id")
        .eq("status", "connected")
        .or(`telefone.eq.${cleanFrom},telefone.eq.+${cleanFrom}`)
        .limit(1)
        .maybeSingle();

      if (connMatch?.tenant_id) {
        tenantId = connMatch.tenant_id;
        resolvedVia = "conexoes_whatsapp.telefone";
        console.warn(`[processMsg:${provider}] Tenant resolved via fallback method 1c (telefone match) — less reliable for multi-tenant`);
      }
    }

    // NOTE: Method 2 (single-config-shortcut) was REMOVED — it's dangerous for multi-tenant
    // because it assigns messages to a tenant based on being the only config, not on actual match.

    // 3. LAST RESORT: Resolve by existing conversation (phone number match)
    if (!tenantId) {
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("tenant_id")
        .eq("phone_number", from)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        tenantId = existingConv.tenant_id;
        resolvedVia = "whatsapp_conversations.phone_number";
        console.warn(`[processMsg:${provider}] Tenant resolved via last-resort method 3 (existing conversation) — primary resolution methods failed`);
      }
    }

    if (!tenantId) {
      console.error(`[processMsg:${provider}] TENANT RESOLUTION FAILED | from=${from} | instance=${instanceName} | type=${messageType} | text="${text.substring(0, 80)}"`);
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
    const { data: lead } = await supabase
      .from("leads")
      .select("id, status, area_juridica, departamento_id, responsavel_id, temperature, lead_score")
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
    // AUTO-REACTIVATE: If ia_active=false for >2 hours and new message arrives, reactivate.
    let iaEnabled = conversation ? (conversation.ia_active !== false) : true;

    if (!iaEnabled && conversation?.updated_at) {
      const hoursSinceUpdate = (Date.now() - new Date(conversation.updated_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate >= 2) {
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

    // Command detection — maps slash commands to intents and routing agents
    const COMMANDS: Record<string, { intent: string; agent: string }> = {
      "/prazos": { intent: "liste os prazos processuais do cliente com datas e urgência", agent: "juridico" },
      "/processos": { intent: "liste os processos ativos do cliente com número, fase e tribunal", agent: "juridico" },
      "/documentos": { intent: "informe quantos documentos o cliente tem no sistema e quais tipos", agent: "analista_documentos" },
      "/honorarios": { intent: "informe o status dos honorários do cliente: valores acordados, pagos e pendentes", agent: "juridico" },
      "/status": { intent: "dê um resumo completo e organizado de todos os casos, prazos e pendências do cliente", agent: "juridico" },
      "/audiencias": { intent: "liste as audiências e compromissos agendados do cliente nos próximos 60 dias", agent: "juridico" },
      "/andamento": { intent: "descreva o andamento cronológico dos processos do cliente, do mais recente ao mais antigo", agent: "juridico" },
    };
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

    if (commandKey) {
      agentType = COMMANDS[commandKey]!.agent;
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

    // Budget check — skip AI if over daily limit (webhook, so no 429)
    let budgetExceeded = false;
    if (tenantId) {
      const budgetCheck = await checkBudgetBeforeCall(tenantId);
      if (!budgetCheck.allowed) {
        console.warn(`[whatsapp-webhook] AI budget exceeded for tenant ${tenantId}, skipping AI response`);
        budgetExceeded = true;
      }
    }

    if (!budgetExceeded) try {
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
      if (!resultText) {
        console.error(`[processMsg:${provider}] OpenAI returned EMPTY content. Model: ${DEFAULT_OPENAI_MODEL} | Choices: ${completion.choices?.length || 0} | FinishReason: ${completion.choices?.[0]?.finish_reason || "N/A"} | Usage: ${JSON.stringify(completion.usage)}`);
      }
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

      // Record daily token usage
      if (tenantId && aiResponse.usage?.total_tokens) {
        await recordTokenUsage(tenantId, aiResponse.usage.total_tokens);
      }

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
    const leadWantsToSchedule = !leadConfirmed && detectScheduleIntent(text);

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
        const responsavelNome = connectionResponsavelId
          ? (await supabase.from("profiles").select("nome_completo").eq("id", connectionResponsavelId).maybeSingle())?.data?.nome_completo ?? "Advogado"
          : "Advogado";

        if (parsed && parsed.confidence >= 0.5) {
          // Valida janela comercial (seg-sex, 8h-20h)
          const validation = validateBusinessHours(parsed.dateTimeUTC);
          if (!validation.valid) {
            aiText = validation.message!;
          } else {
          // Checa conflito com mesmo responsável
          const conflict = await hasScheduleConflict(
            supabase as never,
            tenantId,
            responsavelNome,
            parsed.dateTimeUTC,
            60,
          );

          if (conflict) {
            const when = formatScheduleForLead(parsed.dateTimeUTC);
            aiText = `Infelizmente ${responsavelNome} já tem compromisso em ${when}. Posso verificar outro horário? Você prefere mais cedo ou mais tarde nesse dia, ou outra data?`;
          } else {
            const { error: agendError } = await supabase.from("agendamentos").insert({
              lead_id: leadId,
              tenant_id: tenantId,
              area_juridica: lead?.area_juridica ?? "Não especificada",
              data_hora: parsed.dateTimeUTC.toISOString(),
              responsavel: responsavelNome,
              status: "agendado",
              observacoes: `Agendado automaticamente via WhatsApp a partir da mensagem do lead: "${parsed.matched}".`,
            });

            if (!agendError) {
              const when = formatScheduleForLead(parsed.dateTimeUTC);
              aiText = `Perfeito! Reunião agendada com ${responsavelNome} em ${when}. Você receberá um lembrete antes. Caso precise remarcar, é só me avisar.`;
              console.log(`[processMsg:${provider}] Auto-scheduled lead ${leadId} at ${parsed.dateTimeUTC.toISOString()} (matched: "${parsed.matched}")`);

              void supabase.from("notificacoes").insert({
                tenant_id: tenantId,
                tipo: "sucesso",
                titulo: `📅 Consulta agendada via WhatsApp`,
                mensagem: `Lead "${name}" (${from}) solicitou e agendou reunião em ${when} com ${responsavelNome}.`,
                ativo: true,
              }).then(({ error }) => { if (error) console.error("[webhook] schedule notification error:", error.message); });
            } else {
              console.error(`[processMsg:${provider}] Agendamento insert failed:`, agendError.message);
              aiText = `Tive um problema técnico ao registrar seu agendamento. Nossa equipe já foi notificada e entrará em contato em breve.`;
            }
          }
          } // fecha else de validateBusinessHours
        } else {
          // Intenção detectada mas sem data/hora — pede especificação em vez de agendar hardcoded
          aiText = `Claro, posso agendar uma reunião com ${responsavelNome}. Qual dia e horário fica melhor pra você? (ex.: "quinta às 14h", "amanhã de manhã")`;
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
      console.log(`[processMsg:${provider}] HANDOFF triggered for ${from} — pausing AI`);
      void supabase
        .from("whatsapp_conversations")
        .update({ ia_active: false })
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
