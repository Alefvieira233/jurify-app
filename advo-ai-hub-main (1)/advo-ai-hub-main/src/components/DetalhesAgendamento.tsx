
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone, Mail, FileText, MapPin } from 'lucide-react';
import GoogleCalendarSync from './GoogleCalendarSync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface AgendamentoDetalhes {
  id: string;
  lead_id: string;
  area_juridica: string;
  data_hora: string;
  responsavel: string;
  status: string;
  observacoes?: string;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
  lead?: {
    nome_completo?: string;
    nome?: string;
    telefone?: string;
    email?: string;
  };
}

interface DetalhesAgendamentoProps {
  agendamento: AgendamentoDetalhes;
  onClose: () => void;
}

export const DetalhesAgendamento = ({ agendamento, onClose }: DetalhesAgendamentoProps) => {
  const { settings, createCalendarEvent } = useGoogleCalendar();
  const [syncingToGoogle, setSyncingToGoogle] = useState(false);

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: 'Agendado', className: 'bg-blue-100 text-blue-800' },
      confirmado: { label: 'Confirmado', className: 'bg-yellow-100 text-yellow-800' },
      realizado: { label: 'Realizado', className: 'bg-green-100 text-green-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleSyncToGoogle = async () => {
    if (!settings?.calendar_enabled || agendamento.google_event_id) return;

    setSyncingToGoogle(true);
    
    try {
      const startDate = new Date(agendamento.data_hora);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

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

      await createCalendarEvent(eventData, agendamento.id);
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
    } finally {
      setSyncingToGoogle(false);
    }
  };

  const dateTime = formatDateTime(agendamento.data_hora);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Reunião - {agendamento.lead?.nome_completo || agendamento.lead?.nome}
        </h2>
        {getStatusBadge(agendamento.status)}
      </div>

      {/* Informações do Cliente */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <User className="h-4 w-4 mr-2" />
          Informações do Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nome Completo</p>
            <p className="font-medium">{agendamento.lead?.nome_completo || agendamento.lead?.nome}</p>
          </div>
          {agendamento.lead?.telefone && (
            <div>
              <p className="text-sm text-gray-600 flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                Telefone
              </p>
              <p className="font-medium">{agendamento.lead.telefone}</p>
            </div>
          )}
          {agendamento.lead?.email && (
            <div>
              <p className="text-sm text-gray-600 flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                E-mail
              </p>
              <p className="font-medium">{agendamento.lead.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Informações da Reunião */}
      <div className="bg-amber-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          Detalhes da Reunião
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Data</p>
            <p className="font-medium capitalize">{dateTime.date}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Horário
            </p>
            <p className="font-medium">{dateTime.time}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Área Jurídica</p>
            <p className="font-medium">{agendamento.area_juridica}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Responsável</p>
            <p className="font-medium">{agendamento.responsavel}</p>
          </div>
        </div>
      </div>

      {/* Observações */}
      {agendamento.observacoes && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Observações
          </h3>
          <p className="text-gray-700">{agendamento.observacoes}</p>
        </div>
      )}

      {/* Google Calendar Integration */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2 flex items-center">
          <MapPin className="h-4 w-4 mr-2" />
          Integração Google Calendar
        </h3>
        {agendamento.google_event_id ? (
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800">Sincronizado</Badge>
            <p className="text-sm text-gray-600">ID: {agendamento.google_event_id}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Reunião não sincronizada com Google Calendar</p>
            {settings?.calendar_enabled ? (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSyncToGoogle}
                disabled={syncingToGoogle}
              >
                {syncingToGoogle ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            ) : (
              <p className="text-xs text-gray-500">
                Habilite a integração nas configurações
              </p>
            )}
          </div>
        )}
      </div>

      {/* Informações de Sistema */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Criado em: {new Date(agendamento.created_at).toLocaleString('pt-BR')}</p>
        <p>Atualizado em: {new Date(agendamento.updated_at).toLocaleString('pt-BR')}</p>
        <p>ID: {agendamento.id}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button className="bg-amber-500 hover:bg-amber-600">
          Editar Agendamento
        </Button>
      </div>
    </div>
  );
};
