import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";
import { ORCHESTRATOR_PROMPT, AGENTS, type AgentDefinition } from "../_shared/agent-prompts.ts";

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

    const response = await openai.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [
        { role: "system", content: ORCHESTRATOR_PROMPT },
        { role: "user", content: `CONTEXTO:\n${contextSummary}\n\nMENSAGEM DO CLIENTE:\n${body.messageText.substring(0, 500)}` },
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0]?.message?.content || '{"agent":"recepcionista","reason":"fallback"}';

    let routing: { agent: string; reason: string };
    try {
      routing = JSON.parse(resultText);
    } catch {
      console.warn("[orchestrator] Failed to parse routing JSON, using fallback");
      routing = { agent: "recepcionista", reason: "JSON parse fallback" };
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

    return new Response(
      JSON.stringify({
        agent: "recepcionista",
        agentDefinition: AGENTS.recepcionista,
        reason: `Orchestrator error fallback: ${errorMsg}`,
        durationMs: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
