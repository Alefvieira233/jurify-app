import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateEmbedding } from "./embeddings.ts";

export interface LegalContext {
  processos: Array<{
    id: string;
    numero_processo: string | null;
    tipo_acao: string;
    fase_processual: string;
    status: string;
    tribunal: string | null;
  }>;
  prazos_urgentes: Array<{
    id: string;
    tipo: string;
    descricao: string;
    data_prazo: string;
    dias_restantes: number;
    status: string;
  }>;
  honorarios: Array<{
    tipo: string;
    valor_total_acordado: number | null;
    valor_recebido: number | null;
    status: string;
  }>;
  documentos_count: number;
  has_context: boolean;
  memories: Array<{ content: string; importance: number }>;
}

export async function buildLegalContext(
  supabase: ReturnType<typeof createClient>,
  leadId: string | null,
  tenantId: string,
  userMessage: string,
): Promise<LegalContext> {
  if (!leadId) {
    return {
      processos: [],
      prazos_urgentes: [],
      honorarios: [],
      documentos_count: 0,
      has_context: false,
      memories: [],
    };
  }

  const [processosRes, prazosRes, honorariosRes, docsRes] = await Promise.allSettled([
    supabase
      .from("processos")
      .select("id, numero_processo, tipo_acao, fase_processual, status, tribunal")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .eq("status", "ativo")
      .limit(5),
    supabase
      .from("prazos_processuais")
      .select("id, tipo, descricao, data_prazo, status")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .eq("status", "pendente")
      .gte("data_prazo", new Date().toISOString())
      .lte("data_prazo", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("data_prazo", { ascending: true })
      .limit(5),
    supabase
      .from("honorarios")
      .select("tipo, valor_total_acordado, valor_recebido, status")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .neq("status", "cancelado")
      .limit(3),
    supabase
      .from("documentos_juridicos")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId),
  ]);

  const processos = processosRes.status === "fulfilled" ? (processosRes.value.data ?? []) : [];
  const prazosRaw = prazosRes.status === "fulfilled" ? (prazosRes.value.data ?? []) : [];
  const prazos = prazosRaw.map((p) => ({
    ...p,
    dias_restantes: Math.ceil(
      (new Date(p.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  }));
  const honorarios = honorariosRes.status === "fulfilled" ? (honorariosRes.value.data ?? []) : [];
  const documentos_count = docsRes.status === "fulfilled" ? (docsRes.value.count ?? 0) : 0;

  // Semantic memory recall (non-blocking — skip on error)
  let memories: Array<{ content: string; importance: number }> = [];
  try {
    const embedding = await generateEmbedding(userMessage);
    const { data: memData } = await supabase.rpc("search_agent_memory", {
      query_embedding: embedding,
      p_tenant_id: tenantId,
      p_lead_id: leadId,
      p_limit: 3,
      p_threshold: 0.75,
    });
    memories = (memData ?? []).map((m: { content: string; importance: number }) => ({
      content: m.content,
      importance: m.importance,
    }));
  } catch {
    // Memory search is non-critical — continue without it
  }

  return {
    processos,
    prazos_urgentes: prazos,
    honorarios,
    documentos_count,
    has_context: processos.length > 0,
    memories,
  };
}
