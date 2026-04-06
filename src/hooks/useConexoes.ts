/** Manages WhatsApp connection instances: CRUD, reconnection, testing, and status monitoring. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';

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
    queryKey: queryKeys.conexoesWhatsapp.list(tenantId),
    queryFn: async (): Promise<ConexaoWhatsApp[]> => {
      const { data, error } = await supabase
        .from('conexoes_whatsapp')
        .select('id, tenant_id, nome, telefone, tipo, provider, instance_name, status, status_padrao, departamento_id, responsavel_id, avatar_url, last_heartbeat, last_sync, last_error, reconnect_attempts, config, created_at, updated_at')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []) as unknown as ConexaoWhatsApp[];
    },
    enabled: !!tenantId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    // refetchOnWindowFocus inherits global false — the 30s interval is sufficient.
    // Setting true here caused parent rerenders on every tab-return, disrupting
    // open modals/drawers/wizards across the conexoes page.
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<ConexaoWhatsApp>) => {
      const { data, error } = await supabase
        .from('conexoes_whatsapp')
        .insert({ ...input, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conexoesWhatsapp.all });
      toast({ title: 'Conexão criada com sucesso' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConexaoWhatsApp> & { id: string }) => {
      const { data, error } = await supabase
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.conexoesWhatsapp.all });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conexoes_whatsapp')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conexoesWhatsapp.all });
      toast({ title: 'Conexão removida' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover conexão', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    conexoes: conexoesQuery.data ?? [],
    isLoading: conexoesQuery.isLoading,
    isError: conexoesQuery.isError,
    error: conexoesQuery.error,
    refetch: conexoesQuery.refetch,
    createConexao: createMutation.mutateAsync,
    updateConexao: updateMutation.mutateAsync,
    deleteConexao: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useConexaoLogs(conexaoId: string | null) {
  return useQuery({
    queryKey: queryKeys.conexoesWhatsapp.logs(conexaoId ?? undefined),
    queryFn: async (): Promise<ConexaoLog[]> => {
      const { data, error } = await supabase
        .from('conexoes_logs')
        .select('id, conexao_id, tenant_id, evento, severidade, descricao, origem, metadata, created_at')
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
    queryKey: queryKeys.conexoesWhatsapp.alertas(conexaoId ?? undefined),
    queryFn: async (): Promise<ConexaoAlerta[]> => {
      const { data, error } = await supabase
        .from('conexoes_alertas')
        .select('id, conexao_id, tenant_id, tipo, mensagem, severidade, lido, resolvido, created_at')
        .eq('conexao_id', conexaoId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ConexaoAlerta[];
    },
    enabled: !!conexaoId,
  });
}
