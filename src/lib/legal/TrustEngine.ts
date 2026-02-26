/**
 * ⚖️ JURIFY TRUST ENGINE — RAG Retrieval + Citation Enforcement
 *
 * Responsável por:
 * 1. Buscar jurisprudência relevante via match_legal_documents (pgvector)
 * 2. Formatar bloco estrito de contexto para injeção no prompt
 * 3. Validar que a resposta do LLM cita APENAS fontes recuperadas
 * 4. Fornecer fallback seguro quando não há dados
 *
 * Roda apenas client-side via supabase.rpc() — embedding é gerado server-side
 * via Edge Function generate-embedding.
 */

import { supabase, supabaseUntyped } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('TrustEngine');

// ─── Config ─────────────────────────────────────────────────────────────────

const DEFAULT_MATCH_THRESHOLD = 0.78;
const DEFAULT_MATCH_COUNT = 6;
const MAX_CONTENT_CHARS_PER_DOC = 1200;
const MAX_TOTAL_CONTEXT_CHARS = 6000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LegalDocument {
  id: string;
  source_type: string;
  source_id: string;
  content: string;
  metadata: {
    url?: string;
    tags?: string[];
    tribunal?: string;
    year?: number;
    [key: string]: unknown;
  };
  similarity: number;
}

export interface RetrievalResult {
  documents: LegalDocument[];
  contextBlock: string;
  hasContext: boolean;
  sourceIds: Set<string>;
}

export interface RetrievalFilter {
  source_type?: string;
  tribunal?: string;
  year_min?: number;
  year_max?: number;
  tags?: string[];
}

export const TRUST_ENGINE_FALLBACK =
  'Não há dados oficiais na base de jurisprudência para responder com segurança a esta consulta. Recomenda-se pesquisa manual em bases oficiais (STJ, STF, TJs) ou consulta direta ao advogado responsável.';

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Busca documentos jurídicos relevantes via embedding similarity.
 * Gera embedding da query via Edge Function e chama RPC match_legal_documents.
 */
export async function retrieveLegalContext(
  query: string,
  filter?: RetrievalFilter,
  options?: { threshold?: number; maxDocs?: number }
): Promise<RetrievalResult> {
  const emptyResult: RetrievalResult = {
    documents: [],
    contextBlock: '',
    hasContext: false,
    sourceIds: new Set(),
  };

  try {
    // 1. Generate embedding via Edge Function (server-side, API key protected)
    const { data: embData, error: embError } = await supabase.functions.invoke<{
      embedding: number[];
    }>('generate-embedding', {
      body: { text: query },
    });

    if (embError || !embData?.embedding) {
      log.warn('Failed to generate query embedding for legal search', {
        error: embError?.message,
      });
      return emptyResult;
    }

    // 2. Call RPC match_legal_documents (untyped — new migration not in generated types)
    const { data, error } = await supabaseUntyped.rpc('match_legal_documents', {
      query_embedding: embData.embedding,
      match_threshold: options?.threshold ?? DEFAULT_MATCH_THRESHOLD,
      match_count: options?.maxDocs ?? DEFAULT_MATCH_COUNT,
      filter: filter ? (filter as Record<string, unknown>) : {},
    });

    if (error) {
      log.error('match_legal_documents RPC failed', { error: error.message });
      return emptyResult;
    }

    const rawDocs = (data as unknown as LegalDocument[]) || [];

    if (rawDocs.length === 0) {
      log.info('No legal documents matched query', { query: query.substring(0, 100) });
      return emptyResult;
    }

    // 3. Dedup: limit to max 2 chunks per source_id for diversity
    const docs = deduplicateBySource(rawDocs, 2);

    // 4. Format context block
    const { contextBlock, includedDocs } = formatContextBlock(docs);

    const sourceIds = new Set(includedDocs.map((d) => d.source_id));

    log.info('Legal context retrieved', {
      totalMatches: rawDocs.length,
      afterDedup: docs.length,
      included: includedDocs.length,
      sourceIds: [...sourceIds],
    });

    return {
      documents: includedDocs,
      contextBlock,
      hasContext: includedDocs.length > 0,
      sourceIds,
    };
  } catch (err) {
    log.error('retrieveLegalContext exception', { error: err });
    return emptyResult;
  }
}

/**
 * Valida que a resposta do LLM cita APENAS fontes que estão no contexto recuperado.
 * Retorna lista de citações inválidas (fora do contexto).
 */
export function validateCitations(
  aiResponse: string,
  validSourceIds: Set<string>
): { isValid: boolean; invalidCitations: string[] } {
  if (validSourceIds.size === 0) {
    return { isValid: true, invalidCitations: [] };
  }

  const invalidCitations: string[] = [];

  // Pre-normalize valid source IDs to uppercase for O(1) lookup
  const normalizedValidIds = new Set(
    [...validSourceIds].map((id) => id.toUpperCase())
  );

  // Extract source_ids cited in the response
  // Patterns: "ID: XXX", "source_id: XXX", or inline "XXX" that look like our IDs
  const citationPatterns = [
    /(?:ID|source_id|Fonte|Source):\s*([A-Z0-9_]+(?:_[A-Z0-9]+)*)/gi,
    /\b(STJ_SUM_\d+|TST_SUM_\d+|STF_SUM_(?:VINC_)?\d+|RESP_\d+|TEMA_\d+_\w+|LEI_\d+_ART\d+)\b/g,
  ];

  const citedIds = new Set<string>();
  for (const pattern of citationPatterns) {
    pattern.lastIndex = 0; // Reset /g flag state
    let match;
    while ((match = pattern.exec(aiResponse)) !== null) {
      if (match[1]) citedIds.add(match[1].toUpperCase());
    }
  }

  for (const citedId of citedIds) {
    if (!normalizedValidIds.has(citedId)) {
      invalidCitations.push(citedId);
    }
  }

  return {
    isValid: invalidCitations.length === 0,
    invalidCitations,
  };
}

/**
 * System prompt constraints for RAG-enforced legal analysis.
 * Appended to the LegalAgent's system prompt when context is available.
 */
export function getRAGSystemConstraints(hasContext: boolean): string {
  if (!hasContext) {
    return `
RESTRIÇÃO CRÍTICA: Não há jurisprudência recuperada da base oficial para esta consulta.
Você DEVE responder informando que não há dados oficiais na base para responder com segurança.
NÃO INVENTE ou cite qualquer lei, súmula ou julgado de memória.
Responda com: "${TRUST_ENGINE_FALLBACK}"`;
  }

  return `
RESTRIÇÕES RAG (OBRIGATÓRIAS):
1. Você DEVE basear sua análise jurídica EXCLUSIVAMENTE no bloco [JURISPRUDÊNCIA RECUPERADA DA BASE OFICIAL] fornecido abaixo.
2. Se o bloco não contiver evidência suficiente para uma conclusão, diga explicitamente que não há dados oficiais na base.
3. NÃO INVENTE leis, súmulas ou julgados que não estejam no bloco fornecido.
4. NÃO cite leis, súmulas ou julgados de memória — apenas os que estão no contexto recuperado.
5. Inclua SEMPRE no final uma seção "Jurisprudência Mapeada" listando as fontes exatas usadas (URL + source_id + tribunal/ano).
6. Se precisar complementar com conhecimento geral de direito (ex: procedimentos, prazos), marque explicitamente como "conhecimento geral" vs. "base oficial".`;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function deduplicateBySource(docs: LegalDocument[], maxPerSource: number): LegalDocument[] {
  const countBySource = new Map<string, number>();
  const result: LegalDocument[] = [];

  for (const doc of docs) {
    const count = countBySource.get(doc.source_id) || 0;
    if (count < maxPerSource) {
      result.push(doc);
      countBySource.set(doc.source_id, count + 1);
    }
  }

  return result;
}

function formatContextBlock(docs: LegalDocument[]): {
  contextBlock: string;
  includedDocs: LegalDocument[];
} {
  const lines: string[] = [];
  const includedDocs: LegalDocument[] = [];
  let totalChars = 0;

  lines.push('[JURISPRUDÊNCIA RECUPERADA DA BASE OFICIAL]');

  for (const doc of docs) {
    // Truncate content per doc
    const truncatedContent =
      doc.content.length > MAX_CONTENT_CHARS_PER_DOC
        ? doc.content.substring(0, MAX_CONTENT_CHARS_PER_DOC) + '...'
        : doc.content;

    const entry = [
      `- ID: ${doc.source_id}`,
      `  Tipo: ${doc.source_type}`,
      `  Fonte: ${doc.metadata.url || 'N/A'}`,
      `  Tribunal/Ano: ${doc.metadata.tribunal || 'N/A'}/${doc.metadata.year || 'N/A'}`,
      `  Similaridade: ${(doc.similarity * 100).toFixed(1)}%`,
      `  Trecho: ${truncatedContent}`,
    ].join('\n');

    // Check total context limit
    if (totalChars + entry.length > MAX_TOTAL_CONTEXT_CHARS) {
      break;
    }

    lines.push(entry);
    includedDocs.push(doc);
    totalChars += entry.length;
  }

  lines.push('[/JURISPRUDÊNCIA RECUPERADA DA BASE OFICIAL]');

  return {
    contextBlock: lines.join('\n\n'),
    includedDocs,
  };
}
