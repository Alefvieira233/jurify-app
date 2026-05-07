/**
 * Agent Tools — OpenAI function calling definitions for the WhatsApp legal AI.
 *
 * The agent invokes these tools when the conversation needs concrete actions
 * (vs. plain text response). The webhook collects tool_calls, executes via
 * `agent-tools-executor`, and feeds results back to the agent for the next turn.
 *
 * Five tools cover the CRM + scheduling lifecycle:
 *   - check_availability   : free/busy on the lawyer's Calendar
 *   - schedule_meeting     : create agendamento + Calendar event + Meet link
 *   - reschedule_meeting   : update existing agendamento + Calendar event
 *   - cancel_meeting       : cancel agendamento + remove Calendar event
 *   - update_lead_kanban   : move lead to a different stage (status)
 */

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Checa disponibilidade real do advogado no Google Calendar entre duas datas/horários. Use SEMPRE antes de marcar reunião pra confirmar que o horário pedido pelo lead está livre. Se ocupado, use suggest_slots ou peça outra data ao lead.",
      parameters: {
        type: "object",
        properties: {
          start_iso: {
            type: "string",
            description: "Início da janela em ISO 8601 (UTC), ex: '2026-05-08T14:00:00Z'",
          },
          end_iso: {
            type: "string",
            description: "Fim da janela em ISO 8601 (UTC). Tipicamente +60min do start.",
          },
        },
        required: ["start_iso", "end_iso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_slots",
      description:
        "Sugere até 3 horários livres do advogado nos próximos 7 dias úteis (seg-sex 8h-20h BRT), considerando ocupação real do Google Calendar. Use quando lead pedir algo vago tipo 'qualquer horário', 'esse dia tá ocupado, e outro?', ou quando o horário desejado estiver indisponível.",
      parameters: {
        type: "object",
        properties: {
          from_iso: {
            type: "string",
            description: "Início da busca em ISO 8601. Use NOW se lead não especificou data; ou data desejada do lead.",
          },
          slot_minutes: {
            type: "number",
            description: "Duração de cada slot em minutos. Default 60.",
          },
          count: {
            type: "number",
            description: "Quantidade de sugestões. Default 3.",
          },
        },
        required: ["from_iso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description:
        "Cria reunião: insere em agendamentos, cria evento no Google Calendar do advogado com link do Google Meet e adiciona o lead como participante por email (se houver). Use SOMENTE depois que check_availability confirmar que o horário está livre.",
      parameters: {
        type: "object",
        properties: {
          start_iso: { type: "string", description: "Data/hora UTC ISO 8601 do início." },
          duration_minutes: {
            type: "number",
            description: "Duração em minutos. Default 60.",
          },
          area_juridica: {
            type: "string",
            description: "Área jurídica da reunião (ex: 'Direito Civil', 'Trabalhista'). Use a área do lead se não especificada.",
          },
          observacoes: {
            type: "string",
            description: "Detalhes adicionais que o lead mencionou (motivo, contexto). Opcional.",
          },
        },
        required: ["start_iso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_meeting",
      description:
        "Reagenda reunião existente do lead: atualiza data_hora no agendamento + atualiza evento Calendar + reenvia convite. Use quando lead pedir 'pode mudar pra outro dia/hora' e existir agendamento ativo.",
      parameters: {
        type: "object",
        properties: {
          new_start_iso: {
            type: "string",
            description: "Nova data/hora UTC ISO 8601.",
          },
          duration_minutes: {
            type: "number",
            description: "Nova duração em minutos. Default 60. Mantém duração atual se omitido.",
          },
        },
        required: ["new_start_iso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_meeting",
      description:
        "Cancela reunião ativa do lead: marca status='cancelado' + remove evento do Google Calendar + notifica lead. Use quando lead disser 'quero cancelar', 'desmarcar', 'não quero mais'.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Motivo do cancelamento (texto livre do lead). Opcional.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_kanban",
      description:
        "Move lead pelo Kanban (status do lead). Use quando o lead avança no funil: 'em_contato' (lead respondeu primeira mensagem), 'qualificado' (deu informações suficientes pra agendar), 'em_proposta' (proposta enviada/discutindo valores), 'contratado' (fechou), 'perdido' (não vai prosseguir).",
      parameters: {
        type: "object",
        properties: {
          new_status: {
            type: "string",
            enum: ["em_contato", "qualificado", "em_proposta", "contratado", "perdido"],
            description: "Novo status do lead.",
          },
          temperature: {
            type: "string",
            enum: ["hot", "warm", "cold"],
            description: "Temperatura do lead com base no engajamento. Opcional.",
          },
          reason: {
            type: "string",
            description: "Justificativa curta da mudança (registrada no histórico).",
          },
        },
        required: ["new_status"],
      },
    },
  },
] as const;

export type AgentToolName =
  | "check_availability"
  | "suggest_slots"
  | "schedule_meeting"
  | "reschedule_meeting"
  | "cancel_meeting"
  | "update_lead_kanban";
