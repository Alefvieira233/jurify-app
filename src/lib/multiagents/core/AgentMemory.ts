/**
 * 🧠 AGENT MEMORY - Model Context Protocol (MCP)
 *
 * Sistema de memória de longo prazo para agentes.
 * Permite que agentes "lembrem" de interações anteriores,
 * decisões tomadas e contexto acumulado entre sessões.
 *
 * Usa banco vetorial (pgvector) para busca semântica de memórias.
 *
 * @version 1.0.0
 * @architecture Enterprise Grade - Inspired by MCP
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentMemory');

// 🎯 TIPOS
export type MemoryType = 'conversation' | 'decision' | 'preference' | 'fact' | 'summary';

export interface AgentMemoryEntry {
  id?: string;
  tenant_id: string;
  lead_id?: string;
  agent_name: string;
  memory_type: MemoryType;
  content: string;
  importance: number; // 1-10
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

export interface MemorySearchResult {
  id: string;
  agent_name: string;
  memory_type: MemoryType;
  content: string;
  importance: number;
  similarity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MemoryContext {
  memories: MemorySearchResult[];
  summary: string;
}

// 🧠 CLASSE PRINCIPAL
export class AgentMemoryService {
  private static instance: AgentMemoryService;

  private constructor() {
    log.info('AgentMemory service initialized');
  }

  static getInstance(): AgentMemoryService {
    if (!AgentMemoryService.instance) {
      AgentMemoryService.instance = new AgentMemoryService();
    }
    return AgentMemoryService.instance;
  }

  /**
   * 💾 Salva uma memória no banco
   */
  async store(entry: AgentMemoryEntry): Promise<string | null> {
    try {
      log.debug('Storing memory', { agent: entry.agent_name, type: entry.memory_type });

      // Gera embedding para busca semântica
      let embedding: number[] | null = null;
      try {
        const { data: embData, error: embError } = await supabase.functions.invoke<{ embedding: number[] }>(
          'generate-embedding',
          { body: { text: entry.content } }
        );
        if (!embError && embData?.embedding) {
          embedding = embData.embedding;
        }
      } catch {
        log.warn('Failed to generate embedding, storing without vector');
      }

      const { data, error } = await supabase
        .from('agent_memory')
        .insert({
          tenant_id: entry.tenant_id,
          lead_id: entry.lead_id || null,
          agent_name: entry.agent_name,
          memory_type: entry.memory_type,
          content: entry.content,
          embedding,
          importance: Math.max(1, Math.min(10, entry.importance)),
          metadata: entry.metadata || {},
          expires_at: entry.expires_at || null,
        })
        .select('id')
        .single();

      if (error) {
        log.error('Failed to store memory', error);
        return null;
      }

      log.info('Memory stored', { id: data?.id, agent: entry.agent_name });
      return data?.id ?? null;
    } catch (error) {
      log.error('store exception', error);
      return null;
    }
  }

  /**
   * 🔍 Busca memórias relevantes por similaridade semântica
   */
  async recall(
    query: string,
    tenantId: string,
    options?: {
      leadId?: string;
      agentName?: string;
      memoryType?: MemoryType;
      limit?: number;
      threshold?: number;
    }
  ): Promise<MemorySearchResult[]> {
    try {
      log.debug('Recalling memories', { query: query.substring(0, 50), tenantId });

      // Gera embedding da query
      const { data: embData, error: embError } = await supabase.functions.invoke<{ embedding: number[] }>(
        'generate-embedding',
        { body: { text: query } }
      );

      if (embError || !embData?.embedding) {
        log.warn('Failed to generate query embedding, falling back to text search');
        return this.recallByText(query, tenantId, options);
      }

      // Busca semântica via RPC
      const { data, error } = await supabase.rpc('search_agent_memory', {
        query_embedding: embData.embedding,
        p_tenant_id: tenantId,
        p_lead_id: options?.leadId || null,
        p_agent_name: options?.agentName || null,
        p_memory_type: options?.memoryType || null,
        p_limit: options?.limit || 10,
        p_threshold: options?.threshold || 0.7,
      });

      if (error) {
        log.error('search_agent_memory RPC failed', error);
        return [];
      }

      // Atualiza access_count das memórias retornadas
      const ids = (data as MemorySearchResult[])?.map(m => m.id) || [];
      if (ids.length > 0) {
        void this.touchMemories(ids);
      }

      log.info('Memories recalled', { count: data?.length || 0 });
      return (data as MemorySearchResult[]) || [];
    } catch (error) {
      log.error('recall exception', error);
      return [];
    }
  }

  /**
   * 🔍 Fallback: busca por texto quando embedding falha
   */
  private async recallByText(
    query: string,
    tenantId: string,
    options?: {
      leadId?: string;
      agentName?: string;
      memoryType?: MemoryType;
      limit?: number;
    }
  ): Promise<MemorySearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('agent_memory')
        .select('id, agent_name, memory_type, content, importance, metadata, created_at')
        .eq('tenant_id', tenantId)
        .ilike('content', `%${query.substring(0, 100)}%`)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(options?.limit || 10);

      if (options?.leadId) {
        queryBuilder = queryBuilder.eq('lead_id', options.leadId);
      }
      if (options?.agentName) {
        queryBuilder = queryBuilder.eq('agent_name', options.agentName);
      }
      if (options?.memoryType) {
        queryBuilder = queryBuilder.eq('memory_type', options.memoryType);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        log.error('Text search failed', error);
        return [];
      }

      return (data || []).map(m => ({ ...m, similarity: 0.5 })) as MemorySearchResult[];
    } catch (error) {
      log.error('recallByText exception', error);
      return [];
    }
  }

  /**
   * 📋 Constrói contexto de memória formatado para prompt de IA
   */
  async buildMemoryContext(
    query: string,
    tenantId: string,
    leadId?: string,
    agentName?: string
  ): Promise<MemoryContext> {
    const memories = await this.recall(query, tenantId, {
      leadId,
      agentName,
      limit: 5,
      threshold: 0.65,
    });

    if (memories.length === 0) {
      return { memories: [], summary: '' };
    }

    const lines = memories.map((m, i) => {
      const typeLabel = {
        conversation: 'Conversa anterior',
        decision: 'Decisão tomada',
        preference: 'Preferência do cliente',
        fact: 'Fato registrado',
        summary: 'Resumo',
      }[m.memory_type] || m.memory_type;

      return `${i + 1}. [${typeLabel}] (${m.agent_name}): ${m.content}`;
    });

    const summary = `MEMÓRIA DO AGENTE (${memories.length} registros relevantes):\n${lines.join('\n')}`;

    return { memories, summary };
  }

  /**
   * 🧹 Limpa memórias expiradas
   */
  async cleanExpired(tenantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('agent_memory')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        log.error('cleanExpired failed', error);
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        log.info('Expired memories cleaned', { count, tenantId });
      }
      return count;
    } catch (error) {
      log.error('cleanExpired exception', error);
      return 0;
    }
  }

  /**
   * 📊 Estatísticas de memória por tenant
   */
  async getStats(tenantId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('memory_type, agent_name')
        .eq('tenant_id', tenantId);

      if (error || !data) {
        return { total: 0, byType: {}, byAgent: {} };
      }

      const byType: Record<string, number> = {};
      const byAgent: Record<string, number> = {};

      for (const row of data) {
        byType[row.memory_type] = (byType[row.memory_type] || 0) + 1;
        byAgent[row.agent_name] = (byAgent[row.agent_name] || 0) + 1;
      }

      return { total: data.length, byType, byAgent };
    } catch (error) {
      log.error('getStats exception', error);
      return { total: 0, byType: {}, byAgent: {} };
    }
  }

  /**
   * 🔄 Atualiza last_accessed_at das memórias acessadas
   */
  private async touchMemories(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await supabase
          .from('agent_memory')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', id);
      }
    } catch {
      // Non-critical, ignore
    }
  }
}

// 🚀 Instância singleton
export const agentMemory = AgentMemoryService.getInstance();
