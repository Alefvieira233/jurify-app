import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Users, Search, Phone, Briefcase, Check, X, Pencil, UserPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileCard } from '@/components/ui/MobileCard';
import { useTeamMembers, type TeamMember, type UpdateTeamMemberInput } from '@/hooks/useTeamMembers';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getAvatarHex, getInitials } from '@/utils/formatting';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';


interface DepartmentMembership {
  departamento_id: string;
  profile_id: string;
  role_no_depto: string;
  receber_notificacoes: boolean;
  departamento_nome?: string;
  departamento_cor?: string;
}

const ROLE_BADGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  administrador: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Admin' },
  admin: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Admin' },
  manager: { bg: 'bg-purple-500/10', text: 'text-purple-500', label: 'Gerente' },
  advogado: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Advogado' },
  comercial: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Comercial' },
  pos_venda: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pós-venda' },
  suporte: { bg: 'bg-slate-500/10', text: 'text-slate-500', label: 'Suporte' },
  user: { bg: 'bg-sky-500/10', text: 'text-sky-500', label: 'Usuário' },
  viewer: { bg: 'bg-muted/50', text: 'text-muted-foreground', label: 'Visualizador' },
};

function getRoleBadge(role: string | null) {
  if (!role) return null;
  const cfg = ROLE_BADGE_CONFIG[role] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground', label: role };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

interface EditingState {
  memberId: string;
  cargo: string;
  telefone: string;
}

const EquipeManager = () => {
  usePageTitle('Equipe');
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const { members, isLoading, isError, refetch, updateMember, isUpdating } = useTeamMembers();
  const { departamentos } = useDepartamentos();
  const { isAdmin, isManager } = useRBAC();
  const canEdit = isAdmin || isManager;

  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);

  const tenantId = profile?.tenant_id;

  // Fetch all department memberships for the tenant's members
  const { data: allMemberships = [] } = useQuery({
    queryKey: queryKeys.allDepartmentMemberships.list(tenantId),
    queryFn: async (): Promise<DepartmentMembership[]> => {
      const { data, error } = await supabase
        .from('departamento_membros')
        .select('departamento_id, profile_id, role_no_depto, receber_notificacoes')
        .in('profile_id', members.map((m: TeamMember) => m.id));
      if (error) throw error;
      return (data ?? []) as DepartmentMembership[];
    },
    enabled: members.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Build a map: profileId -> department names with colors
  const memberDepartments = useMemo(() => {
    const map = new Map<string, Array<{ nome: string; cor: string; role: string; receber_notificacoes: boolean }>>();
    const deptoMap = new Map(departamentos.map((d: { id: string; nome: string; cor: string }) => [d.id, d]));

    for (const ms of allMemberships) {
      const depto = deptoMap.get(ms.departamento_id);
      if (!depto) continue;
      const existing = map.get(ms.profile_id) ?? [];
      existing.push({
        nome: depto.nome,
        cor: depto.cor,
        role: ms.role_no_depto,
        receber_notificacoes: ms.receber_notificacoes,
      });
      map.set(ms.profile_id, existing);
    }
    return map;
  }, [allMemberships, departamentos]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m: TeamMember) =>
        (m.nome_completo ?? '').toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        (m.cargo ?? '').toLowerCase().includes(term) ||
        (m.role ?? '').toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  const handleStartEdit = useCallback((member: TeamMember) => {
    setEditing({
      memberId: member.id,
      cargo: member.cargo ?? '',
      telefone: member.telefone ?? '',
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editing) return;
    const input: UpdateTeamMemberInput = {
      id: editing.memberId,
      cargo: editing.cargo.trim() || null,
      telefone: editing.telefone.trim() || null,
    };
    updateMember(input);
    setEditing(null);
  }, [editing, updateMember]);

  if (isError) {
    return (
      <div className="space-y-8 pb-12">
        <ErrorState title="Erro ao carregar equipe" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" />
            Equipe
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Gestão de Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Visualize todos os membros ativos, seus cargos, departamentos e informações de contato.
          </p>
        </div>
      </div>

      {/* Search + Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, cargo ou role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
          />
        </div>
        <div className="flex items-center gap-4 px-4 sm:min-w-[200px] justify-around">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Membros</p>
            <p className="text-xl font-black">{members.length}</p>
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Departamentos</p>
            <p className="text-xl font-black text-primary">{departamentos.length}</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-[24px]" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon={searchTerm ? Search : UserPlus}
          title="Nenhum membro encontrado"
          description={searchTerm
            ? 'Nenhum integrante da equipe corresponde à busca.'
            : 'Nenhum membro ativo na equipe.'}
          action={searchTerm ? {
            label: 'Limpar busca',
            onClick: () => setSearchTerm(''),
          } : undefined}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredMembers.map((member: TeamMember) => {
            const deptos = memberDepartments.get(member.id) ?? [];
            return (
              <MobileCard
                key={member.id}
                title={member.nome_completo ?? 'Sem nome'}
                subtitle={member.email}
                badge={getRoleBadge(member.role)}
                details={[
                  { label: 'Cargo', value: member.cargo || 'Indefinido' },
                  { label: 'Telefone', value: member.telefone || 'Sem telefone' },
                  ...(deptos.length > 0 ? [{ label: 'Departamentos', value: (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {deptos.map((d) => (
                        <Badge
                          key={d.nome}
                          variant="outline"
                          className="text-[10px] font-semibold"
                          style={{ borderColor: d.cor, color: d.cor, backgroundColor: `${d.cor}10` }}
                        >
                          {d.nome}
                        </Badge>
                      ))}
                    </div>
                  )}] : []),
                ]}
                actions={canEdit ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleStartEdit(member)}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </Button>
                ) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member: TeamMember) => {
            const avatarColor = getAvatarHex(member.nome_completo ?? '');
            const initials = getInitials(member.nome_completo ?? '');
            const deptos = memberDepartments.get(member.id) ?? [];
            const isEditing = editing?.memberId === member.id;

            return (
              <Card
                key={member.id}
                className="group relative rounded-[24px] border-border/10 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
              >
                {/* Top accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border/20 to-transparent" />

                <CardContent className="p-6 space-y-4">
                  {/* Avatar + Edit Button */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-background"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initials}
                    </div>
                    {canEdit && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEdit(member)}
                        title="Editar membro"
                        aria-label="Editar membro"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                          onClick={handleSaveEdit}
                          disabled={isUpdating}
                          title="Salvar"
                          aria-label="Salvar edição"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={handleCancelEdit}
                          title="Cancelar"
                          aria-label="Cancelar edição"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Name + Email */}
                  <div className="space-y-1">
                    <h3
                      className="font-bold text-foreground text-lg leading-tight truncate"
                      title={member.nome_completo ?? ''}
                    >
                      {member.nome_completo ?? 'Sem nome'}
                    </h3>
                    <p
                      className="text-sm font-medium text-muted-foreground truncate"
                      title={member.email}
                    >
                      {member.email}
                    </p>
                  </div>

                  {/* Cargo — inline edit */}
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {isEditing ? (
                      <Input
                        value={editing.cargo}
                        onChange={(e) =>
                          setEditing((prev) => (prev ? { ...prev, cargo: e.target.value } : prev))
                        }
                        placeholder="Cargo (ex: Advogado Senior)"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                        {member.cargo || 'Cargo indefinido'}
                      </span>
                    )}
                  </div>

                  {/* Telefone/WhatsApp — inline edit */}
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {isEditing ? (
                      <Input
                        value={editing.telefone}
                        onChange={(e) =>
                          setEditing((prev) => (prev ? { ...prev, telefone: e.target.value } : prev))
                        }
                        placeholder="(11) 99999-9999"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">
                        {member.telefone || 'Sem telefone'}
                      </span>
                    )}
                  </div>

                  {/* Role badge */}
                  <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                    {getRoleBadge(member.role)}
                  </div>

                  {/* Departments */}
                  {deptos.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground/70">
                        Departamentos
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {deptos.map((d) => (
                          <Badge
                            key={d.nome}
                            variant="outline"
                            className="text-[10px] font-semibold"
                            style={{
                              borderColor: d.cor,
                              color: d.cor,
                              backgroundColor: `${d.cor}10`,
                            }}
                          >
                            {d.nome}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notification toggles per department */}
                  {canEdit && deptos.length > 0 && (
                    <div className="border-t border-border/10 pt-3 space-y-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground/70">
                        Notificações
                      </p>
                      {deptos.map((d) => (
                        <div key={`notif-${d.nome}`} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{d.nome}</span>
                          <Switch
                            checked={d.receber_notificacoes}
                            disabled
                            aria-label={`Notificações para ${d.nome}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EquipeManager;
