import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from './useSupabaseQuery';

type AgenteParams = Record<string, unknown>;

export type AgenteIA = {
  id: string;
  nome: string;
  area_juridica: string | null;
  objetivo: string | null;
  script_saudacao: string | null;
  perguntas_qualificacao: string[] | null;
  keywords_acao: string[] | null;
  delay_resposta: number | null;
  status: string | null;
  descricao_funcao: string | null;
  prompt_base: string | null;
  tipo_agente: string | null;
  parametros_avancados: AgenteParams | null;
  tenant_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CreateAgenteData = {
  nome: string;
  area_juridica?: string | null;
  objetivo?: string | null;
  script_saudacao?: string | null;
  perguntas_qualificacao?: string[] | null;
  keywords_acao?: string[] | null;
  delay_resposta?: number | null;
  status?: string | null;
  descricao_funcao?: string | null;
  prompt_base?: string | null;
  tipo_agente?: string | null;
  parametros_avancados?: AgenteParams | null;
  tenant_id?: string | null;
};

export const useAgentesIA = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id || null;

  const normalizeAgente = useCallback((agente: any): AgenteIA => {
    return {
      id: agente.id,
      nome: agente.nome,
      area_juridica: agente.area_juridica ?? null,
      objetivo: agente.objetivo ?? null,
      script_saudacao: agente.script_saudacao ?? null,
      perguntas_qualificacao: agente.perguntas_qualificacao ?? null,
      keywords_acao: agente.keywords_acao ?? null,
      delay_resposta: agente.delay_resposta ?? null,
      status: agente.status ?? 'ativo',
      descricao_funcao: agente.descricao_funcao ?? null,
      prompt_base: agente.prompt_base ?? agente.prompt_sistema ?? null,
      tipo_agente: agente.tipo_agente ?? agente.tipo ?? null,
      parametros_avancados: agente.parametros_avancados ?? null,
      tenant_id: agente.tenant_id ?? null,
      created_at: agente.created_at ?? null,
      updated_at: agente.updated_at ?? null,
    };
  }, []);

  const mapAgenteInputToDb = useCallback((data: CreateAgenteData) => {
    const { tipo_agente, status, ...rest } = data;
    return {
      ...rest,
      tipo_agente: tipo_agente ?? null,
      status: status ?? undefined,
    };
  }, []);

  const fetchAgentesQuery = useCallback(async () => {
    try {
      let query = supabase
        .from('agentes_ia')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAgentesIA] erro ao buscar agentes:', error);
        throw error;
      }

      return { data: (data || []).map(normalizeAgente), error: null };
    } catch (error) {
      console.error('[useAgentesIA] erro na consulta:', error);
      return { data: null, error };
    }
  }, [tenantId, normalizeAgente]);

  const {
    data: agentes,
    loading,
    error,
    refetch: fetchAgentes,
    mutate: setAgentes,
    isEmpty,
    isStale
  } = useSupabaseQuery<AgenteIA>('agentes_ia', fetchAgentesQuery, {
    enabled: !!user,
    staleTime: 15000
  });

  const createAgente = useCallback(async (data: CreateAgenteData): Promise<boolean> => {
    if (!user || !tenantId) {
      toast({
        title: 'Erro de autenticacao',
        description: 'Usuario nao autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const payload = { ...mapAgenteInputToDb(data), tenant_id: tenantId };
      const { data: newAgente, error } = await supabase
        .from('agentes_ia')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setAgentes(prev => [normalizeAgente(newAgente), ...prev]);

      toast({
        title: 'Sucesso',
        description: 'Agente IA criado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('[useAgentesIA] erro ao criar agente:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel criar o agente IA.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, tenantId, toast, setAgentes]);

  const updateAgente = useCallback(async (id: string, updateData: Partial<AgenteIA>): Promise<boolean> => {
    if (!user || !tenantId) return false;

    try {
      let query = supabase
        .from('agentes_ia')
        .update({ ...mapAgenteInputToDb(updateData as CreateAgenteData), updated_at: new Date().toISOString() })
        .eq('id', id);

      query = query.eq('tenant_id', tenantId);

      const { data: updatedAgente, error } = await query
        .select()
        .single();

      if (error) throw error;

      setAgentes(prev => prev.map(agente =>
        agente.id === id ? { ...agente, ...normalizeAgente(updatedAgente) } : agente
      ));

      toast({
        title: 'Sucesso',
        description: 'Agente IA atualizado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('[useAgentesIA] erro ao atualizar agente:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel atualizar o agente IA.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, tenantId, toast, setAgentes]);

  const deleteAgente = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;

    try {
      const { error } = await supabase
        .from('agentes_ia')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setAgentes(prev => prev.filter(agente => agente.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Agente IA removido com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('[useAgentesIA] erro ao remover agente:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel remover o agente IA.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, tenantId, toast, setAgentes]);

  const executeAgente = useCallback(async (agenteId: string, input: string) => {
    if (!user || !tenantId) return null;

    const startTime = Date.now();

    try {
      const { data: agente, error: agenteError } = await supabase
        .from('agentes_ia')
        .select('nome, area_juridica, objetivo, script_saudacao')
        .eq('id', agenteId)
        .eq('tenant_id', tenantId)
        .single();

      if (agenteError || !agente) {
        throw agenteError || new Error('Agente nao encontrado');
      }

      const systemPrompt = [
        agente.script_saudacao,
        agente.objetivo ? `Objetivo: ${agente.objetivo}` : null
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('ai-agent-processor', {
        body: {
          agentName: agente.nome || 'Agente Juridico',
          agentSpecialization: agente.area_juridica || 'Direito',
          systemPrompt,
          userPrompt: input,
          tenantId,
          userId: user.id
        }
      });

      const executionTime = Date.now() - startTime;

      if (error) throw error;

      console.log(`[useAgentesIA] execucao concluida em ${executionTime}ms`);
      return data;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error('[useAgentesIA] erro ao executar agente IA:', error, { executionTime });

      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel executar o agente IA.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  return {
    agentes,
    loading,
    error,
    isEmpty,
    isStale,
    fetchAgentes,
    createAgente,
    updateAgente,
    deleteAgente,
    executeAgente,
  };
};
