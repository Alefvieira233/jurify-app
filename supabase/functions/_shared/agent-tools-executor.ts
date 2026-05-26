/**
 * Agent Tools Executor — runs tool_calls emitted by the agent.
 *
 * Called by `process-message.ts` (whatsapp-webhook) when the agent IA returns
 * tool_calls. Each tool runs with service-role access (already authenticated
 * function-to-function). Returns a stringified JSON result that goes back to
 * the agent as a `tool` message.
 *
 * SCOPE: every call is scoped to (tenantId, leadId, responsavelId) — passed
 * once to the executor, not per-call. The agent never sees these IDs.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AgentToolName } from "./agent-tools.ts";

export interface ToolContext {
  supabase: SupabaseClient;
  tenantId: string;
  leadId: string | null;
  leadEmail: string | null;
  leadNome: string | null;
  leadTelefone: string | null;
  responsavelId: string | null;
  responsavelNome: string;
  areaJuridica: string | null;
  /** Most recent active agendamento for this lead (for reschedule/cancel). */
  activeAgendamentoId: string | null;
  activeGoogleEventId: string | null;
  /** P0-2 (2026-05-25): id da conversation (whatsapp_conversations) para
   *  permitir tool transfer_to_agent gravar pending_handoff_to em
   *  conversation_state. Nullable porque há fluxos onde a conversation ainda
   *  não foi criada (primeiro contato). */
  conversationId: string | null;
}

interface ToolResult {
  success: boolean;
  // deno-lint-ignore no-explicit-any
  data?: any;
  error?: string;
  /** Optional human-readable message for the agent's follow-up reasoning. */
  message?: string;
}

function formatBR(iso: string): string {
  const d = new Date(iso);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const wd = weekdays[brt.getDay()];
  const dd = String(brt.getDate()).padStart(2, "0");
  const mm = String(brt.getMonth() + 1).padStart(2, "0");
  const hh = String(brt.getHours()).padStart(2, "0");
  const mi = String(brt.getMinutes()).padStart(2, "0");
  return `${wd}, ${dd}/${mm} às ${hh}h${mi}`;
}

// =====================================================================
// TOOL IMPLEMENTATIONS
// =====================================================================

async function tool_checkAvailability(
  ctx: ToolContext,
  args: { start_iso: string; end_iso: string },
): Promise<ToolResult> {
  if (!ctx.responsavelId) {
    return { success: false, error: "Sem advogado responsável atribuído ao lead." };
  }
  try {
    const { data, error } = await ctx.supabase.functions.invoke("google-calendar", {
      body: {
        action: "checkAvailabilityForResponsavel",
        data: {
          responsavelId: ctx.responsavelId,
          timeMin: args.start_iso,
          timeMax: args.end_iso,
        },
      },
    });
    if (error) return { success: false, error: error.message };
    const busy = (data as { busy?: Array<{ start: string; end: string }>; connected?: boolean } | null)?.busy ?? [];
    const connected = (data as { connected?: boolean } | null)?.connected ?? false;
    return {
      success: true,
      data: { busy, available: busy.length === 0, calendar_connected: connected },
      message: busy.length === 0
        ? `Horário ${formatBR(args.start_iso)} está LIVRE no calendário do advogado.`
        : `Horário ${formatBR(args.start_iso)} está OCUPADO. Sugira outro ou use suggest_slots.`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tool_suggestSlots(
  ctx: ToolContext,
  args: { from_iso: string; slot_minutes?: number; count?: number },
): Promise<ToolResult> {
  if (!ctx.responsavelId) {
    return { success: false, error: "Sem advogado responsável atribuído ao lead." };
  }
  try {
    const { data, error } = await ctx.supabase.functions.invoke("google-calendar", {
      body: {
        action: "suggestSlotsForResponsavel",
        data: {
          responsavelId: ctx.responsavelId,
          from: args.from_iso,
          daysToScan: 7,
          slotMinutes: args.slot_minutes ?? 60,
          count: args.count ?? 3,
        },
      },
    });
    if (error) return { success: false, error: error.message };
    const slots = (data as { slots?: Array<{ start: string; end: string }> } | null)?.slots ?? [];
    const formatted = slots.map((s) => ({ ...s, formatted: formatBR(s.start) }));
    return {
      success: true,
      data: { slots: formatted, count: slots.length },
      message: slots.length > 0
        ? `Encontrei ${slots.length} horário(s) livre(s): ${formatted.map((s) => s.formatted).join("; ")}.`
        : "Não há horários livres nos próximos 7 dias úteis.",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tool_scheduleMeeting(
  ctx: ToolContext,
  args: { start_iso: string; duration_minutes?: number; area_juridica?: string; observacoes?: string },
): Promise<ToolResult> {
  if (!ctx.leadId) {
    return { success: false, error: "Sem lead identificado." };
  }
  if (!ctx.responsavelId) {
    return { success: false, error: "Sem advogado responsável atribuído ao lead." };
  }

  const duration = args.duration_minutes ?? 60;
  const start = new Date(args.start_iso);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const area = args.area_juridica ?? ctx.areaJuridica ?? "Não especificada";
  const observacoes = args.observacoes ?? `Agendado via IA WhatsApp.`;

  try {
    // 1) Insert agendamento via RPC racing-safe (P0 #2 fix 2026-05-07).
    // pg_try_advisory_xact_lock + re-check + INSERT atomic. Trata 3 razões
    // de conflito: lock_busy, lead_already_scheduled, responsavel_conflict.
    const { data: rpcRows, error: rpcErr } = await (ctx.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: Array<{ acquired: boolean; agendamento_id: string | null; conflict_reason: string | null }> | null;
        error: { message: string } | null;
      }>;
    }).rpc("try_acquire_schedule_slot", {
      _tenant_id: ctx.tenantId,
      _lead_id: ctx.leadId,
      _data_hora: start.toISOString(),
      _slot_minutes: duration,
      _responsavel_id: ctx.responsavelId,
      _responsavel_nome: ctx.responsavelNome,
      _area_juridica: area,
      _observacoes: observacoes,
    });
    if (rpcErr) return { success: false, error: `Erro ao criar agendamento: ${rpcErr.message}` };
    const rpcRow = rpcRows && rpcRows.length > 0 ? rpcRows[0] : null;
    if (!rpcRow?.acquired) {
      const reason = rpcRow?.conflict_reason ?? "unknown";
      const userMsg = reason === "lead_already_scheduled"
        ? "Lead já tem reunião agendada. Use reschedule_meeting pra alterar horário."
        : reason === "responsavel_conflict"
        ? `${ctx.responsavelNome} já tem compromisso nesse horário. Sugira outro horário.`
        : "Operação concorrente em curso, tente novamente em instantes.";
      return { success: false, error: userMsg, data: { conflict_reason: reason } };
    }

    const agendamentoId = rpcRow.agendamento_id as string;

    // 2) Create Calendar event with Meet
    let meetLink: string | null = null;
    let calendarEventId: string | null = null;
    try {
      const attendeeEmails = ctx.leadEmail ? [ctx.leadEmail] : [];
      const { data: calRes, error: calErr } = await ctx.supabase.functions.invoke("google-calendar", {
        body: {
          action: "createEventForResponsavel",
          data: {
            responsavelId: ctx.responsavelId,
            tenantId: ctx.tenantId,
            agendamentoId,
            createMeetLink: true,
            attendeeEmails,
            eventData: {
              summary: `Reunião com ${ctx.leadNome ?? "Cliente"}`,
              description: `Agendamento via WhatsApp IA.\nLead: ${ctx.leadNome ?? "?"}${ctx.leadTelefone ? " (" + ctx.leadTelefone + ")" : ""}\nÁrea: ${area}\nObs: ${observacoes}`,
              start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
              end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
            },
          },
        },
      });
      if (!calErr) {
        const event = (calRes as { event?: { id?: string; hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ uri?: string; entryPointType?: string }> } } } | null)?.event;
        calendarEventId = event?.id ?? null;
        meetLink = event?.hangoutLink
          ?? event?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri
          ?? null;
        if (calendarEventId) {
          await ctx.supabase
            .from("agendamentos")
            .update({ google_event_id: calendarEventId, link_videochamada: meetLink })
            .eq("id", agendamentoId)
            .eq("tenant_id", ctx.tenantId);
        }
      }
    } catch (calErr) {
      console.warn("[tool:schedule_meeting] Calendar sync failed:", calErr instanceof Error ? calErr.message : String(calErr));
    }

    return {
      success: true,
      data: {
        agendamento_id: agendamentoId,
        google_event_id: calendarEventId,
        meet_link: meetLink,
        formatted: formatBR(start.toISOString()),
        responsavel: ctx.responsavelNome,
      },
      message: `Reunião marcada com ${ctx.responsavelNome} em ${formatBR(start.toISOString())}.${meetLink ? " Meet criado." : ""}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tool_rescheduleMeeting(
  ctx: ToolContext,
  args: { new_start_iso: string; duration_minutes?: number },
): Promise<ToolResult> {
  if (!ctx.activeAgendamentoId) {
    return {
      success: false,
      error: "Lead não tem reunião ativa pra reagendar. Use schedule_meeting pra criar uma nova.",
    };
  }

  const duration = args.duration_minutes ?? 60;
  const newStart = new Date(args.new_start_iso);
  const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

  try {
    // 1) Update agendamento
    const { error: updErr } = await ctx.supabase
      .from("agendamentos")
      .update({
        data_hora: newStart.toISOString(),
        duracao: duration,
        status: "agendado",
        updated_at: new Date().toISOString(),
        reminder_30min: false,
        reminder_sent: false,
      })
      .eq("id", ctx.activeAgendamentoId)
      .eq("tenant_id", ctx.tenantId);
    if (updErr) return { success: false, error: `Erro ao atualizar agendamento: ${updErr.message}` };

    // 2) Update Calendar event
    if (ctx.activeGoogleEventId && ctx.responsavelId) {
      try {
        await ctx.supabase.functions.invoke("google-calendar", {
          body: {
            action: "updateEventForResponsavel",
            data: {
              responsavelId: ctx.responsavelId,
              eventId: ctx.activeGoogleEventId,
              eventData: {
                start: { dateTime: newStart.toISOString(), timeZone: "America/Sao_Paulo" },
                end: { dateTime: newEnd.toISOString(), timeZone: "America/Sao_Paulo" },
              },
            },
          },
        });
      } catch (calErr) {
        console.warn("[tool:reschedule_meeting] Calendar update failed:", calErr instanceof Error ? calErr.message : String(calErr));
      }
    }

    return {
      success: true,
      data: { agendamento_id: ctx.activeAgendamentoId, formatted: formatBR(newStart.toISOString()) },
      message: `Reunião reagendada pra ${formatBR(newStart.toISOString())}.`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tool_cancelMeeting(
  ctx: ToolContext,
  args: { reason?: string },
): Promise<ToolResult> {
  if (!ctx.activeAgendamentoId) {
    return { success: false, error: "Lead não tem reunião ativa pra cancelar." };
  }

  try {
    const cancelObs = args.reason
      ? `Cancelado via WhatsApp IA. Motivo: ${args.reason}`
      : `Cancelado via WhatsApp IA.`;

    const { error: updErr } = await ctx.supabase
      .from("agendamentos")
      .update({
        status: "cancelado",
        observacoes: cancelObs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.activeAgendamentoId)
      .eq("tenant_id", ctx.tenantId);
    if (updErr) return { success: false, error: `Erro ao cancelar agendamento: ${updErr.message}` };

    if (ctx.activeGoogleEventId && ctx.responsavelId) {
      try {
        await ctx.supabase.functions.invoke("google-calendar", {
          body: {
            action: "deleteEventForResponsavel",
            data: { responsavelId: ctx.responsavelId, eventId: ctx.activeGoogleEventId },
          },
        });
      } catch (calErr) {
        console.warn("[tool:cancel_meeting] Calendar delete failed:", calErr instanceof Error ? calErr.message : String(calErr));
      }
    }

    return {
      success: true,
      data: { agendamento_id: ctx.activeAgendamentoId },
      message: `Reunião cancelada com sucesso.`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tool_updateLeadKanban(
  ctx: ToolContext,
  args: { new_status: string; temperature?: string; reason?: string },
): Promise<ToolResult> {
  if (!ctx.leadId) {
    return { success: false, error: "Sem lead identificado." };
  }
  const validStatuses = ["em_contato", "qualificado", "em_proposta", "contratado", "perdido"];
  if (!validStatuses.includes(args.new_status)) {
    return { success: false, error: `Status inválido. Use: ${validStatuses.join(", ")}` };
  }

  try {
    const updatePayload: Record<string, unknown> = {
      status: args.new_status,
      updated_at: new Date().toISOString(),
    };
    if (args.temperature && ["hot", "warm", "cold"].includes(args.temperature)) {
      updatePayload.temperature = args.temperature;
    }

    const { error: updErr } = await ctx.supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", ctx.leadId)
      .eq("tenant_id", ctx.tenantId);
    if (updErr) return { success: false, error: `Erro ao atualizar lead: ${updErr.message}` };

    if (args.reason) {
      await ctx.supabase.from("lead_historico").insert({
        tenant_id: ctx.tenantId,
        lead_id: ctx.leadId,
        tipo: "status_change",
        descricao: `Status: ${args.new_status} (${args.reason})`,
      });
    }

    return {
      success: true,
      data: { lead_id: ctx.leadId, new_status: args.new_status, temperature: args.temperature ?? null },
      message: `Lead movido pra status='${args.new_status}'.`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// =====================================================================
// P0-2 (2026-05-25): TRANSFER_TO_AGENT — handoff explícito via function-call
// =====================================================================

async function tool_transferToAgent(
  ctx: ToolContext,
  args: { target_agent_type: string; reason: string; handoff_message: string },
): Promise<ToolResult> {
  try {
    if (!ctx.conversationId) {
      return {
        success: false,
        error: "Conversation ID indisponível — handoff requer conversa persistida.",
      };
    }

    const target = (args.target_agent_type || "").trim();
    if (!target) {
      return { success: false, error: "target_agent_type vazio." };
    }

    // Confirma que o agente alvo existe e está ativo neste tenant.
    const { data: agentRow, error: agentErr } = await ctx.supabase
      .from("agentes_ia")
      .select("id, nome, tipo, ativo")
      .eq("tenant_id", ctx.tenantId)
      .eq("tipo", target)
      .eq("ativo", true)
      .maybeSingle();

    if (agentErr) {
      return { success: false, error: `Erro ao buscar agente alvo: ${agentErr.message}` };
    }

    if (!agentRow) {
      // Fallback graceful: não derruba a UX do cliente, mas registra para audit
      console.warn(
        `[transfer_to_agent] Agente alvo '${target}' não disponível no tenant ${ctx.tenantId}`,
      );
      return {
        success: false,
        error: `agent_not_available:${target}`,
        message:
          "O especialista solicitado não está disponível agora. Vou continuar atendendo e, se necessário, encaminho posteriormente.",
      };
    }

    // Persiste o handoff em conversation_state — próximo turn pula o orchestrator
    // e despacha direto para target_agent_type (cf. process-message.ts).
    const { error: stateErr } = await ctx.supabase
      .from("conversation_state")
      .upsert(
        {
          conversation_id: ctx.conversationId,
          tenant_id: ctx.tenantId,
          pending_handoff_to: target,
          handoff_reason: args.reason?.substring(0, 500) ?? null,
          handoff_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id" },
      );

    if (stateErr) {
      return {
        success: false,
        error: `Falha ao persistir handoff em conversation_state: ${stateErr.message}`,
      };
    }

    // Telemetria: registra em audit_log (imutável) para análise post-mortem
    // e para o dashboard de qualidade de handoff.
    await ctx.supabase.from("audit_log").insert({
      tenant_id: ctx.tenantId,
      action: "agent_handoff",
      entity_type: "conversation",
      entity_id: ctx.conversationId,
      // user_id null aqui (chamada server-to-server pela IA)
      metadata: {
        from_lead_id: ctx.leadId,
        target_agent_type: target,
        target_agent_id: agentRow.id,
        target_agent_name: agentRow.nome,
        reason: args.reason?.substring(0, 500) ?? null,
        triggered_by: "tool_call",
      },
    });

    return {
      success: true,
      data: {
        target_agent_type: target,
        target_agent_name: agentRow.nome,
        handoff_message: args.handoff_message,
      },
      // O texto retornado entra como input do próximo passo do agente.
      // O webhook usa `handoff_message` direto como resposta visível ao cliente.
      message: `Handoff registrado para ${agentRow.nome}. Próximo turn será atendido por ${target}.`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// =====================================================================
// PUBLIC API
// =====================================================================

export async function executeAgentTool(
  ctx: ToolContext,
  toolName: AgentToolName | string,
  // deno-lint-ignore no-explicit-any
  args: any,
): Promise<ToolResult> {
  console.log(`[agent-tools] Executing: ${toolName}`, JSON.stringify(args).substring(0, 200));

  switch (toolName) {
    case "check_availability":
      return tool_checkAvailability(ctx, args);
    case "suggest_slots":
      return tool_suggestSlots(ctx, args);
    case "schedule_meeting":
      return tool_scheduleMeeting(ctx, args);
    case "reschedule_meeting":
      return tool_rescheduleMeeting(ctx, args);
    case "cancel_meeting":
      return tool_cancelMeeting(ctx, args);
    case "update_lead_kanban":
      return tool_updateLeadKanban(ctx, args);
    case "transfer_to_agent":
      return tool_transferToAgent(ctx, args);
    default:
      return { success: false, error: `Tool desconhecida: ${toolName}` };
  }
}

/**
 * Builds the ToolContext from supabase + leadId. Returns null if lead/responsavel not resolvable.
 * P0-2 (2026-05-25): aceita conversationId opcional para suportar a tool
 * transfer_to_agent (que persiste pending_handoff_to em conversation_state).
 * Callers antigos que não passarem o param continuam funcionando — apenas
 * a tool transfer_to_agent retornará erro graceful.
 */
export async function buildToolContext(
  supabase: SupabaseClient,
  tenantId: string,
  leadId: string | null,
  responsavelId: string | null,
  responsavelNome: string,
  conversationId: string | null = null,
): Promise<ToolContext> {
  let leadEmail: string | null = null;
  let leadNome: string | null = null;
  let leadTelefone: string | null = null;
  let areaJuridica: string | null = null;
  let activeAgendamentoId: string | null = null;
  let activeGoogleEventId: string | null = null;

  if (leadId) {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("email, nome, telefone, area_juridica")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    leadEmail = (leadRow as { email?: string } | null)?.email ?? null;
    leadNome = (leadRow as { nome?: string } | null)?.nome ?? null;
    leadTelefone = (leadRow as { telefone?: string } | null)?.telefone ?? null;
    areaJuridica = (leadRow as { area_juridica?: string } | null)?.area_juridica ?? null;

    // Active agendamento (futuro, status agendado/confirmado)
    const { data: agend } = await supabase
      .from("agendamentos")
      .select("id, google_event_id")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .in("status", ["agendado", "confirmado"])
      .gte("data_hora", new Date().toISOString())
      .order("data_hora", { ascending: true })
      .limit(1)
      .maybeSingle();
    activeAgendamentoId = (agend as { id?: string } | null)?.id ?? null;
    activeGoogleEventId = (agend as { google_event_id?: string } | null)?.google_event_id ?? null;
  }

  return {
    supabase,
    tenantId,
    leadId,
    leadEmail,
    leadNome,
    leadTelefone,
    responsavelId,
    responsavelNome,
    areaJuridica,
    activeAgendamentoId,
    activeGoogleEventId,
    conversationId,
  };
}

// Re-export createClient so consumers can build the supabase instance the
// same way without an extra import.
export { createClient };
