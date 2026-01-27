import React from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NovoAgendamentoFormData {
  lead_id: string;
  area_juridica: string;
  data_hora: string;
  responsavel: string;
  observacoes?: string;
}

interface NovoAgendamentoFormProps {
  onClose: () => void;
}

export const NovoAgendamentoForm = ({ onClose }: NovoAgendamentoFormProps) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedTime, setSelectedTime] = React.useState('');
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<NovoAgendamentoFormData>({
    defaultValues: {
      lead_id: '',
      area_juridica: '',
      data_hora: '',
      responsavel: '',
      observacoes: ''
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, area_juridica')
        .eq('tenant_id', tenantId)
        .order('nome');

      if (error) throw error;
      return data;
    }
  });

  const createAgendamentoMutation = useMutation({
    mutationFn: async (data: NovoAgendamentoFormData) => {
      const { error } = await supabase
        .from('agendamentos')
        .insert([
          {
            tenant_id: tenantId,
            lead_id: data.lead_id || null,
            area_juridica: data.area_juridica,
            data_hora: data.data_hora,
            status: 'agendado',
            responsavel: data.responsavel,
            observacoes: data.observacoes || null,
            google_event_id: null,
          },
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Agendamento criado com sucesso!');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao criar agendamento');
    }
  });

  const onSubmit = (data: NovoAgendamentoFormData) => {
    if (!tenantId) {
      toast.error('Tenant não encontrado. Refaça o login.');
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error('Por favor, selecione data e horário');
      return;
    }

    const [hour, minute] = selectedTime.split(':');
    const dateTime = new Date(selectedDate);
    dateTime.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);

    const agendamentoData = {
      ...data,
      data_hora: dateTime.toISOString()
    };

    createAgendamentoMutation.mutate(agendamentoData);
  };

  const areasJuridicas = [
    'Direito Civil',
    'Direito Trabalhista',
    'Direito de Família',
    'Direito Previdenciário',
    'Direito Empresarial',
    'Direito Tributário',
    'Direito Imobiliário',
    'Direito do Consumidor'
  ];

  const responsaveis = [
    'Dr. Silva',
    'Dra. Oliveira',
    'Dr. Santos',
    'Dra. Costa',
    'Dr. Pereira'
  ];

  const horarios = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('lead_id', { required: true })} />
      <input type="hidden" {...register('area_juridica', { required: true })} />
      <input type="hidden" {...register('responsavel', { required: true })} />

      <div className="space-y-2">
        <Label htmlFor="lead_id">Cliente</Label>
        <Select onValueChange={(value) => setValue('lead_id', value, { shouldValidate: true })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {leads.map((lead) => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.lead_id && <p className="text-red-500 text-sm">Cliente é obrigatório</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="area_juridica">Área Jurídica</Label>
        <Select onValueChange={(value) => setValue('area_juridica', value, { shouldValidate: true })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a área jurídica" />
          </SelectTrigger>
          <SelectContent>
            {areasJuridicas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.area_juridica && <p className="text-red-500 text-sm">Área jurídica é obrigatória</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data da Reunião</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
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
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent>
              {horarios.map((horario) => (
                <SelectItem key={horario} value={horario}>
                  {horario}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsavel">Advogado Responsável</Label>
        <Select onValueChange={(value) => setValue('responsavel', value, { shouldValidate: true })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o responsável" />
          </SelectTrigger>
          <SelectContent>
            {responsaveis.map((responsavel) => (
              <SelectItem key={responsavel} value={responsavel}>
                {responsavel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.responsavel && <p className="text-red-500 text-sm">Responsável é obrigatório</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          {...register('observacoes')}
          placeholder="Observações sobre a reunião (opcional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
          Agendar
        </Button>
      </div>
    </form>
  );
};
