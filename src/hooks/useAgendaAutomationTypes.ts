/**
 * Shared types for the agenda automation cluster.
 *
 * Extracted to break the cycle:
 *   useAgendaAutomation → useAgendaTasks → useAgendaAutomation (for WorkflowConfig)
 *
 * Audit P1 O2.1.
 */

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
