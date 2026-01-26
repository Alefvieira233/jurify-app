import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from './useSupabaseQuery';

type AgendamentoRow = {
  id: string;
  lead_id: string | null;
  tenant_id: string | null;
  area_juridica: string | null;
  data_hora: string;
  responsavel: string | null;
  observacoes: string | null;
  google_event_id: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};
export type Agendamento = AgendamentoRow & {
  responsavel?: string | null;
  area_juridica?: string | null;
  observacoes?: string | null;
  google_event_id?: string | null;
};

export type AgendamentoInput = {
  lead_id?: string | null;
  area_juridica: string;
  data_hora: string;
  responsavel: string;
  observacoes?: string | null;
  google_event_id?: string | null;
  status?: string | null;
  tenant_id?: string | null;
};

export const useAgendamentos = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

    const normalizeAgendamento = useCallback((agendamento: AgendamentoRow): Agendamento => {
    return {
      ...agendamento,
      responsavel: agendamento.responsavel ?? null,
      area_juridica: agendamento.area_juridica ?? null,
      observacoes: agendamento.observacoes ?? null,
      google_event_id: agendamento.google_event_id ?? null,
    };
  }, []);

  const fetchAgendamentosQuery = useCallback(async () => {
    console.log('🔍 [useAgendamentos] Buscando agendamentos...');
    
    try {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .order('data_hora', { ascending: true });

      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [useAgendamentos] Erro ao buscar agendamentos:', error);
        throw error;
      }

      console.log(`✅ [useAgendamentos] ${data?.length || 0} agendamentos encontrados`);
      const normalized = (data || []).map(normalizeAgendamento);
      return { data: normalized, error: null };
    } catch (error) {
      console.error('❌ [useAgendamentos] Erro na consulta:', error);
      return { data: null, error };
    }
  }, [profile?.tenant_id, normalizeAgendamento]);

  const {
    data: agendamentos,
    loading,
    error,
    refetch: fetchAgendamentos,
    mutate: setAgendamentos,
    isEmpty
  } = useSupabaseQuery<Agendamento>('agendamentos', fetchAgendamentosQuery, {
    enabled: !!user,
    staleTime: 15000
  });

  const createAgendamento = useCallback(async (data: AgendamentoInput): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log('🔄 [useAgendamentos] Criando novo agendamento...');

      const { data: newAgendamento, error } = await supabase
        .from('agendamentos')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [useAgendamentos] Agendamento criado com sucesso:', newAgendamento.id);

      // ✅ CORREÇÃO: Usar setter callback para evitar dependência circular
      const normalized = normalizeAgendamento(newAgendamento as AgendamentoRow);
      setAgendamentos(prev => [...prev, normalized].sort((a, b) =>
        new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      ));

      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('❌ [useAgendamentos] Erro ao criar agendamento:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o agendamento.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setAgendamentos]);

  const updateAgendamento = useCallback(async (id: string, updateData: Partial<AgendamentoInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log(`🔄 [useAgendamentos] Atualizando agendamento ${id}...`);

      const { data: updatedAgendamento, error } = await supabase
        .from('agendamentos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [useAgendamentos] Agendamento atualizado com sucesso');

      // ✅ CORREÇÃO: Usar setter callback para evitar dependência circular
      const normalized = normalizeAgendamento(updatedAgendamento as AgendamentoRow);
      setAgendamentos(prev => prev.map(agendamento =>
        agendamento.id === id ? { ...agendamento, ...normalized } : agendamento
      ).sort((a, b) =>
        new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      ));

      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('❌ [useAgendamentos] Erro ao atualizar agendamento:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o agendamento.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setAgendamentos]);

  // ✅ NOVO: Implementar deleteAgendamento (estava faltando)
  const deleteAgendamento = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log(`🔄 [useAgendamentos] Deletando agendamento ${id}...`);
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [useAgendamentos] Agendamento deletado com sucesso');

      // ✅ Usar setter callback
      setAgendamentos(prev => prev.filter(agendamento => agendamento.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Agendamento deletado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('❌ [useAgendamentos] Erro ao deletar agendamento:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar o agendamento.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setAgendamentos]);

  return {
    agendamentos,
    loading,
    error,
    isEmpty,
    fetchAgendamentos,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento, // ✅ NOVO: Exportar deleteAgendamento
  };
};





