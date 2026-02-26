/**
 * assistant — Edge Function (AI Assistant) v2
 *
 * Enterprise-grade conversational agent for Jurify.
 * Features: cache, rate limiting, input sanitisation, PII redaction,
 * audit trail, exponential backoff retry, enhanced tools,
 * and structured logging.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCache, setCache, CACHE_TTL } from "../_shared/cache.ts";
import { rateLimit, sanitizeInput, redactPII, auditLog } from "../_shared/security.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssistantRequest {
  message: string;
  userId: string;
  conversationId?: string;
}

interface ContextData {
  leads: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
  metrics: {
    leads_by_status: Record<string, number>;
    total_leads_30d: number;
    total_contracts: number;
    total_revenue: number;
    conversion_rate: number;
  };
}

// ---------------------------------------------------------------------------
// OpenAI tools definition
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Busca leads por nome, email, telefone, status ou área jurídica",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome, email ou telefone)" },
          status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "converted", "lost"] },
          legal_area: { type: "string", description: "Área jurídica" },
          limit: { type: "number", description: "Máximo de resultados (padrão: 10)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_metrics",
      description: "Obtém métricas agregadas do escritório (leads, receita, contratos, conversão)",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "quarter", "year"] },
          metric: { type: "string", enum: ["leads", "conversions", "revenue", "contracts", "all"] },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contracts",
      description: "Busca contratos por status, valor ou data",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Busca por nome do cliente" },
          status: { type: "string", enum: ["draft", "sent", "signed", "expired", "cancelled"] },
          min_value: { type: "number", description: "Valor mínimo em reais" },
          date_range: { type: "string", enum: ["last_7_days", "last_30_days", "last_90_days", "this_year"] },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Cria um novo lead no CRM",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do lead" },
          email: { type: "string", description: "Email do lead" },
          telefone: { type: "string", description: "Telefone do lead" },
          area_juridica: { type: "string", description: "Área jurídica" },
          mensagem: { type: "string", description: "Descrição do caso" },
        },
        required: ["nome"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503, headers: jsonHeaders });
  }

  let body: AssistantRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: jsonHeaders });
  }

  const { message, userId, conversationId } = body;
  if (!message || !userId) {
    return new Response(JSON.stringify({ error: "Missing message or userId" }), { status: 400, headers: jsonHeaders });
  }

  // ── Rate limiting ──
  if (!rateLimit(userId, 20, 60)) {
    return new Response(
      JSON.stringify({ error: "Limite de requisições excedido. Aguarde 1 minuto." }),
      { status: 429, headers: jsonHeaders }
    );
  }

  // ── Input sanitisation ──
  const sanitised = sanitizeInput(message);
  if (!sanitised.safe) {
    return new Response(
      JSON.stringify({ error: "Mensagem não permitida." }),
      { status: 400, headers: jsonHeaders }
    );
  }
  const safeMessage = sanitised.text;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  const toolsUsed: string[] = [];

  // ── Resolve profile (cached) ──
  const profileCacheKey = `profile:${userId}`;
  let profile = getCache<{ tenant_id: string; nome_completo: string }>(profileCacheKey);
  if (!profile) {
    const { data } = await supabase.from("profiles").select("tenant_id, nome_completo").eq("id", userId).single();
    if (!data?.tenant_id) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: jsonHeaders });
    }
    profile = { tenant_id: data.tenant_id, nome_completo: data.nome_completo ?? "Advogado(a)" };
    setCache(profileCacheKey, profile, CACHE_TTL.PROFILE);
  }

  const { tenant_id: tenantId, nome_completo: userName } = profile;

  try {
    // ── 1. Fetch context (cached) ──
    const context = await fetchContextCached(supabase, tenantId);

    // ── 2. System prompt ──
    const systemPrompt = buildSystemPrompt(userName, context);

    // ── 3. First OpenAI call ──
    const firstResult = await callOpenAIWithRetry(openaiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: safeMessage },
    ]);

    let finalText: string;
    const firstChoice = firstResult.choices?.[0]?.message;

    // ── 4. Handle tool calls ──
    if (firstChoice?.tool_calls?.length) {
      const toolMessages = [];
      for (const tc of firstChoice.tool_calls) {
        toolsUsed.push(tc.function.name);
        const result = await executeTool(supabase, tenantId, tc.function.name, tc.function.arguments);
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      const secondResult = await callOpenAIWithRetry(openaiKey, [
        { role: "system", content: systemPrompt },
        { role: "user", content: safeMessage },
        firstChoice,
        ...toolMessages,
      ]);

      finalText = secondResult.choices?.[0]?.message?.content ?? "Desculpe, não consegui processar.";
    } else {
      finalText = firstChoice?.content ?? "Desculpe, não consegui processar.";
    }

    // ── 5. PII redaction ──
    finalText = redactPII(finalText);

    const responseTimeMs = Date.now() - startTime;

    // ── 6. Audit log (fire-and-forget) ──
    auditLog(supabase, {
      user_id: userId,
      tenant_id: tenantId,
      action: "assistant_query",
      query: safeMessage.slice(0, 500),
      response_time_ms: responseTimeMs,
      tools_used: toolsUsed,
      success: true,
    });

    return new Response(
      JSON.stringify({
        response: finalText,
        conversation_id: conversationId ?? null,
        response_time_ms: responseTimeMs,
        tools_used: toolsUsed,
        context_summary: {
          leads_count: context.leads.length,
          contracts_count: context.contracts.length,
          metrics: context.metrics,
        },
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[assistant] Error:", errorMsg);

    auditLog(supabase, {
      user_id: userId,
      tenant_id: tenantId,
      action: "assistant_query",
      query: safeMessage.slice(0, 500),
      response_time_ms: Date.now() - startTime,
      tools_used: toolsUsed,
      success: false,
      error: errorMsg,
    });

    // Graceful degradation: return friendly message instead of 500
    return new Response(
      JSON.stringify({
        response: "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns segundos.",
        error_code: "ASSISTANT_ERROR",
      }),
      { status: 200, headers: jsonHeaders }
    );
  }
});

// ---------------------------------------------------------------------------
// Context fetching with cache
// ---------------------------------------------------------------------------

async function fetchContextCached(supabase: any, tenantId: string): Promise<ContextData> {
  const cacheKey = `ctx:${tenantId}`;
  const cached = getCache<ContextData>(cacheKey);
  if (cached) return cached;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [leadsRes, contractsRes, metricsRes, revenueRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nome, email, telefone, status, area_juridica, valor_estimado, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(25),

    supabase
      .from("contratos")
      .select("id, cliente_nome, status, valor, data_assinatura, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(25),

    supabase
      .from("leads")
      .select("status")
      .eq("tenant_id", tenantId)
      .gte("created_at", thirtyDaysAgo),

    supabase
      .from("contratos")
      .select("valor")
      .eq("tenant_id", tenantId)
      .eq("status", "signed")
      .gte("created_at", thirtyDaysAgo),
  ]);

  const allLeadStatuses = metricsRes.data ?? [];
  const leadsByStatus: Record<string, number> = {};
  for (const l of allLeadStatuses) {
    leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
  }

  const totalLeads = allLeadStatuses.length;
  const converted = leadsByStatus["converted"] ?? 0;
  const totalRevenue = (revenueRes.data ?? []).reduce(
    (s: number, c: { valor?: number }) => s + (c.valor ?? 0),
    0
  );

  const context: ContextData = {
    leads: leadsRes.data ?? [],
    contracts: contractsRes.data ?? [],
    metrics: {
      leads_by_status: leadsByStatus,
      total_leads_30d: totalLeads,
      total_contracts: contractsRes.data?.length ?? 0,
      total_revenue: totalRevenue,
      conversion_rate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
    },
  };

  setCache(cacheKey, context, CACHE_TTL.METRICS);
  return context;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(userName: string, ctx: ContextData): string {
  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return `Você é o JurifyBot, assistente IA do escritório jurídico. Está conversando com ${userName}.

## Resumo do escritório (últimos 30 dias)
- **Leads totais:** ${ctx.metrics.total_leads_30d}
- **Por status:** ${Object.entries(ctx.metrics.leads_by_status).map(([s, n]) => \`\${s}: \${n}\`).join(", ") || "nenhum"}
- **Taxa de conversão:** ${ctx.metrics.conversion_rate}%
- **Contratos:** ${ctx.metrics.total_contracts}
- **Receita (assinados):** ${formatBRL(ctx.metrics.total_revenue)}

## Leads recentes
${ctx.leads.slice(0, 5).map((l: any) => \`- \${l.nome} | \${l.status} | \${l.area_juridica ?? "—"} | \${l.email ?? "—"}\`).join("\\n") || "Nenhum lead recente."}

## Contratos recentes
${ctx.contracts.slice(0, 3).map((c: any) => \`- \${c.cliente_nome} | \${c.status} | \${formatBRL(c.valor ?? 0)}\`).join("\\n") || "Nenhum contrato recente."}

## Regras
1. Responda **sempre em português brasileiro**, profissional e amigável.
2. Priorize dados concretos — números, datas, nomes.
3. Use as ferramentas (tools) para buscas específicas.
4. Se não souber, diga honestamente. Nunca invente dados.
5. Use formatação Markdown: **negrito**, listas, tabelas quando útil.
6. Valores monetários em R$ com formato brasileiro.
7. Nunca revele CPFs, RGs ou dados sensíveis completos.
8. Ao criar leads, confirme os dados com o usuário.
9. Seja conciso — máximo 3 parágrafos por resposta.`;
}

// ---------------------------------------------------------------------------
// OpenAI call with exponential backoff retry
// ---------------------------------------------------------------------------

async function callOpenAIWithRetry(
  apiKey: string,
  messages: any[],
  maxRetries = 2
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${apiKey}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 1000,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (res.ok) return await res.json();

    // Retry on 429 (rate limit) and 5xx
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(\`[assistant] OpenAI \${res.status}, retrying in \${Math.round(delay)}ms (attempt \${attempt + 1})\`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    const body = await res.text();
    throw new Error(\`OpenAI \${res.status}: \${body.slice(0, 200)}\`);
  }
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": return new Date(now.getTime() - 7 * 86_400_000);
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "year": return new Date(now.getFullYear(), 0, 1);
    default: return new Date(now.getTime() - 30 * 86_400_000);
  }
}

async function executeTool(
  supabase: any,
  tenantId: string,
  toolName: string,
  argsJson: string
): Promise<unknown> {
  const args = JSON.parse(argsJson);

  switch (toolName) {
    case "search_leads": {
      let q = supabase
        .from("leads")
        .select("id, nome, email, telefone, status, area_juridica, valor_estimado, created_at")
        .eq("tenant_id", tenantId);

      if (args.status) q = q.eq("status", args.status);
      if (args.legal_area) q = q.ilike("area_juridica", \`%\${args.legal_area}%\`);
      if (args.query) q = q.or(\`nome.ilike.%\${args.query}%,email.ilike.%\${args.query}%,telefone.ilike.%\${args.query}%\`);

      const { data } = await q.order("created_at", { ascending: false }).limit(args.limit ?? 10);
      return data ?? [];
    }

    case "get_metrics": {
      const start = getStartDate(args.period).toISOString();
      const metric = args.metric ?? "all";
      const result: Record<string, unknown> = {};

      if (metric === "leads" || metric === "all") {
        const { data } = await supabase.from("leads").select("status").eq("tenant_id", tenantId).gte("created_at", start);
        const byStatus: Record<string, number> = {};
        for (const l of data ?? []) byStatus[l.status] = (byStatus[l.status] || 0) + 1;
        result.leads_total = data?.length ?? 0;
        result.leads_by_status = byStatus;
      }
      if (metric === "contracts" || metric === "all") {
        const { data } = await supabase.from("contratos").select("id, status").eq("tenant_id", tenantId).gte("created_at", start);
        result.contracts_total = data?.length ?? 0;
      }
      if (metric === "revenue" || metric === "all") {
        const { data } = await supabase.from("contratos").select("valor").eq("tenant_id", tenantId).eq("status", "signed").gte("created_at", start);
        result.revenue_total = (data ?? []).reduce((s: number, c: any) => s + (c.valor ?? 0), 0);
      }
      if (metric === "conversions" || metric === "all") {
        const { data: allLeads } = await supabase.from("leads").select("status").eq("tenant_id", tenantId).gte("created_at", start);
        const total = allLeads?.length ?? 0;
        const conv = allLeads?.filter((l: any) => l.status === "converted").length ?? 0;
        result.conversion_rate = total > 0 ? Math.round((conv / total) * 100) : 0;
      }
      return result;
    }

    case "search_contracts": {
      let q = supabase
        .from("contratos")
        .select("id, cliente_nome, status, valor, data_assinatura, created_at")
        .eq("tenant_id", tenantId);

      if (args.query) q = q.ilike("cliente_nome", \`%\${args.query}%\`);
      if (args.status) q = q.eq("status", args.status);
      if (args.min_value) q = q.gte("valor", args.min_value);
      if (args.date_range) {
        const days = { last_7_days: 7, last_30_days: 30, last_90_days: 90, this_year: 365 }[args.date_range] ?? 30;
        q = q.gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString());
      }

      const { data } = await q.order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    }

    case "create_lead": {
      const { data, error } = await supabase.from("leads").insert({
        tenant_id: tenantId,
        nome: args.nome,
        email: args.email ?? null,
        telefone: args.telefone ?? null,
        area_juridica: args.area_juridica ?? null,
        mensagem: args.mensagem ?? null,
        status: "new",
        origem: "assistant",
      }).select("id, nome, status").single();

      if (error) return { success: false, error: error.message };
      return { success: true, lead: data };
    }

    default:
      return { error: \`Tool \${toolName} not found\` };
  }
}
