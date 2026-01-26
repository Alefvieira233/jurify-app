
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NovoUsuarioFormProps {
  onClose: () => void;
}

const roles = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'advogado', label: 'Advogado' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'pos_venda', label: 'PÃ³s-venda' },
  { value: 'suporte', label: 'Suporte' }
];

const NovoUsuarioForm = ({ onClose }: NovoUsuarioFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nomeCompleto: '',
    telefone: '',
    cargo: '',
    departamento: '',
    selectedRoles: [] as string[]
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: data.email,
          password: data.password,
          nome_completo: data.nomeCompleto,
          telefone: data.telefone,
          cargo: data.cargo,
          departamento: data.departamento,
          roles: data.selectedRoles,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar usuario');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao criar usuario');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "UsuÃ¡rio criado",
        description: "O usuÃ¡rio foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuÃ¡rio.",
        variant: "destructive",
      });
      console.error('Erro ao criar usuÃ¡rio:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedRoles.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um papel para o usuÃ¡rio.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleRoleChange = (roleValue: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: checked 
        ? [...prev.selectedRoles, roleValue]
        : prev.selectedRoles.filter(r => r !== roleValue)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nomeCompleto">Nome Completo *</Label>
          <Input
            id="nomeCompleto"
            value={formData.nomeCompleto}
            onChange={(e) => setFormData({...formData, nomeCompleto: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="MÃ­nimo 6 caracteres"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formData.telefone}
            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo</Label>
          <Input
            id="cargo"
            value={formData.cargo}
            onChange={(e) => setFormData({...formData, cargo: e.target.value})}
            placeholder="Ex: Advogado SÃªnior"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departamento">Departamento</Label>
          <Input
            id="departamento"
            value={formData.departamento}
            onChange={(e) => setFormData({...formData, departamento: e.target.value})}
            placeholder="Ex: JurÃ­dico"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>PapÃ©is no Sistema *</Label>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.value} className="flex items-center space-x-2">
              <Checkbox
                id={role.value}
                checked={formData.selectedRoles.includes(role.value)}
                onCheckedChange={(checked) => handleRoleChange(role.value, checked as boolean)}
              />
              <Label htmlFor={role.value} className="text-sm font-normal">
                {role.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="bg-amber-500 hover:bg-amber-600"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Criando...' : 'Criar UsuÃ¡rio'}
        </Button>
      </div>
    </form>
  );
};

export default NovoUsuarioForm;


