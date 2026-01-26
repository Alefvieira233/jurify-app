
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
}

interface GerenciarPermissoesFormProps {
  usuario: Usuario;
  onClose: () => void;
}

const roles = [
  { value: 'administrador', label: 'Administrador', color: 'bg-red-100 text-red-800' },
  { value: 'advogado', label: 'Advogado', color: 'bg-blue-100 text-blue-800' },
  { value: 'comercial', label: 'Comercial', color: 'bg-green-100 text-green-800' },
  { value: 'pos_venda', label: 'Pós-venda', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'suporte', label: 'Suporte', color: 'bg-gray-100 text-gray-800' }
];

const GerenciarPermissoesForm = ({ usuario, onClose }: GerenciarPermissoesFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['user-roles', usuario.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, ativo')
        .eq('user_id', usuario.id);

      if (error) throw error;
      
      const activeRoles = data.filter(r => r.ativo).map(r => r.role);
      setSelectedRoles(activeRoles);
      
      return data;
    }
  });

  const updateRolesMutation = useMutation({
    mutationFn: async (newRoles: string[]) => {
      // Primeiro, desativar todas as roles atuais
      const { error: deactivateError } = await supabase
        .from('user_roles')
        .update({ ativo: false })
        .eq('user_id', usuario.id);

      if (deactivateError) throw deactivateError;

      // Em seguida, inserir/ativar as novas roles
      if (newRoles.length > 0) {
        const rolesToInsert = newRoles.map(role => ({
          user_id: usuario.id,
          role: role as any,
          ativo: true
        }));

        const { error: upsertError } = await supabase
          .from('user_roles')
          .upsert(rolesToInsert, { 
            onConflict: 'user_id,role',
            ignoreDuplicates: false 
          });

        if (upsertError) throw upsertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', usuario.id] });
      toast({
        title: "Permissões atualizadas",
        description: "As permissões do usuário foram atualizadas com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissões.",
        variant: "destructive",
      });
      console.error('Erro ao atualizar permissões:', error);
    }
  });

  const handleRoleChange = (roleValue: string, checked: boolean) => {
    setSelectedRoles(prev => 
      checked 
        ? [...prev, roleValue]
        : prev.filter(r => r !== roleValue)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRolesMutation.mutate(selectedRoles);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Carregando permissões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Usuário: {usuario.nome_completo}</h3>
        <p className="text-sm text-gray-600">{usuario.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Papéis no Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={(checked) => handleRoleChange(role.value, checked as boolean)}
                    />
                    <div>
                      <Label htmlFor={role.value} className="text-sm font-medium cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  </div>
                  <Badge className={role.color}>
                    {role.label}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-amber-500 hover:bg-amber-600"
                disabled={updateRolesMutation.isPending}
              >
                {updateRolesMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição dos Papéis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Administrador:</strong> Acesso total ao sistema, incluindo gerenciamento de usuários e configurações</p>
            <p><strong>Advogado:</strong> Acesso completo a leads, contratos e agendamentos</p>
            <p><strong>Comercial:</strong> Foco em leads e vendas, com acesso limitado a contratos</p>
            <p><strong>Pós-venda:</strong> Especializado em agendamentos e acompanhamento de contratos</p>
            <p><strong>Suporte:</strong> Acesso apenas para visualização e suporte aos usuários</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GerenciarPermissoesForm;
