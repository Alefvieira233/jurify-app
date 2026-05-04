/**
 * 🔍 EXTRACT WHATSAPP DATA - Edge Function
 *
 * Extrai dados estruturados (nome, CPF, CNPJ, telefone, email, endereço,
 * processo judicial CNJ, área jurídica) de uma conversa WhatsApp via
 * function-calling OpenAI. Útil pra popular lead/contrato automaticamente.
 *
 * Body:
 *  - conversationId: uuid
 *
 * Returns: { extracted: { nome?, cpf?, cnpj?, ... }, confidence }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

interface Request { conversationId: string; }

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    nome: { type: "string", description: "Nome completo do cliente, se mencionado" },
    cpf: { type: "string", description: "CPF formatado 000.000.000-00 ou apenas dígitos" },
    cnpj: { type: "string", description: "CNPJ se for pessoa jurídica" },
    rg: { type: "string", description: "RG se mencionado" },
    telefone_alternativo: { type: "string", description: "Telefone diferente do WhatsApp atual" },
    email: { type: "string", description: "Email do cliente" },
    endereco: { type: "string", description: "Endereço completo (rua, número, bairro, cidade, CEP)" },
    cidade: { type: "string" },
    estado: { type: "string", description: "UF, ex: SP, RJ" },
    cep: { type: "string", description: "CEP formato 00000-000" },
    profissao: { type: "string" },
    estado_civil: { type: "string" },
    processo_numero: { type: "string", description: "Número CNJ formato 0000000-00.0000.0.00.0000" },
    area_juridica: { type: "string", description: "trabalhista, civel, familia, criminal, tributario, empresarial, previdenciario, consumidor, outros" },
    valor_causa: { type: "number", description: "Valor da causa em reais, se mencionado" },
    urgencia: { type: "string", enum: ["baixa", "media", "alta", "critica"], description: "Nível de urgência inferido do tom" },
    observacoes: { type: "string", description: "Notas adicionais relevantes pro advogado" },
  },
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Você é um extrator de dados jurídicos preciso. Analise a conversa e extraia APENAS dados explicitamente mencionados pelo cliente. NÃO invente, NÃO infira além do explícito.

Regras estritas:
- CPF/CNPJ/CEP/processo: extraia se mencionado, mesmo formato livre. Não valide.
- Endereço: junte tudo em um campo. Cidade/UF/CEP separados se também mencionados.
- Área jurídica: classifique pelo conteúdo. Use lowercase.
- Urgência: julgue pelo tom (palavras tipo "urgente", "audiência amanhã", "prazo expirando" → alta/crítica).
- Se um campo NÃO foi mencionado, NÃO inclua no output.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const rl = await applyRateLimit(req, { maxRequests: 20, windowSeconds: 60, namespace: "wa-extract" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as Request;
    if (!body.conversationId) throw new Error("conversationId obrigatório");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    // Pega últimas 100 mensagens da conversa
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("sender, content")
      .eq("conversation_id", body.conversationId)
      .eq("tenant_id", tenantId)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (!msgs || msgs.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Conversa sem mensagens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 });
    }

    const transcript = ((msgs as Array<{ sender: string; content: string | null }>) || [])
      .reverse()
      .filter(m => m.content)
      .map(m => {
        const who = m.sender === "lead" || m.sender === "user" || m.sender === "cliente" ? "Cliente" : "Advogado";
        return `[${who}]: ${(m.content || "").slice(0, 800)}`;
      })
      .join("\n");

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extraia dados desta conversa:\n\n${transcript}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_client_data",
            description: "Extrai dados estruturados do cliente da conversa",
            parameters: EXTRACTION_SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_client_data" } },
        max_tokens: 600,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error(`[extract] OpenAI HTTP ${openaiRes.status}:`, errBody.slice(0, 400));
      throw new Error("Falha ao extrair dados");
    }

    const oa = await openaiRes.json();
    const toolCall = oa?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) throw new Error("OpenAI não retornou dados estruturados");

    let extracted: Record<string, unknown> = {};
    try { extracted = JSON.parse(argsStr); }
    catch { throw new Error("Falha ao parsear resposta da IA"); }

    const tokensUsed = oa?.usage?.total_tokens ?? null;
    const fieldsExtracted = Object.keys(extracted).length;

    return new Response(JSON.stringify({
      success: true,
      extracted,
      fields_count: fieldsExtracted,
      messages_analyzed: msgs.length,
      tokens_used: tokensUsed,
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[extract-whatsapp-data] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatório") || msg.includes("sem mensagens") ? 400
                 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
