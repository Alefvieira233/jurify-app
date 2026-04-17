import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";
import { ORCHESTRATOR_PROMPT, AGENTS, type AgentDefinition } from "../_shared/agent-prompts.ts";
import { withRetry } from "../_shared/openai-retry.ts";

interface OrchestratorRequest {
  messageText: string;
  hasLegalContext: boolean;
  hasMedia: boolean;
  mediaCategory: string;
  isFirstContact: boolean;
  leadId: string | null;
  tenantId: string;
}

interface OrchestratorResponse {
  agent: string;
  agentDefinition: AgentDefinition;
  reason: string;
  durationMs: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: require service-role key (timing-safe comparison)
  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit even for service-role calls to prevent unbounded OpenAI spend
  const rateLimitCheck = await applyRateLimit(req, {
    maxRequests: 20,
    windowSeconds: 60,
    namespace: "agent-orchestrator",
  }, { user: { id: "service-role" }, corsHeaders });
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response;
  }

  const startTime = Date.now();

  try {
    const body: OrchestratorRequest = await req.json();

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const contextSummary = JSON.stringify({
      has_legal_context: body.hasLegalContext,
      has_media: body.hasMedia,
      media_category: body.mediaCategory,
      is_first_contact: body.isFirstContact,
      message_preview: body.messageText.substring(0, 300),
    });

    const response = await withRetry(
      () => openai.chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        messages: [
          { role: "system", content: ORCHESTRATOR_PROMPT },
          { role: "user", content: `CONTEXTO:\n${contextSummary}\n\nMENSAGEM DO CLIENTE:\n${body.messageText.substring(0, 500)}` },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
      { label: "orchestrator", retries: 2, baseMs: 300 }
    );

    const resultText = response.choices[0]?.message?.content || '{"agent":"recepcionista","reason":"fallback"}';

    let routing: { agent: string; reason: string };
    try {
      routing = JSON.parse(resultText);
    } catch {
      // Smart fallback: use available context instead of always defaulting to recepcionista
      const fallbackAgent = body.hasMedia ? "analista_documentos"
        : body.hasLegalContext ? "juridico"
        : body.isFirstContact ? "recepcionista"
        : "juridico";
      console.error(`[orchestrator] JSON parse FAILED — smart fallback to "${fallbackAgent}" | raw: ${resultText.substring(0, 100)}`);
      routing = { agent: fallbackAgent, reason: `JSON parse fallback (context: media=${body.hasMedia}, legal=${body.hasLegalContext}, first=${body.isFirstContact})` };
    }

    // Validate agent exists
    const agentKey = routing.agent.toLowerCase();
    const agentDef = AGENTS[agentKey] || AGENTS.recepcionista!;
    const finalAgent = AGENTS[agentKey] ? agentKey : "recepcionista";

    const durationMs = Date.now() - startTime;
    console.log(`[orchestrator] Routed to "${finalAgent}" in ${durationMs}ms: ${routing.reason}`);

    const result: OrchestratorResponse = {
      agent: finalAgent,
      agentDefinition: agentDef,
      reason: routing.reason,
      durationMs,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[orchestrator] ERROR: ${errorMsg}`);

    // On total failure, fallback to juridico (most common need for a law firm)
    // The webhook caller also has its own fallback using legalCtx
    const fallbackAgent = "juridico";
    return new Response(
      JSON.stringify({
        agent: fallbackAgent,
        agentDefinition: AGENTS[fallbackAgent] || AGENTS.recepcionista,
        reason: `Orchestrator error fallback: ${errorMsg}`,
        durationMs: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
