/**
 * useAgendaAutomation — Motor de Automação de Fluxos Jurídicos
 *
 * Quando um agendamento é criado/atualizado:
 * - Sincroniza com Google Calendar
 * - Envia convites por email/WhatsApp
 * - Cria tarefas no pipeline
 * - Gera lembretes
 * - Cria pasta no GDrive
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMonitoring } from '@/lib/monitoring';
import type { Agendamento } from '@/hooks/useAgendamentos';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationTask {
  id: string;
  type: 'email' | 'whatsapp' | 'task' | 'reminder' | 'drive_folder';
  status: 'pending' | 'running' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface WorkflowConfig {
  send_email_invite: boolean;
  send_whatsapp: boolean;
  create_task: boolean;
  create_reminders: boolean;
  create_drive_folder: boolean;
  custom_message?: string;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

async function createEmailInvite(agendamento: Agendamento, config: WorkflowConfig) {
  const { data: lead } = await supabase
    .from('leads')
    .select('email, nome, whatsapp')
    .eq('id', agendamento.lead_id)
    .single();

  if (!lead?.email) throw new Error('Lead sem email');

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

async function createWhatsAppMessage(agendamento: Agendamento, config: WorkflowConfig) {
  const { data: lead } = await supabase
    .from('leads')
    .select('whatsapp, nome')
    .eq('id', agendamento.lead_id)
    .single();

  if (!lead?.whatsapp) throw new Error('Lead sem WhatsApp');

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
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: {
      to: lead.whatsapp,
      message,
    },
  });

  if (error) throw error;
}

async function createTask(agendamento: Agendamento, userId: string) {
  const task = {
    tenant_id: agendamento.tenant_id,
    title: `Preparar ${agendamento.area_juridica} - ${agendamento.responsavel}`,
    description: `Agendamento para ${new Date(agendamento.data_hora).toLocaleString('pt-BR')}`,
    lead_id: agendamento.lead_id,
    assigned_to: agendamento.responsavel,
    due_date: new Date(new Date(agendamento.data_hora).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia antes
    priority: 'high',
    status: 'pending',
    created_by: userId,
  };

  const { error } = await supabase.from('tasks').insert([task]);
  if (error) throw error;
}

async function createReminders(agendamento: Agendamento, userId: string) {
  const reminders = [
    {
      tenant_id: agendamento.tenant_id,
      user_id: userId,
      lead_id: agendamento.lead_id,
      agendamento_id: agendamento.id,
      type: 'email',
      scheduled_for: new Date(new Date(agendamento.data_hora).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24h antes
      message: 'Lembrete: Agendamento amanhã',
      status: 'scheduled',
    },
    {
      tenant_id: agendamento.tenant_id,
      user_id: userId,
      lead_id: agendamento.lead_id,
      agendamento_id: agendamento.id,
      type: 'email',
      scheduled_for: new Date(new Date(agendamento.data_hora).getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2h antes
      message: 'Lembrete: Agendamento em 2 horas',
      status: 'scheduled',
    },
  ];

  const { error } = await supabase.from('reminders').insert(reminders);
  if (error) throw error;
}

async function createDriveFolder(agendamento: Agendamento) {
  const { data: lead } = await supabase
    .from('leads')
    .select('nome, cpf_cnpj')
    .eq('id', agendamento.lead_id)
    .single();

  if (!lead) throw new Error('Lead não encontrado');

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgendaAutomation() {
  const { user } = useAuth();
  const { createCalendarEvent } = useGoogleCalendar();
  const { toast } = useToast();
  const { captureError, trackMetric, trackAction } = useMonitoring();

  const runAutomation = useCallback(async (
    agendamento: Agendamento,
    config: WorkflowConfig,
    trigger: 'create' | 'update' = 'create'
  ) => {
    if (!user?.id) return;

    trackAction('automation_started', {
      agendamentoId: agendamento.id,
      trigger,
      tasksCount: Object.values(config).filter(Boolean).length,
    });

    const tasks: AutomationTask[] = [];

    // 1. Google Calendar Sync
    if (trigger === 'create' && !agendamento.google_event_id) {
      tasks.push({
        id: 'google-sync',
        type: 'email', // Using email as placeholder
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // 2. Email invite
    if (config.send_email_invite) {
      tasks.push({
        id: 'email-invite',
        type: 'email',
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // 3. WhatsApp
    if (config.send_whatsapp) {
      tasks.push({
        id: 'whatsapp',
        type: 'whatsapp',
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // 4. Task creation
    if (config.create_task) {
      tasks.push({
        id: 'create-task',
        type: 'task',
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // 5. Reminders
    if (config.create_reminders) {
      tasks.push({
        id: 'reminders',
        type: 'reminder',
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // 6. Drive folder
    if (config.create_drive_folder) {
      tasks.push({
        id: 'drive-folder',
        type: 'drive_folder',
        status: 'pending',
        payload: { agendamento_id: agendamento.id },
        created_at: new Date().toISOString(),
      });
    }

    // Execute tasks in parallel with error handling
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          // Update task status to running
          await supabase
            .from('automation_tasks')
            .update({ status: 'running' })
            .eq('id', task.id);

          switch (task.type) {
            case 'email':
              if (task.id === 'google-sync') {
                const { data: lead } = await supabase
                  .from('leads')
                  .select('email, nome')
                  .eq('id', agendamento.lead_id)
                  .single();

                const participantes: string[] = [];
                if (lead?.email) {
                  participantes.push(lead.email as string);
                }

                const eventId = await createCalendarEvent(
                  {
                    titulo: `${agendamento.responsavel} · ${agendamento.area_juridica}`,
                    descricao: agendamento.observacoes || '',
                    data_hora: agendamento.data_hora,
                    participantes,
                  },
                  agendamento.id
                );
                if (eventId) {
                  await supabase
                    .from('agendamentos')
                    .update({ google_event_id: eventId })
                    .eq('id', agendamento.id)
                    .eq('tenant_id', agendamento.tenant_id);
                }
              } else {
                await createEmailInvite(agendamento, config);
              }
              break;

            case 'whatsapp':
              await createWhatsAppMessage(agendamento, config);
              break;

            case 'task':
              await createTask(agendamento, user.id);
              break;

            case 'reminder':
              await createReminders(agendamento, user.id);
              break;

            case 'drive_folder':
              await createDriveFolder(agendamento);
              break;

            default:
              throw new Error(`Unknown task type: ${String(task.type)}`);
          }

          // Update task status to completed
          await supabase
            .from('automation_tasks')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', task.id);

          return { task, status: 'fulfilled' };
        } catch (error) {
          // Update task status to failed
          await supabase
            .from('automation_tasks')
            .update({ 
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', task.id);

          return { task, status: 'rejected', error };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Track metrics
    trackMetric('automation_success_rate', (successful / (successful + failed)) * 100);
    trackMetric('automation_tasks_total', successful + failed);
    trackAction('automation_completed', {
      successful,
      failed,
      agendamentoId: agendamento.id,
    });

    // Show toast notification
    if (failed === 0) {
      toast({
        title: 'Automação concluída',
        description: `${successful} tarefas executadas com sucesso`,
      });
    } else if (successful > 0) {
      toast({
        title: 'Automação parcial',
        description: `${successful} tarefas executadas, ${failed} falharam`,
        variant: 'destructive',
      });
      
      // Log errors for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          captureError(result.reason, {
            component: 'useAgendaAutomation',
            action: 'automation_task_failed',
            metadata: {
              agendamentoId: agendamento.id,
              taskIndex: index.toString(),
            },
          });
        }
      });
    } else {
      toast({
        title: 'Falha na automação',
        description: 'Nenhuma tarefa pôde ser executada',
        variant: 'destructive',
      });
      
      captureError(new Error('All automation tasks failed'), {
        component: 'useAgendaAutomation',
        action: 'automation_complete_failure',
        metadata: {
          agendamentoId: agendamento.id,
        },
      });
    }

    return { successful, failed, results };
  }, [user?.id, createCalendarEvent, toast, captureError, trackAction, trackMetric]);

  const getAutomationStatus = useCallback(async (agendamentoId: string) => {
    const { data, error } = await supabase
      .from('automation_tasks')
      .select('*')
      .eq('payload->>agendamento_id', agendamentoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AutomationTask[];
  }, []);

  const retryFailedTask = useCallback(async (taskId: string) => {
    const { data: task } = await supabase
      .from('automation_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task || task.status !== 'failed') return;

    // Reset status to pending
    await supabase
      .from('automation_tasks')
      .update({ 
        status: 'pending',
        error: null,
        completed_at: null,
      })
      .eq('id', taskId);

    // Re-execute the task based on its type
    const agendamentoId = (task.payload as Record<string, unknown>)?.agendamento_id as string;
    if (!agendamentoId || !user?.id) {
      toast({
        title: 'Erro ao reexecutar',
        description: 'Dados insuficientes para reexecutar a tarefa',
        variant: 'destructive',
      });
      return;
    }

    const { data: agendamento } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', agendamentoId)
      .single();

    if (!agendamento) {
      toast({
        title: 'Erro ao reexecutar',
        description: 'Agendamento não encontrado',
        variant: 'destructive',
      });
      return;
    }

    try {
      await supabase
        .from('automation_tasks')
        .update({ status: 'running' })
        .eq('id', taskId);

      switch (task.type as AutomationTask['type']) {
        case 'email':
          await createEmailInvite(agendamento as Agendamento, { send_email_invite: true } as WorkflowConfig);
          break;
        case 'whatsapp':
          await createWhatsAppMessage(agendamento as Agendamento, { send_whatsapp: true } as WorkflowConfig);
          break;
        case 'task':
          await createTask(agendamento as Agendamento, user.id);
          break;
        case 'reminder':
          await createReminders(agendamento as Agendamento, user.id);
          break;
        case 'drive_folder':
          await createDriveFolder(agendamento as Agendamento);
          break;
        default:
          throw new Error(`Unknown task type: ${String(task.type)}`);
      }

      await supabase
        .from('automation_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      toast({
        title: 'Tarefa reexecutada',
        description: 'A tarefa foi concluída com sucesso',
      });
    } catch (error) {
      await supabase
        .from('automation_tasks')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', taskId);

      captureError(error instanceof Error ? error : new Error(String(error)), {
        component: 'useAgendaAutomation',
        action: 'retry_task_failed',
        metadata: { taskId, agendamentoId },
      });

      toast({
        title: 'Falha na reexecução',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [user?.id, toast, captureError]);

  return {
    runAutomation,
    getAutomationStatus,
    retryFailedTask,
  };
}
