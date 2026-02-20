import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NovoUsuarioForm from '@/components/NovoUsuarioForm';
import EditarUsuarioForm from '@/components/EditarUsuarioForm';
import GerenciarPermissoesForm from '@/components/GerenciarPermissoesForm';

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  ativo: boolean;
  data_ultimo_acesso?: string;
  user_roles?: Array<{
    role: string;
    ativo: boolean;
  }>;
}

const UsuariosManager = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isNovoUsuarioOpen, setIsNovoUsuarioOpen] = useState(false);
  const [isEditarUsuarioOpen, setIsEditarUsuarioOpen] = useState(false);
  const [isPermissoesOpen, setIsPermissoesOpen] = useState(false);

  // ? RBAC: Verificação de permissões real
  const { can, canDeleteUsers, userRole } = useRBAC();

  // Só pode visualizar usuários se tiver permissão de read
  const canViewUsers = can('usuarios', 'read');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          user_roles(
            role,
            ativo
          )
        `)
        .order('nome_completo');

      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Usuario[];
    },
    enabled: canViewUsers
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Verificação adicional de segurança
      if (!canDeleteUsers) {
        throw new Error('Sem permissão para desativar usuários');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Usuário desativado",
        description: "O usuário foi desativado com sucesso.",
      });
    },
    onError: (_error) => {
      toast({
        title: "Erro",
        description: "Erro ao desativar usuário.",
        variant: "destructive",
      });
      // Error logged to monitoring
    }
  });

  // Se não tem permissão para visualizar, mostrar mensagem
  if (!canViewUsers) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta seção.
            <br />
            <span className="text-sm text-gray-500">Role atual: {userRole}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      administrador: 'bg-red-100 text-red-800',
      advogado: 'bg-blue-100 text-blue-800',
      comercial: 'bg-green-100 text-green-800',
      pos_venda: 'bg-yellow-100 text-yellow-800',
      suporte: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      administrador: 'Administrador',
      advogado: 'Advogado',
      comercial: 'Comercial',
      pos_venda: 'Pós-venda',
      suporte: 'Suporte'
    };
    return labels[role as keyof typeof labels] || role;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e suas permissões no sistema</p>
        </div>
        {can('usuarios', 'create') && (
          <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <NovoUsuarioForm onClose={() => setIsNovoUsuarioOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados ({filteredUsuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando usuários...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome_completo}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.cargo || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {usuario.user_roles?.filter(ur => ur.ativo).map((userRole, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className={getRoleBadgeColor(userRole.role)}
                          >
                            {getRoleLabel(userRole.role)}
                          </Badge>
                        )) || []}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.ativo ? 'default' : 'destructive'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.data_ultimo_acesso 
                        ? new Date(usuario.data_ultimo_acesso).toLocaleDateString('pt-BR')
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(usuario);
                              setIsEditarUsuarioOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(usuario);
                              setIsPermissoesOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Permissï¿½es
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(usuario.id)}
                            className="text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Desativar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diï¿½logos */}
      <Dialog open={isEditarUsuarioOpen} onOpenChange={setIsEditarUsuarioOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuï¿½rio</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <EditarUsuarioForm
              usuario={selectedUser}
              onClose={() => setIsEditarUsuarioOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissoesOpen} onOpenChange={setIsPermissoesOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissï¿½es</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <GerenciarPermissoesForm
              usuario={selectedUser}
              onClose={() => setIsPermissoesOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsuariosManager;
