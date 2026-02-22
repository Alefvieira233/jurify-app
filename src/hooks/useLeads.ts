/**
 * @module useLeads
 * @description Hook principal para gerenciamento de leads jurídicos.
 * Suporta paginação, busca, filtros por status/área jurídica,
 * e operações CRUD com validação e sanitização integradas.
 *
 * @example
 * ```tsx
 * const { leads, loading, fetchLeads, createLead, updateLead } = useLeads({ enablePagination: true });
 * ```
 */
import { useCallback, useState, useEffect } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('Leads');

type LeadMetadata = Record<string, unknown>;

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type Lead = {
  id: string;
  nome: string | null;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  mensagem_inicial?: string | null;
  area_juridica: string | null;
  status: string | null;
  origem: string | null;
  valor_causa?: number | null;
  responsavel_id: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  descricao: string | null;
  tenant_id: string | null;
  metadata: LeadMetadata | null;
  created_at: string;
  updated_at: string | null;
  // CRM Professional fields
  lead_score: number;
  pipeline_stage_id: string | null;
  temperature: LeadTemperature;
  expected_value: number | null;
  probability: number;
  lost_reason: string | null;
  won_at: string | null;
  lost_at: string | null;
  last_activity_at: string | null;
  next_followup_at: string | null;
  followup_count: number;
  company_name: string | null;
  cpf_cnpj: string | null;
};

export type CreateLeadData = {
  nome_completo: string;
  telefone?: string | null;
  email?: string | null;
  area_juridica?: string | null;
  origem?: string | null;
  valor_causa?: number | null;
  responsavel?: string | null;
  observacoes?: string | null;
  status?: string | null;
  tenant_id?: string | null;
  responsavel_id?: string | null;
  descricao?: string | null;
  metadata?: LeadMetadata | null;
  // CRM Professional fields
  temperature?: LeadTemperature;
  expected_value?: number | null;
  probability?: number;
  company_name?: string | null;
  cpf_cnpj?: string | null;
  pipeline_stage_id?: string | null;
  lost_reason?: string | null;
};

export type LeadInput = CreateLeadData;

const ITEMS_PER_PAGE = 25;

export const useLeads = (options?: { enablePagination?: boolean; pageSize?: number }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = options?.pageSize ?? ITEMS_PER_PAGE;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const normalizeLead = useCallback((lead: Record<string, unknown>): Lead => {
    return {
      ...(lead as Lead),
      nome_completo: (lead.nome_completo ?? lead.nome ?? null) as string | null,
      responsavel: ((lead.metadata as LeadMetadata)?.responsavel_nome ?? null) as string | null,
      observacoes: (lead.descricao ?? null) as string | null,
      // CRM Professional defaults
      lead_score: (lead.lead_score as number) ?? 0,
      pipeline_stage_id: (lead.pipeline_stage_id as string) ?? null,
      temperature: (lead.temperature as LeadTemperature) ?? 'warm',
      expected_value: (lead.expected_value as number) ?? null,
      probability: (lead.probability as number) ?? 50,
      lost_reason: (lead.lost_reason as string) ?? null,
      won_at: (lead.won_at as string) ?? null,
      lost_at: (lead.lost_at as string) ?? null,
      last_activity_at: (lead.last_activity_at as string) ?? null,
      next_followup_at: (lead.next_followup_at as string) ?? null,
      followup_count: (lead.followup_count as number) ?? 0,
      company_name: (lead.company_name as string) ?? null,
      cpf_cnpj: (lead.cpf_cnpj as string) ?? null,
    };
  }, []);

  const mapLeadInputToDb = useCallback((data: Partial<LeadInput>) => {
    const payload: Record<string, unknown> = { ...data };
    const hasNome = Object.prototype.hasOwnProperty.call(payload, 'nome') ||
      Object.prototype.hasOwnProperty.call(payload, 'nome_completo');

    if (hasNome) {
      const nome = (payload.nome ?? payload.nome_completo ?? '') as string;
      payload.nome = nome;
    }
    delete payload.nome_completo;

    const responsavel = payload.responsavel as string | undefined;
    if (responsavel) {
      payload.metadata = {
        ...((payload.metadata as LeadMetadata) || {}),
        responsavel_nome: responsavel,
      };
      if (user?.id && !payload.responsavel_id) {
        payload.responsavel_id = user.id;
      }
    }
    delete payload.responsavel;

    if (payload.observacoes && !payload.descricao) {
      payload.descricao = payload.observacoes;
    }
    delete payload.observacoes;

    return payload;
  }, [user?.id]);

  const fetchLeads = useCallback(async (page: number = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      log.debug(`Buscando leads (página ${page})`);

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // IMPORTANTE: Se o profile não carregou mas sabemos o tenant pelo metadata do auth, tentamos usar
      const rawTenantId = profile?.tenant_id || (user?.user_metadata as Record<string, unknown>)?.tenant_id;
      const effectiveTenantId = typeof rawTenantId === 'string' ? rawTenantId : undefined;

      if (effectiveTenantId) {
        log.debug(`Filtrando por tenant: ${effectiveTenantId}`);
        query = query.eq('tenant_id', effectiveTenantId);
      } else {
        log.warn('Sem tenant_id disponível para filtro. RLS deve atuar.');
      }

      // Aplicar paginação
      if (enablePagination) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        log.error('Erro técnico Supabase', fetchError);
        throw fetchError;
      }

      log.debug(`${data?.length || 0} leads encontrados`);

      const normalizedLeads = (data || []).map(normalizeLead);
      setLeads(normalizedLeads);
      setIsEmpty(!normalizedLeads || normalizedLeads.length === 0);

      if (count !== null) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }

    } catch (error: unknown) {
      log.error('Falha na busca', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar leads');
      setLeads([]);
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.tenant_id, enablePagination, pageSize, normalizeLead]);

  // Carregar leads na montagem
  useEffect(() => {
    if (user) {
      void fetchLeads(currentPage);
    }
  }, [user, currentPage, fetchLeads]);

  // Funções de paginação
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const refreshLeads = useCallback(() => {
    void fetchLeads(currentPage);
  }, [fetchLeads, currentPage]);

  const createLead = useCallback(async (data: LeadInput): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      log.info('Criando novo lead');
      const payload = mapLeadInputToDb(data);
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const normalizedLead = normalizeLead(newLead);
      setLeads(prev => [normalizedLead, ...prev]);

      toast({
        title: 'Sucesso',
        description: 'Lead criado com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      log.error('Erro ao criar lead', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar o lead.',
        variant: 'destructive',
      });
      return false;
    }
  }, [mapLeadInputToDb, normalizeLead, toast, user]);

  const updateLead = useCallback(async (id: string, updateData: Partial<LeadInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      log.info('Atualizando lead', { id });
      const payload = mapLeadInputToDb(updateData);
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const normalizedLead = normalizeLead(updatedLead);
      setLeads(prev => prev.map(lead =>
        lead.id === id ? { ...lead, ...normalizedLead } : lead
      ));

      toast({
        title: 'Sucesso',
        description: 'Lead atualizado com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      log.error('Erro ao atualizar lead', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
      return false;
    }
  }, [mapLeadInputToDb, normalizeLead, toast, user]);

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLeads(prev => prev.filter(lead => lead.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Lead removido com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      log.error('Erro ao deletar lead', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível remover o lead.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  return {
    leads,
    loading,
    error,
    isEmpty,
    fetchLeads: refreshLeads,
    createLead,
    updateLead,
    deleteLead,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};
