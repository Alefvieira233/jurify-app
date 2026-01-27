
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';

type NotificationType = 'info' | 'sucesso' | 'alerta' | 'erro';

interface CreateNotificationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateNotificationForm = ({ onSuccess, onCancel }: CreateNotificationFormProps) => {
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'info' as NotificationType
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.mensagem) {
      return;
    }

    setLoading(true);
    try {
      await createNotification(formData.titulo, formData.mensagem, formData.tipo);
      
      // Limpar formulário
      setFormData({
        titulo: '',
        mensagem: '',
        tipo: 'info'
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Notificação</CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Título
            </label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Digite o título da notificação"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Tipo
            </label>
            <Select
              value={formData.tipo}
              onValueChange={(value: NotificationType) => 
                setFormData(prev => ({ ...prev, tipo: value }))
              }
            >
              <SelectTrigger className="bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="sucesso">Sucesso</SelectItem>
                <SelectItem value="alerta">Alerta</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Mensagem
            </label>
            <Textarea
              value={formData.mensagem}
              onChange={(e) => setFormData(prev => ({ ...prev, mensagem: e.target.value }))}
              placeholder="Digite a mensagem da notificação"
              rows={4}
              required
            />
          </div>

          <div className="flex space-x-3">
            <Button type="submit" disabled={loading} className="flex-1 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
              {loading ? 'Criando...' : 'Criar Notificação'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateNotificationForm;

