/**
 * NovoAgendamentoForm — versão minimalista.
 *
 * Cria/edita agendamento diretamente em `agendamentos`. Se o usuário
 * tiver Google Calendar conectado (via google-calendar edge function),
 * cria o evento Calendar correspondente e salva o `google_event_id`.
 *
 * Removeu a dependência de `useAgendaAutomation` e do hook legacy
 * `useGoogleCalendar` — ambos compunham uma cadeia que jogava em runtime
 * dentro de `<Dialog>` quando este form renderizava (o ErrorBoundary
 * capturava sem stack trace visível ao usuário).
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('NovoAgendamento');

const agendamentoSchema = z.object({
  lead_id: z.string().min(1, 'Cliente é obrigatório'),
  area_juridica: z.string().min(2, 'Área jurídica é obrigatória'),
  responsavel: z.string().min(2, 'Responsável é obrigatório'),
  observacoes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface EditData {
  id: string;
  lead_id?: string | null;
  area_juridica?: string | null;
  data_hora?: string;
  responsavel?: string | null;
  observacoes?: string | null;
  status?: string | null;
}

interface NovoAgendamentoFormProps {
  onClose: () => void;
  editData?: EditData | null;
}

const AREAS_JURIDICAS = [
  'Direito Civil',
  'Direito Trabalhista',
  'Direito de Família',
  'Direito Previdenciário',
  'Direito Empresarial',
  'Direito Tributário',
  'Direito Imobiliário',
  'Direito do Consumidor',
];

const HORARIOS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

export const NovoAgendamentoForm: React.FC<NovoAgendamentoFormProps> = ({ onClose, editData }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const isEditing = !!editData?.id;

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      lead_id: editData?.lead_id ?? '',
      area_juridica: editData?.area_juridica ?? '',
      responsavel: editData?.responsavel ?? '',
      observacoes: editData?.observacoes ?? '',
    },
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    editData?.data_hora ? new Date(editData.data_hora) : undefined,
  );
  const [selectedTime, setSelectedTime] = useState(
    editData?.data_hora
      ? new Date(editData.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '',
  );

  // Listar leads do tenant pra select de cliente
  const { data: leads = [] } = useQuery<Array<{ id: string; nome: string; area_juridica: string | null; email: string | null }>>({
    queryKey: queryKeys.leads.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, area_juridica, email')
        .eq('tenant_id', tenantId)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Listar membros do tenant pra select de responsável
  const { data: membros = [] } = useQuery<Array<{ id: string; nome_completo: string | null; email: string }>>({
    queryKey: ['profiles', 'tenant', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .order('nome_completo');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome_completo: string | null; email: string }>;
    },
  });

  /** Sincroniza com Google Calendar (best-effort). Se não estiver conectado, ignora. */
  const syncToGoogleCalendar = async (params: {
    agendamentoId: string;
    titulo: string;
    descricao: string;
    dataHora: string;
    leadEmail: string | null;
  }): Promise<string | null> => {
    try {
      const start = new Date(params.dataHora);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const eventData: Record<string, unknown> = {
        summary: params.titulo,
        description: params.descricao,
        start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
      };
      if (params.leadEmail) {
        eventData.attendees = [{ email: params.leadEmail }];
      }

      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { method: 'createEvent', data: { calendarId: 'primary', eventData } },
      });

      if (error) {
        log.warn('Google Calendar sync skipped', { error: error.message });
        return null;
      }
      const eventId = (data as { event?: { id?: string } } | null)?.event?.id ?? null;
      return eventId;
    } catch (err) {
      log.warn('Google Calendar sync exception', { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  const createAgendamentoMutation = useMutation({
    mutationFn: async (data: AgendamentoFormData & { data_hora: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado');

      const titulo = `${data.area_juridica} - ${data.responsavel}`;
      const lead = leads.find((l) => l.id === data.lead_id);

      const payload = {
        tenant_id: tenantId,
        titulo,
        lead_id: data.lead_id || null,
        area_juridica: data.area_juridica,
        data_hora: data.data_hora,
        responsavel: data.responsavel,
        observacoes: data.observacoes || null,
      };

      let result: { id: string } | null;

      if (isEditing && editData?.id) {
        const { data: updated, error } = await supabase
          .from('agendamentos')
          .update(payload)
          .eq('id', editData.id)
          .eq('tenant_id', tenantId)
          .select('id')
          .single();
        if (error) throw error;
        result = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('agendamentos')
          .insert([{ ...payload, status: 'agendado' }])
          .select('id')
          .single();
        if (error) throw error;
        result = inserted;
      }

      // Best-effort: cria evento no Google Calendar do user logado.
      // Falha silencioso — não bloqueia o agendamento.
      if (result?.id && !isEditing) {
        const eventId = await syncToGoogleCalendar({
          agendamentoId: result.id,
          titulo,
          descricao: data.observacoes || '',
          dataHora: data.data_hora,
          leadEmail: lead?.email ?? null,
        });
        if (eventId) {
          await supabase
            .from('agendamentos')
            .update({ google_event_id: eventId })
            .eq('id', result.id)
            .eq('tenant_id', tenantId);
        }
      }

      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });
      toast({ title: isEditing ? 'Agendamento atualizado!' : 'Agendamento criado com sucesso!' });
      onClose();
    },
    onError: (err: unknown) => {
      log.error('Erro ao salvar agendamento', err);
      toast({
        title: 'Erro ao salvar agendamento',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AgendamentoFormData) => {
    if (!tenantId) {
      toast({ title: 'Tenant não encontrado. Refaça o login.', variant: 'destructive' });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast({ title: 'Selecione data e horário', variant: 'destructive' });
      return;
    }

    const [hour, minute] = selectedTime.split(':');
    const dateTime = new Date(selectedDate);
    dateTime.setHours(parseInt(hour ?? '0', 10), parseInt(minute ?? '0', 10), 0, 0);

    createAgendamentoMutation.mutate({ ...data, data_hora: dateTime.toISOString() });
  };

  const isPending = createAgendamentoMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }} className="space-y-4">
        <FormField
          control={form.control}
          name="lead_id"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Cliente</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={leads.length ? 'Selecione um cliente' : 'Nenhum lead cadastrado'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="area_juridica"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Área Jurídica</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área jurídica" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AREAS_JURIDICAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data da Reunião</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground',
                  )}
                  disabled={isPending}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent>
                {HORARIOS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <FormField
          control={form.control}
          name="responsavel"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Advogado Responsável</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={membros.length ? 'Selecione o responsável' : 'Nenhum membro cadastrado'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {membros.map((m) => {
                    const nome = m.nome_completo || m.email;
                    return (
                      <SelectItem key={m.id} value={nome}>
                        {nome}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações sobre a reunião (opcional)"
                  rows={3}
                  disabled={isPending}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Agendar'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
