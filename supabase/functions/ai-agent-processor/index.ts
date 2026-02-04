/**
 * ðŸš€ JURIFY AI AGENT PROCESSOR - EDGE FUNCTION
 *
 * Edge Function segura para processar requisiÃ§Ãµes de IA dos agentes.
 * Todas as chamadas para OpenAI sÃ£o feitas aqui no servidor, protegendo a API key.
 *
 * @version 2.0.0
 * @security Enterprise Grade
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { initSentry, captureError } from "../_shared/sentry.ts";

// 🚀 INIT SENTRY
initSentry();

// ðŸ”’ CORS Headers

// ðŸŽ¯ TIPOS DE REQUISIÃ‡ÃƒO
interface AgentAIRequest {
  agentName: string;
  agentSpecialization: string;
  systemPrompt: string;
  userPrompt: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  leadId?: string;
  tenantId?: string;
  userId?: string;
  // Function Calling Support
  tools?: any[];
  tool_choice?: "auto" | "none" | any;
}

interface AgentAIResponse {
  result: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  agentName: string;
  timestamp: string;
  // Function Calling Result
  tool_calls?: any[];
}

// ðŸ›¡ï¸ ValidaÃ§Ã£o de Input
function validateRequest(data: unknown): data is AgentAIRequest {
  const req = data as Partial<AgentAIRequest>;

  if (!req.agentName || typeof req.agentName !== "string") {
    throw new Error("agentName is required and must be a string");
  }

  if (!req.agentSpecialization || typeof req.agentSpecialization !== "string") {
    throw new Error("agentSpecialization is required and must be a string");
  }

  if (!req.systemPrompt || typeof req.systemPrompt !== "string") {
    throw new Error("systemPrompt is required and must be a string");
  }

  if (!req.userPrompt || typeof req.userPrompt !== "string") {
    throw new Error("userPrompt is required and must be a string");
  }

  return true;
}

// ðŸ§  Processa requisiÃ§Ã£o de IA
async function processAIRequest(
  openai: OpenAI,
  request: AgentAIRequest
): Promise<AgentAIResponse> {
  const {
    agentName,
    agentSpecialization,
    systemPrompt,
    userPrompt,
    context,
    model = "gpt-4-turbo-preview",
    temperature = 0.7,
    maxTokens = 1500,
    tools,
    tool_choice,
  } = request;

  console.log(`ðŸ¤– Processing AI request for agent: ${agentName} [Tools: ${tools ? tools.length : 0}]`);

  // Monta mensagens para a OpenAI
  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `VocÃª Ã© ${agentName}, especialista em ${agentSpecialization}. ${systemPrompt}`,
    },
  ];

  // Adiciona contexto se fornecido
  if (context && Object.keys(context).length > 0) {
    messages.push({
      role: "user",
      content: `Contexto: ${JSON.stringify(context, null, 2)}`,
    });
  }

  messages.push({
    role: "user",
    content: userPrompt,
  });

  // Chama OpenAI
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    tools,
    tool_choice,
  });

  const result = completion.choices[0]?.message?.content || "";
  const toolCalls = completion.choices[0]?.message?.tool_calls;

  return {
    result,
    tool_calls: toolCalls,
    usage: completion.usage
      ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      }
      : undefined,
    model: completion.model,
    agentName,
    timestamp: new Date().toISOString(),
  };
}

// ðŸ†” Gera execution_id Ãºnico
function generateExecutionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `exec_${timestamp}_${random}`;
}

// ðŸ“ Cria registro de execuÃ§Ã£o no banco
async function createExecution(
  supabase: ReturnType<typeof createClient>,
  executionId: string,
  request: AgentAIRequest,
  userId?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("agent_executions")
      .insert({
        execution_id: executionId,
        lead_id: request.leadId || null,
        tenant_id: request.tenantId || null,
        user_id: userId || null,
        status: "processing",
        current_agent: request.agentName,
        agents_involved: [request.agentName],
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating execution:", error);
      return null;
    } else {
      console.log(`Execution created: ${executionId}`);
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Error creating execution:", error);
    return null;
  }
}

// âœ… Atualiza execuÃ§Ã£o com sucesso
async function completeExecution(
  supabase: ReturnType<typeof createClient>,
  executionId: string,
  startTime: number,
  tokensUsed: number
): Promise<void> {
  try {
    const duration = Date.now() - startTime;

    await supabase
      .from("agent_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_duration_ms: duration,
        total_tokens: tokensUsed,
      })
      .eq("execution_id", executionId);

    console.log(`âœ… Execution completed: ${executionId} (${duration}ms)`);
  } catch (error) {
    console.error("âŒ Error completing execution:", error);
  }
}

// âŒ Atualiza execuÃ§Ã£o com erro
async function failExecution(
  supabase: ReturnType<typeof createClient>,
  executionId: string,
  errorMessage: string
): Promise<void> {
  try {
    await supabase
      .from("agent_executions")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("execution_id", executionId);

    console.log(`âŒ Execution failed: ${executionId}`);
  } catch (error) {
    console.error("âŒ Error failing execution:", error);
  }
}

// ðŸ“Š Salva log de processamento no banco
async function logAIProcessing(
  supabase: ReturnType<typeof createClient>,
  executionRowId: string | null,
  request: AgentAIRequest,
  response: AgentAIResponse,
  userId?: string
): Promise<void> {
  try {
    if (!executionRowId) {
      console.warn("Skipping AI log insert: execution row id not available");
      return;
    }

    await supabase.from("agent_ai_logs").insert({
      execution_id: executionRowId,
      agent_name: request.agentName,
      lead_id: request.leadId || null,
      tenant_id: request.tenantId || null,
      user_id: userId || null,
      model: response.model,
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
      result_preview: response.result.substring(0, 200),
      // Advanced Logging (LangSmith Style)
      system_prompt: request.systemPrompt,
      user_prompt: request.userPrompt,
      full_result: response.result,
      context: request.context || null,
      created_at: new Date().toISOString(),
    });

    console.log(`AI processing logged for execution row: ${executionRowId}`);
  } catch (error) {
    console.error("Error logging AI processing:", error);
    // Nao interrompe o fluxo se falhar o log
  }
}

// ðŸš€ HANDLER PRINCIPAL
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ðŸ” VerificaÃ§Ã£o de autenticaÃ§Ã£o
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Inicializa Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const isServiceRoleRequest = authHeader === `Bearer ${supabaseServiceKey}`;
    let user: { id: string } | null = null;

    if (!isServiceRoleRequest) {
      // Verifica usuario autenticado
      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

      if (authError || !authenticatedUser) {
        throw new Error("Unauthorized: Invalid token");
      }

      user = authenticatedUser;
      console.log("Authenticated user: " + user.id);
    } else {
      console.log("Internal service role request");
    }

    // Parse e valida request
    const requestData = await req.json();
    validateRequest(requestData);

    const aiRequest = requestData as AgentAIRequest;

    if (!aiRequest.tenantId) {
      throw new Error("tenantId is required");
    }

    const rateLimitUser = isServiceRoleRequest
      ? { id: aiRequest.userId || `tenant:${aiRequest.tenantId}` }
      : user;

    // Rate Limiting - Protege custos da OpenAI
    // Limite: 20 requisicoes de IA por minuto por usuario
    const rateLimitCheck = await applyRateLimit(
      req,
      {
        maxRequests: 20,
        windowSeconds: 60,
        namespace: "ai-agent",
      },
      {
        supabase,
        user: rateLimitUser || undefined,
        corsHeaders,
      }
    );

    if (!rateLimitCheck.allowed) {
      console.warn(
        "Rate limit exceeded for user " + (rateLimitUser?.id || "unknown") + ":",
        rateLimitCheck.result
      );
      return rateLimitCheck.response;
    }

    console.log(
      "Rate limit OK: " + rateLimitCheck.result.remaining + "/" + rateLimitCheck.result.limit + " remaining"
    );

    // Verifica API Key da OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const executionId = generateExecutionId();
    const startTime = Date.now();
    const executionRowId = await createExecution(
      supabase,
      executionId,
      aiRequest,
      user?.id || aiRequest.userId || null
    );

    try {
      // ðŸ¤– Inicializa OpenAI
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      // ðŸ§  Processa requisiÃ§Ã£o de IA
      const aiResponse = await processAIRequest(openai, aiRequest);

      // âœ… Atualiza execuÃ§Ã£o com sucesso
      const tokensUsed = aiResponse.usage?.total_tokens || 0;
      await completeExecution(supabase, executionId, startTime, tokensUsed);

      // ðŸ“Š Salva log (nÃ£o-bloqueante)
      logAIProcessing(
        supabase,
        executionRowId,
        aiRequest,
        aiResponse,
        user?.id || aiRequest.userId || null
      ).catch(console.error);

      // âœ… Retorna resposta com execution_id
      return new Response(
        JSON.stringify({
          ...aiResponse,
          executionId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (processingError) {
      // âŒ Marca execuÃ§Ã£o como falha
      const errorMsg =
        processingError instanceof Error
          ? processingError.message
          : "Unknown processing error";
      await failExecution(supabase, executionId, errorMsg);

      throw processingError;
    }
  } catch (error) {
    console.error("âŒ Error in ai-agent-processor:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});





