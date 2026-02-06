
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('Leads');

type LeadMetadata = Record<string, unknown>;

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

  const normalizeLead = useCallback((lead: any): Lead => {
    return {
      ...lead,
      nome_completo: lead?.nome_completo ?? lead?.nome ?? null,
      responsavel: lead?.metadata?.responsavel_nome ?? null,
      observacoes: lead?.descricao ?? null,
    };
  }, []);

  const mapLeadInputToDb = useCallback((data: Partial<LeadInput>) => {
    const payload: Record<string, unknown> = { ...data };
    const hasNome = Object.prototype.hasOwnProperty.call(payload, 'nome') ||
      Object.prototype.hasOwnProperty.call(payload, 'nome_completo');

    if (hasNome) {
      const nome = (payload as any).nome ?? (payload as any).nome_completo ?? '';
      (payload as any).nome = nome;
    }
    delete (payload as any).nome_completo;

    const responsavel = (payload as any).responsavel as string | undefined;
    if (responsavel) {
      (payload as any).metadata = {
        ...((payload as any).metadata || {}),
        responsavel_nome: responsavel,
      };
      if (user?.id && !(payload as any).responsavel_id) {
        (payload as any).responsavel_id = user.id;
      }
    }
    delete (payload as any).responsavel;

    if ((payload as any).observacoes && !(payload as any).descricao) {
      (payload as any).descricao = (payload as any).observacoes;
    }
    delete (payload as any).observacoes;

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
      const effectiveTenantId = profile?.tenant_id || (user as any).user_metadata?.tenant_id;

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

    } catch (error: any) {
      log.error('Falha na busca', error);
      setError(error.message || 'Erro ao carregar leads');
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
    } catch (error: any) {
      log.error('Erro ao criar lead', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o lead.',
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
    } catch (error: any) {
      log.error('Erro ao atualizar lead', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o lead.',
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
    } catch (error: any) {
      log.error('Erro ao deletar lead', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o lead.',
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
