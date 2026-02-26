/**
 * QuickAddModal — Modal rápido para criar agendamento inline
 * 
 * Aparece com clique simples no calendário
 * Formulário mínimo: título + horário
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  onSuccess?: () => void;
}

export const QuickAddModal = ({ open, onClose, date, onSuccess }: QuickAddModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;

  const [formData, setFormData] = useState({
    title: '',
    area_juridica: '',
    responsavel: '',
    observacoes: '',
    duration: 60, // minutos
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId || !date) throw new Error('Dados inválidos');

      const startDateTime = new Date(date);

      const { data: result, error } = await supabase
        .from('agendamentos')
        .insert({
          tenant_id: tenantId,
          lead_id: null, // Quick add sem lead inicialmente
          area_juridica: data.area_juridica || 'Consulta',
          data_hora: startDateTime.toISOString(),
          status: 'agendado',
          responsavel: data.responsavel || 'A definir',
          observacoes: data.observacoes || null,
          google_event_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento criado',
        description: 'Evento adicionado ao calendário',
      });
      setFormData({
        title: '',
        area_juridica: '',
        responsavel: '',
        observacoes: '',
        duration: 60,
      });
      onClose();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o agendamento',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe um título para o agendamento',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const areasJuridicas = [
    'Direito Civil',
    'Direito Trabalhista',
    'Direito de Família',
    'Direito Previdenciário',
    'Direito Empresarial',
    'Direito Tributário',
    'Direito Imobiliário',
    'Consulta',
  ];

  const responsaveis = [
    'Dr. Silva',
    'Dra. Oliveira',
    'Dr. Santos',
    'Dra. Costa',
    'Dr. Pereira',
    'A definir',
  ];

  const durations = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' },
  ];

  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Novo Agendamento Rápido
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Data e Horário
            </div>
            <div className="font-medium">
              {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(date, 'HH:mm')} - {format(new Date(date.getTime() + formData.duration * 60000), 'HH:mm')}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              placeholder="Ex: Consulta inicial"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Area Juridica */}
          <div>
            <label className="text-sm font-medium">Área Jurídica</label>
            <Select
              value={formData.area_juridica}
              onValueChange={(value) => setFormData({ ...formData, area_juridica: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {areasJuridicas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsavel */}
          <div>
            <label className="text-sm font-medium">Responsável</label>
            <Select
              value={formData.responsavel}
              onValueChange={(value) => setFormData({ ...formData, responsavel: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {responsaveis.map((resp) => (
                  <SelectItem key={resp} value={resp}>
                    {resp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium">Duração</label>
            <Select
              value={formData.duration.toString()}
              onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((dur) => (
                  <SelectItem key={dur.value} value={dur.value.toString()}>
                    {dur.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observacoes */}
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Criar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddModal;
