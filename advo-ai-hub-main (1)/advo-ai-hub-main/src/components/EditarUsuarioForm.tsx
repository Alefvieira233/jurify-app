import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  ativo: boolean;
}

interface EditarUsuarioFormProps {
  usuario: Usuario;
  onClose: () => void;
}

const EditarUsuarioForm = ({ usuario, onClose }: EditarUsuarioFormProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome_completo: usuario.nome_completo,
    email: usuario.email,
    telefone: usuario.telefone || '',
    cargo: usuario.cargo || '',
    departamento: usuario.departamento || '',
    ativo: usuario.ativo
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId) throw new Error('Tenant nao encontrado');
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('tenant_id', tenantId)
        .eq('id', usuario.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Usuario atualizado',
        description: 'Os dados do usuario foram atualizados com sucesso.'
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar usuario.',
        variant: 'destructive',
      });
      console.error('Erro ao atualizar usuario:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome_completo">Nome Completo *</Label>
          <Input
            id="nome_completo"
            value={formData.nome_completo}
            onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo</Label>
          <Input
            id="cargo"
            value={formData.cargo}
            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
            placeholder="Ex: Advogado Senior"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="departamento">Departamento</Label>
        <Input
          id="departamento"
          value={formData.departamento}
          onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
          placeholder="Ex: Juridico"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="ativo"
          checked={formData.ativo}
          onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
        />
        <Label htmlFor="ativo">Usuario ativo</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-amber-500 hover:bg-amber-600"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
        </Button>
      </div>
    </form>
  );
};

export default EditarUsuarioForm;