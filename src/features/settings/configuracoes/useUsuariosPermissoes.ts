import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useToast } from '@/hooks/use-toast';

export interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  ativo: boolean;
  user_roles?: Array<{ role: string; ativo: boolean }>;
}

export function useUsuariosPermissoes() {
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
    queryKey: queryKeys.configuracoesMembros.list(tenantId),
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
      if (!canDeleteUsers) throw new Error('Sem permissao');
      if (!tenantId) throw new Error('Tenant nao encontrado');
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', userId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.configuracoesMembros.all });
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

  return {
    profile,
    isAdmin,
    canDeleteUsers,
    canCreate,
    search,
    setSearch,
    selected,
    isNovoOpen,
    setIsNovoOpen,
    isEditOpen,
    setIsEditOpen,
    isPermOpen,
    setIsPermOpen,
    isMatrizOpen,
    setIsMatrizOpen,
    selectedMember,
    setSelectedMember,
    confirmDeactivate,
    setConfirmDeactivate,
    filtered,
    isLoading,
    deactivateMutation,
    toggleAll,
    toggleOne,
  };
}
