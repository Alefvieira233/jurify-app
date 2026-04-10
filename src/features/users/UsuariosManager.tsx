import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash, ShieldAlert, Users, ExternalLink, UserPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileCard } from '@/components/ui/MobileCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NovoUsuarioForm from './components/NovoUsuarioForm';
import EditarUsuarioForm from './components/EditarUsuarioForm';
import GerenciarPermissoesForm from './components/GerenciarPermissoesForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getAvatarHex, getInitials } from '@/utils/formatting';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

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

const getRoleBadgeConfig = (role: string) => {
  const configs: Record<string, { bg: string, text: string, label: string }> = {
    administrador: { bg: 'bg-red-500/10 hover:bg-red-500/20', text: 'text-red-500', label: 'Admin' },
    advogado:      { bg: 'bg-blue-500/10 hover:bg-blue-500/20', text: 'text-blue-500', label: 'Advogado' },
    comercial:     { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-500', label: 'Comercial' },
    pos_venda:     { bg: 'bg-amber-500/10 hover:bg-amber-500/20', text: 'text-amber-500', label: 'Pós-venda' },
    suporte:       { bg: 'bg-slate-500/10 hover:bg-slate-500/20', text: 'text-slate-500', label: 'Suporte' }
  };
  return configs[role] || { bg: 'bg-muted/50', text: 'text-muted-foreground', label: role };
};

const UsuariosManager = () => {
  usePageTitle('Equipe');
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isNovoUsuarioOpen, setIsNovoUsuarioOpen] = useState(false);
  const [isEditarUsuarioOpen, setIsEditarUsuarioOpen] = useState(false);
  const [isPermissoesOpen, setIsPermissoesOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: '', nome: '' });

  const { can, canDeleteUsers, userRole } = useRBAC();
  const canViewUsers = can('usuarios', 'read');
  const canCreate = can('usuarios', 'create');

  const { data: usuarios = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.usuarios.all,
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`*, user_roles(role, ativo)`)
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
      if (!canDeleteUsers) throw new Error('Sem permissão para desativar usuários');
      if (!profile?.tenant_id) throw new Error('Tenant não encontrado');
      
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', userId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all });
      toast({ title: "Membro desativado", description: "O acesso deste usuário foi revogado." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao desativar membro.", variant: "destructive" });
    }
  });

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u =>
      u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuarios, searchTerm]);

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState title="Erro ao carregar usuários" onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500">
          <ShieldAlert className="h-5 w-5" />
          <AlertDescription className="ml-2 font-medium">
            Acesso Restrito: Você não tem permissões suficientes para visualizar a equipe.
            <br />
            <span className="text-xs opacity-80 font-mono mt-1 block">Nível atual: {userRole}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Premium (Lex Obsidian) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" />
            Gestão de Agentes
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Equipe & Permissões
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Convide advogados e parceiros, defina os níveis de acesso (RBAC) e gerencie o time de atendimento da operação.
          </p>
        </div>
        {canCreate && (
          <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
                <Plus className="h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl bg-background/95 backdrop-blur-xl border-border/10">
              <DialogHeader>
                <DialogTitle className="text-xl">Convidar Novo Integrante</DialogTitle>
              </DialogHeader>
              <NovoUsuarioForm onClose={() => setIsNovoUsuarioOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dashboard Metrics / Quick Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membro por nome, e-mail ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
          />
        </div>
        <div className="flex items-center gap-4 px-4 sm:min-w-[280px] justify-around">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p>
            <p className="text-xl font-black">{usuarios.length}</p>
          </div>
          <div className="w-px h-8 bg-border/20"></div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Ativos</p>
            <p className="text-xl font-black text-emerald-500">
              {usuarios.filter(u => u.ativo).length}
            </p>
          </div>
          <div className="w-px h-8 bg-border/20"></div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Inativos</p>
            <p className="text-xl font-black text-red-500">
              {usuarios.filter(u => !u.ativo).length}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Membros */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-[24px]" />)}
        </div>
      ) : filteredUsuarios.length === 0 ? (
        <EmptyState
          icon={searchTerm ? Search : UserPlus}
          title="Nenhum membro encontrado"
          description={searchTerm
            ? 'Nenhum integrante da equipe bate com a sua pesquisa atual.'
            : 'Convide o primeiro membro para a plataforma e delegue os atendimentos.'}
          action={searchTerm
            ? { label: 'Limpar busca', onClick: () => setSearchTerm('') }
            : { label: 'Convidar Membro', onClick: () => setIsNovoUsuarioOpen(true) }}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredUsuarios.map((usuario) => {
            const activeRoles = usuario.user_roles?.filter(r => r.ativo) || [];
            return (
              <MobileCard
                key={usuario.id}
                title={usuario.nome_completo}
                subtitle={usuario.email}
                badge={
                  activeRoles.length > 0 ? (
                    <div className="flex gap-1">
                      {activeRoles.map(ur => {
                        const cfg = getRoleBadgeConfig(ur.role);
                        return (
                          <span key={ur.role} className={`px-2 py-[2px] rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        );
                      })}
                    </div>
                  ) : undefined
                }
                details={[
                  { label: 'Cargo', value: usuario.cargo || 'Indefinido' },
                  { label: 'Status', value: usuario.ativo ? 'Ativo' : 'Inativo' },
                  { label: 'Último acesso', value: usuario.data_ultimo_acesso
                    ? new Date(usuario.data_ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'Nunca logou' },
                ]}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        Ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedUser(usuario); setIsEditarUsuarioOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" /> Editar Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedUser(usuario); setIsPermissoesOpen(true); }}>
                        <ShieldAlert className="h-4 w-4 mr-2" /> Acessos (RBAC)
                      </DropdownMenuItem>
                      {usuario.ativo && canDeleteUsers && (
                        <DropdownMenuItem onClick={() => setConfirmDeactivate({ open: true, id: usuario.id, nome: usuario.nome_completo })} className="text-red-500">
                          <Trash className="h-4 w-4 mr-2" /> Revogar Acesso
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsuarios.map((usuario) => {
            const avatarColor = getAvatarHex(usuario.nome_completo);
            const initials = getInitials(usuario.nome_completo);
            const activeRoles = usuario.user_roles?.filter(r => r.ativo) || [];

            return (
              <div
                key={usuario.id}
                className={`group relative bg-background border border-border/10 rounded-[24px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 ${!usuario.ativo && 'opacity-60 grayscale'}`}
              >
                {/* Visual Flair */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border/20 to-transparent"></div>

                <div className="flex items-start justify-between mb-5 relative">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-background z-10" style={{ backgroundColor: avatarColor }}>
                    {initials}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative z-20 shrink-0">
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">Ações do usuário</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-[12px]">
                      <DropdownMenuItem onClick={() => { setSelectedUser(usuario); setIsEditarUsuarioOpen(true); }} className="rounded-[8px] cursor-pointer">
                        <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                        Editar Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedUser(usuario); setIsPermissoesOpen(true); }} className="rounded-[8px] cursor-pointer">
                        <ShieldAlert className="h-4 w-4 mr-2 text-primary" />
                        Acessos (RBAC)
                      </DropdownMenuItem>
                      {usuario.ativo && canDeleteUsers && (
                        <DropdownMenuItem onClick={() => setConfirmDeactivate({ open: true, id: usuario.id, nome: usuario.nome_completo })} className="text-red-500 focus:text-red-500 rounded-[8px] cursor-pointer mt-1">
                          <Trash className="h-4 w-4 mr-2" />
                          Revogar Acesso
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1">
                  <h2 className="font-bold text-foreground text-lg leading-tight truncate" title={usuario.nome_completo}>
                    {usuario.nome_completo}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground truncate" title={usuario.email}>
                    {usuario.email}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {usuario.cargo || 'Cargo indefinido'}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                    {activeRoles.length > 0 ? (
                      activeRoles.map(ur => {
                        const cfg = getRoleBadgeConfig(ur.role);
                        return (
                          <span key={ur.role} className={`px-2 py-[2px] rounded-md text-[10px] font-bold uppercase tracking-wider border border-border/5 ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 italic">Sem permissoes vinculadas</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/5 pt-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3" />
                      Acesso
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {usuario.data_ultimo_acesso
                        ? new Date(usuario.data_ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : 'Nunca logou'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editing Dialogs */}
      <Dialog open={isEditarUsuarioOpen} onOpenChange={setIsEditarUsuarioOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl bg-background/95 backdrop-blur-xl border-border/10">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Perfil</DialogTitle>
          </DialogHeader>
          {selectedUser && <EditarUsuarioForm usuario={selectedUser} onClose={() => setIsEditarUsuarioOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissoesOpen} onOpenChange={setIsPermissoesOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl bg-background/95 backdrop-blur-xl border-border/10">
          <DialogHeader>
            <DialogTitle className="text-xl">Matriz de Permissões (RBAC)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Defina quais módulos o usuário <b className="text-foreground">{selectedUser?.nome_completo}</b> pode acessar. Alterações entram em vigor imediatamente.
          </p>
          {selectedUser && <GerenciarPermissoesForm usuario={selectedUser} onClose={() => setIsPermissoesOpen(false)} />}
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <ConfirmDialog
        open={confirmDeactivate.open}
        onOpenChange={(v) => setConfirmDeactivate(prev => ({ ...prev, open: v }))}
        title="Revogar Acesso da Plataforma"
        description={`O usuário "${confirmDeactivate.nome}" perderá imediatamente o acesso. Todos os dados históricos e leads continuarão salvos e atribuídos a ele até que você os redistribua.`}
        onConfirm={() => {
          deleteMutation.mutate(confirmDeactivate.id);
          setConfirmDeactivate({ open: false, id: '', nome: '' });
        }}
        destructive
      />
    </div>
  );
};

export default UsuariosManager;
