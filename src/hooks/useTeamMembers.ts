import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface TeamMember {
  id: string;
  nome_completo: string;
  email: string;
  avatar_url: string | null;
  ativo: boolean;
}

export function useTeamMembers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: ['team_members', tenantId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await db
        .from('profiles')
        .select('id, nome_completo, email, avatar_url, ativo')
        .eq('tenant_id', tenantId!)
        .eq('ativo', true)
        .order('nome_completo');
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
  };
}
