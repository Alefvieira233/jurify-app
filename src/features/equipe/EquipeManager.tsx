import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, UserPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTeamMembers, type TeamMember, type UpdateTeamMemberInput } from '@/hooks/useTeamMembers';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import MemberFilters from './components/MemberFilters';
import MemberCard from './components/MemberCard';
import MobileMemberCard from './components/MobileMemberCard';
import { type DepartmentInfo } from './components/memberUtils';

interface DepartmentMembership {
  departamento_id: string;
  profile_id: string;
  role_no_depto: string;
  receber_notificacoes: boolean;
  departamento_nome?: string;
  departamento_cor?: string;
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

  const memberDepartments = useMemo(() => {
    const map = new Map<string, DepartmentInfo[]>();
    const deptoMap = new Map(departamentos.map((d: { id: string; nome: string; cor: string }) => [d.id, d]));

    for (const ms of allMemberships) {
      const depto = deptoMap.get(ms.departamento_id);
      if (!depto) continue;
      const existing = map.get(ms.profile_id) ?? [];
      existing.push({ nome: depto.nome, cor: depto.cor, role: ms.role_no_depto, receber_notificacoes: ms.receber_notificacoes });
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
        (m.role ?? '').toLowerCase().includes(term),
    );
  }, [members, searchTerm]);

  const handleStartEdit = useCallback((member: TeamMember) => {
    setEditing({ memberId: member.id, cargo: member.cargo ?? '', telefone: member.telefone ?? '' });
  }, []);

  const handleCancelEdit = useCallback(() => { setEditing(null); }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editing) return;
    const input: UpdateTeamMemberInput = { id: editing.memberId, cargo: editing.cargo.trim() || null, telefone: editing.telefone.trim() || null };
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
            Gestao de Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Visualize todos os membros ativos, seus cargos, departamentos e informacoes de contato.
          </p>
        </div>
      </div>

      <MemberFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        membersCount={members.length}
        departmentsCount={departamentos.length}
      />

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
          description={searchTerm ? 'Nenhum integrante da equipe corresponde a busca.' : 'Nenhum membro ativo na equipe.'}
          action={searchTerm ? { label: 'Limpar busca', onClick: () => setSearchTerm('') } : undefined}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredMembers.map((member: TeamMember) => (
            <MobileMemberCard
              key={member.id}
              member={member}
              deptos={memberDepartments.get(member.id) ?? []}
              canEdit={canEdit}
              onStartEdit={handleStartEdit}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member: TeamMember) => (
            <MemberCard
              key={member.id}
              member={member}
              deptos={memberDepartments.get(member.id) ?? []}
              canEdit={canEdit}
              editing={editing?.memberId === member.id ? editing : null}
              isUpdating={isUpdating}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditingChange={setEditing}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipeManager;
