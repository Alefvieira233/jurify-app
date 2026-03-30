import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';

export interface ConexaoWhatsApp {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string | null;
  tipo: 'kapso' | 'oficial' | 'cloud_api';
  provider: string;
  instance_name: string | null;
  status: string;
  status_padrao: string | null;
  departamento_id: string | null;
  responsavel_id: string | null;
  avatar_url: string | null;
  last_heartbeat: string | null;
  last_sync: string | null;
  last_error: string | null;
  reconnect_attempts: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  departamento?: { id: string; nome: string; cor: string } | null;
  responsavel?: { id: string; nome_completo: string; email: string } | null;
}

export interface ConexaoLog {
  id: string;
  conexao_id: string;
  tenant_id: string;
  evento: string;
  severidade: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  descricao: string | null;
  origem: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConexaoAlerta {
  id: string;
  conexao_id: string;
  tenant_id: string;
  tipo: string;
  mensagem: string;
  severidade: 'info' | 'warning' | 'error' | 'critical';
  lido: boolean;
  resolvido: boolean;
  created_at: string;
}

export function useConexoes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const conexoesQuery = useQuery({
    queryKey: ['conexoes_whatsapp', tenantId],
    queryFn: async (): Promise<ConexaoWhatsApp[]> => {
      const { data, error } = await supabaseUntyped
        .from('conexoes_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []) as unknown as ConexaoWhatsApp[];
    },
    enabled: !!tenantId,
    refetchInterval: 30_000, // poll every 30 seconds
    refetchIntervalInBackground: false, // only when tab is focused
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<ConexaoWhatsApp>) => {
      const { data, error } = await supabaseUntyped
        .from('conexoes_whatsapp')
        .insert({ ...input, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conexoes_whatsapp'] });
      toast({ title: 'Conexão criada com sucesso' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConexaoWhatsApp> & { id: string }) => {
      const { data, error } = await supabaseUntyped
        .from('conexoes_whatsapp')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conexoes_whatsapp'] });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped
        .from('conexoes_whatsapp')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conexoes_whatsapp'] });
      toast({ title: 'Conexão removida' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    conexoes: conexoesQuery.data ?? [],
    isLoading: conexoesQuery.isLoading,
    error: conexoesQuery.error,
    createConexao: createMutation.mutateAsync,
    updateConexao: updateMutation.mutateAsync,
    deleteConexao: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useConexaoLogs(conexaoId: string | null) {
  return useQuery({
    queryKey: ['conexoes_logs', conexaoId],
    queryFn: async (): Promise<ConexaoLog[]> => {
      const { data, error } = await supabaseUntyped
        .from('conexoes_logs')
        .select('*')
        .eq('conexao_id', conexaoId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ConexaoLog[];
    },
    enabled: !!conexaoId,
  });
}

export function useConexaoAlertas(conexaoId: string | null) {
  return useQuery({
    queryKey: ['conexoes_alertas', conexaoId],
    queryFn: async (): Promise<ConexaoAlerta[]> => {
      const { data, error } = await supabaseUntyped
        .from('conexoes_alertas')
        .select('*')
        .eq('conexao_id', conexaoId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ConexaoAlerta[];
    },
    enabled: !!conexaoId,
  });
}
