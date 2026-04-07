/**
 * @module useAgendaTasks
 * @description Helper functions for agenda automation task creation:
 * email invites, WhatsApp messages, pipeline tasks, and Google Drive folders.
 * Extracted from useAgendaAutomation for single-responsibility.
 *
 * @internal Used by useAgendaAutomation facade — do not import directly in components.
 */
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { Agendamento } from '@/hooks/useAgendamentos';
import type { WorkflowConfig } from './useAgendaAutomation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Lead data fetched once at orchestration level for all automation helpers */
export interface LeadData {
  email: string | null;
  nome: string | null;
  /** Phone number used for WhatsApp — maps to leads.telefone */
  whatsapp: string | null;
  cpf_cnpj: string | null;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Fetches minimal lead data needed by automation tasks.
 */
export async function fetchLeadForAutomation(leadId: string): Promise<LeadData> {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('email, nome, telefone, cpf_cnpj')
    .eq('id', leadId)
    .single();

  if (error || !lead) throw new Error('Lead não encontrado');
  return {
    email: lead.email,
    nome: lead.nome,
    whatsapp: lead.telefone, // telefone is used for WhatsApp
    cpf_cnpj: lead.cpf_cnpj,
  };
}

/**
 * Sends an email invite for the agendamento to the lead's email address.
 */
export async function createEmailInvite(agendamento: Agendamento, config: WorkflowConfig, lead: LeadData) {
  if (!lead.email) throw new Error('Lead sem email');

  const message = config.custom_message || `
Olá ${lead.nome},

Confirmamos seu agendamento:

📅 ${new Date(agendamento.data_hora).toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })}
⏰ ${new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  })}
📍 ${agendamento.observacoes || 'A definir'}

Por favor, confirme sua presença.

Atenciosamente,
Escritório Jurídico
  `.trim();

  // Chamar Edge Function de email
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: lead.email,
      subject: `Confirmação de agendamento - ${new Date(agendamento.data_hora).toLocaleDateString('pt-BR')}`,
      message,
    },
  });

  if (error) throw error;
}

/**
 * Sends a WhatsApp confirmation message for the agendamento.
 */
export async function createWhatsAppMessage(agendamento: Agendamento, config: WorkflowConfig, lead: LeadData) {
  if (!lead.whatsapp) throw new Error('Lead sem WhatsApp');

  const message = config.custom_message || `
Olá ${lead.nome}! 👋

Confirmamos seu agendamento:
📅 ${new Date(agendamento.data_hora).toLocaleDateString('pt-BR')}
⏰ ${new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}

Por favor, responda *CONFIRMAR* para confirmar presença.

Atenciosamente,
Escritório Jurídico
  `.trim();

  // Chamar Edge Function de WhatsApp
  const { error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: {
      to: lead.whatsapp,
      text: message,
    },
  });

  if (error) throw error;
}

/**
 * Creates a preparation task in the pipeline, due 1 day before the agendamento.
 */
export async function createTask(agendamento: Agendamento, userId: string) {
  if (!agendamento.tenant_id) throw new Error('Agendamento sem tenant_id');
  const task = {
    tenant_id: agendamento.tenant_id,
    titulo: `Preparar ${agendamento.area_juridica ?? 'Consulta'} - ${agendamento.responsavel ?? 'Responsável'}`,
    descricao: `Agendamento para ${new Date(agendamento.data_hora).toLocaleString('pt-BR')}`,
    lead_id: agendamento.lead_id,
    prazo: new Date(new Date(agendamento.data_hora).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia antes
    prioridade: 'alta',
    status: 'pendente',
    criador_id: userId,
  };

  const { error } = await supabase.from('tarefas').insert([task]);
  if (error) throw error;
}

/**
 * Creates a Google Drive folder for the agendamento's documents.
 */
export async function createDriveFolder(agendamento: Agendamento, lead: LeadData) {
  const folderName = `${lead.nome} - ${agendamento.area_juridica} - ${new Date(agendamento.data_hora).toLocaleDateString('pt-BR')}`;

  // Chamar Edge Function para criar pasta no Google Drive
  const { error } = await supabase.functions.invoke('create-drive-folder', {
    body: {
      name: folderName,
      lead_id: agendamento.lead_id,
      agendamento_id: agendamento.id,
    },
  });

  if (error) throw error;
}
