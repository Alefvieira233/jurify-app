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
    // 1) Insert agendamento
    const { data: agend, error: agendErr } = await ctx.supabase
      .from("agendamentos")
      .insert({
        tenant_id: ctx.tenantId,
        lead_id: ctx.leadId,
        responsavel: ctx.responsavelNome,
        responsavel_id: ctx.responsavelId,
        area_juridica: area,
        data_hora: start.toISOString(),
        observacoes,
        status: "agendado",
        titulo: `Reunião: ${area} — ${ctx.leadNome ?? "Cliente"}`,
        duracao: duration,
      })
      .select("id")
      .single();
    if (agendErr) return { success: false, error: `Erro ao criar agendamento: ${agendErr.message}` };

    const agendamentoId = (agend as { id: string }).id;

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
    default:
      return { success: false, error: `Tool desconhecida: ${toolName}` };
  }
}

/**
 * Builds the ToolContext from supabase + leadId. Returns null if lead/responsavel not resolvable.
 */
export async function buildToolContext(
  supabase: SupabaseClient,
  tenantId: string,
  leadId: string | null,
  responsavelId: string | null,
  responsavelNome: string,
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
  };
}

// Re-export createClient so consumers can build the supabase instance the
// same way without an extra import.
export { createClient };
