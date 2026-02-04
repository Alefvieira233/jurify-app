import React, { useEffect } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AgendamentoData {
  id: string;
  data_hora: string;
  responsavel: string;
  area_juridica: string;
  observacoes?: string;
  google_event_id?: string;
  lead?: {
    nome_completo?: string;
    nome?: string;
    email?: string;
    telefone?: string;
  };
}

interface GoogleCalendarSyncProps {
  agendamento: AgendamentoData;
  action: 'create' | 'update' | 'delete';
  onComplete?: (success: boolean) => void;
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  agendamento,
  action,
  onComplete
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    settings,
    loadSettings
  } = useGoogleCalendar();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings?.calendar_enabled || !user?.id) return;

    const syncEvent = async () => {
      try {
        const startDate = new Date(agendamento.data_hora);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora de duração

        const eventData = {
          summary: `Reunião - ${agendamento.lead?.nome_completo || agendamento.lead?.nome || 'Cliente'}`,
          description: `
Área Jurídica: ${agendamento.area_juridica}
Responsável: ${agendamento.responsavel}
${agendamento.observacoes ? `\nObservações: ${agendamento.observacoes}` : ''}
${agendamento.lead?.telefone ? `\nTelefone: ${agendamento.lead.telefone}` : ''}

Agendamento criado via Jurify
          `.trim(),
          start: {
            dateTime: startDate.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          attendees: agendamento.lead?.email ? [
            { email: agendamento.lead.email }
          ] : undefined
        };

        let success = false;

        switch (action) {
          case 'create':
            await createCalendarEvent(eventData, agendamento.id);
            success = true;
            break;

          case 'update':
            if (agendamento.google_event_id) {
              await updateCalendarEvent(agendamento.google_event_id, eventData, agendamento.id);
              success = true;
            }
            break;

          case 'delete':
            if (agendamento.google_event_id) {
              await deleteCalendarEvent(agendamento.google_event_id, agendamento.id);
              success = true;
            }
            break;
        }

        onComplete?.(success);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível sincronizar com o Google Calendar.';
        console.error('Error syncing with Google Calendar:', error);
        // Mostrar erro de sincronização no UI.
        toast({
          title: 'Erro na sincronização',
          description: message,
          variant: 'destructive',
        });
        onComplete?.(false);
      }
    };

    void syncEvent();
  }, [
    agendamento,
    action,
    settings,
    user?.id,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    onComplete,
    toast
  ]);

  return null; // Este componente não renderiza nada visualmente
};

export default GoogleCalendarSync;
