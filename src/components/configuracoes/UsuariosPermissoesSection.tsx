import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  ShieldAlert,
  Trash,
  Columns3,
  ShieldCheck,
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import NovoUsuarioForm from '@/components/NovoUsuarioForm';
import EditarUsuarioForm from '@/components/EditarUsuarioForm';
import GerenciarPermissoesForm from '@/components/GerenciarPermissoesForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useToast } from '@/hooks/use-toast';
import { getAvatarHex, getInitials } from '@/utils/formatting';

interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  ativo: boolean;
  user_roles?: Array<{ role: string; ativo: boolean }>;
}

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    administrador: 'Admin',
    advogado: 'Advogado',
    comercial: 'Comercial',
    pos_venda: 'Pós-venda',
    suporte: 'Suporte',
  };
  return map[role] || role;
};

const UsuariosPermissoesSection = () => {
  const { profile } = useAuth();
  const { isAdmin, canDeleteUsers, can } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isNovoOpen, setIsNovoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [isMatrizOpen, setIsMatrizOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Membro | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ open: boolean; id: string; nome: string }>(
    { open: false, id: '', nome: '' }
  );

  const canViewUsers = can('usuarios', 'read');
  const canCreate = can('usuarios', 'create');
  const tenantId = profile?.tenant_id ?? null;

  const { data: membros = [], isLoading } = useQuery<Membro[]>({
    queryKey: ['configuracoes-membros', tenantId],
    enabled: !!tenantId && canViewUsers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email, telefone, cargo, departamento, ativo, user_roles(role, ativo)')
        .eq('tenant_id', tenantId)
        .order('nome_completo');
      if (error) throw error;
      return (data ?? []) as Membro[];
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!canDeleteUsers) throw new Error('Sem permissão');
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', userId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['configuracoes-membros'] });
      toast({ title: 'Membro desativado', description: 'O acesso foi revogado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Falha ao desativar membro.', variant: 'destructive' });
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return membros.filter((m) => {
      if (!q) return true;
      return (
        m.nome_completo?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        (m.cargo ?? '').toLowerCase().includes(q)
      );
    });
  }, [membros, search]);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  if (!isAdmin) {
    return (
      <div className="border border-dashed rounded-lg p-8 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Acesso restrito</p>
        <p className="text-xs text-muted-foreground mt-1">
          Você não tem permissão para gerenciar membros.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header com ação + Novo Membro */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMatrizOpen(true)}
          className="text-xs h-8 gap-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Matriz de Permissões
        </Button>
        {canCreate && (
          <Button size="sm" onClick={() => setIsNovoOpen(true)} className="h-8 gap-1">
            <Plus className="h-4 w-4" /> Novo Membro
          </Button>
        )}
      </div>

      {/* Search + Colunas */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar membros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <Columns3 className="h-3 w-3" /> Colunas
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Usuário
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cargo
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                WhatsApp
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {search
                    ? 'Nenhum membro encontrado para esta pesquisa.'
                    : 'Nenhum membro cadastrado. Clique em "Novo Membro" para começar.'}
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const activeRole = m.user_roles?.find((r) => r.ativo)?.role;
                const avatarColor = getAvatarHex(m.nome_completo || m.email);
                const initials = getInitials(m.nome_completo || m.email);
                return (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleOne(m.id)}
                        aria-label={`Selecionar ${m.nome_completo}`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {m.nome_completo || '—'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {activeRole ? (
                        <Badge variant="outline" className="text-xs font-medium">
                          {getRoleLabel(activeRole)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {m.telefone || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(m);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Editar perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(m);
                              setIsPermOpen(true);
                            }}
                          >
                            <ShieldAlert className="h-4 w-4 mr-2" /> Permissões
                          </DropdownMenuItem>
                          {m.ativo && canDeleteUsers && m.id !== profile?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setConfirmDeactivate({
                                    open: true,
                                    id: m.id,
                                    nome: m.nome_completo,
                                  })
                                }
                              >
                                <Trash className="h-4 w-4 mr-2" /> Revogar acesso
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isLoading ? '' : `${filtered.length} ${filtered.length === 1 ? 'membro' : 'membros'}`}
      </p>

      {/* Dialog: Novo Membro */}
      <Dialog open={isNovoOpen} onOpenChange={setIsNovoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convidar novo membro</DialogTitle>
          </DialogHeader>
          <NovoUsuarioForm onClose={() => setIsNovoOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Perfil */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <EditarUsuarioForm
              usuario={{
                id: selectedMember.id,
                nome_completo: selectedMember.nome_completo,
                email: selectedMember.email,
                telefone: selectedMember.telefone ?? undefined,
                cargo: selectedMember.cargo ?? undefined,
                departamento: selectedMember.departamento ?? undefined,
                ativo: selectedMember.ativo,
              }}
              onClose={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Permissões individuais */}
      <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Permissões de {selectedMember?.nome_completo}</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <GerenciarPermissoesForm
              usuario={{
                id: selectedMember.id,
                nome_completo: selectedMember.nome_completo,
                email: selectedMember.email,
              }}
              onClose={() => setIsPermOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Matriz de Permissões (role × módulo) */}
      <Dialog open={isMatrizOpen} onOpenChange={setIsMatrizOpen}>
        <DialogContent className="w-[95vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Matriz de Permissões</DialogTitle>
          </DialogHeader>
          <MatrizPermissoes />
        </DialogContent>
      </Dialog>

      {/* Confirmação de desativação */}
      <ConfirmDialog
        open={confirmDeactivate.open}
        onOpenChange={(v) => setConfirmDeactivate((p) => ({ ...p, open: v }))}
        title="Revogar acesso do membro"
        description={`"${confirmDeactivate.nome}" perderá o acesso à plataforma. Os dados permanecem salvos.`}
        onConfirm={() => {
          deactivateMutation.mutate(confirmDeactivate.id);
          setConfirmDeactivate({ open: false, id: '', nome: '' });
        }}
        destructive
      />
    </div>
  );
};

// Subcomponente: Matriz de permissões role × módulo
const MatrizPermissoes = () => {
  const roles = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'advogado', label: 'Advogado' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'pos_venda', label: 'Pós-venda' },
    { value: 'suporte', label: 'Suporte' },
  ];
  const modules = [
    { value: 'leads', label: 'Leads' },
    { value: 'contratos', label: 'Contratos' },
    { value: 'agendamentos', label: 'Agendamentos' },
    { value: 'relatorios', label: 'Relatórios' },
    { value: 'whatsapp_ia', label: 'WhatsApp IA' },
    { value: 'usuarios', label: 'Usuários' },
  ];

  const { data: permissions = [] } = useQuery<Array<{ role: string; module: string; permission: string }>>({
    queryKey: ['role-permissions-matriz'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('ativo', true)
        .order('role');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Role</th>
            {modules.map((m) => (
              <th key={m.value} className="text-center p-2 min-w-[110px] text-xs font-medium">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.value} className="border-b">
              <td className="p-2">
                <Badge variant="outline">{role.label}</Badge>
              </td>
              {modules.map((m) => {
                const perms = permissions.filter((p) => p.role === role.value && p.module === m.value);
                return (
                  <td key={m.value} className="text-center p-2">
                    {perms.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {perms.map((p) => (
                          <Badge key={p.permission} variant="secondary" className="text-[10px]">
                            {p.permission}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsuariosPermissoesSection;
