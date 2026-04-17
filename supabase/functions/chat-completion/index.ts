// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";
import { sanitizeInput } from "../_shared/security.ts";
import { callOpenAI, BudgetExceededError, getOpenAIClient } from "../_shared/ai-caller.ts";
import { withRetry } from "../_shared/openai-retry.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateLimitCheck = await applyRateLimit(
      req,
      {
        maxRequests: 20,
        windowSeconds: 60,
        namespace: "chat-completion",
      },
      {
        supabase: supabaseClient,
        user,
        corsHeaders,
      }
    );

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    // Resolve tenant_id once — budget enforcement is centralized in ai-caller
    // (callOpenAI). Streaming mode still runs a pre-check below.
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: profile } = await supabaseService.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = profile?.tenant_id as string | undefined;

    const { messages, model: requestedModel = DEFAULT_OPENAI_MODEL, temperature = 0.7, stream = false } =
      await req.json();

    // SEC-02: Sanitize user-role messages to prevent prompt injection
    const sanitizedMessages = messages.map((msg: { role: string; content: string }) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        const result = sanitizeInput(msg.content, 4000);
        if (!result.safe) {
          throw new Error('Message rejected: potential prompt injection');
        }
        return { ...msg, content: result.text };
      }
      return msg;
    });

    // SECURITY: Whitelist de modelos permitidos para evitar custos excessivos
    const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo', DEFAULT_OPENAI_MODEL];
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_OPENAI_MODEL;

    // Streaming path: ai-caller is non-streaming (it needs usage metadata that
    // OpenAI only returns on completion). For stream=true we:
    //   1. Run the budget check ourselves (same signature as ai-caller).
    //   2. Use the shared OpenAI client singleton.
    //   3. Record token usage AFTER the stream closes (OpenAI returns usage on
    //      the final chunk when stream_options.include_usage=true).
    if (stream) {
      if (tenantId) {
        const { checkBudgetBeforeCall } = await import("../_shared/ai-budget.ts");
        const decision = await checkBudgetBeforeCall(supabaseService, tenantId, model);
        if (!decision.allowed) {
          return new Response(
            JSON.stringify({
              error: "Limite de IA atingido",
              message: decision.reason,
              code: decision.scope === "monthly" ? "PLAN_LIMIT_EXCEEDED" : "DAILY_BUDGET_EXCEEDED",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const encoder = new TextEncoder();
      const openai = getOpenAIClient();
      // Note: stream=true returns an AsyncIterable, but the initial connection
      // can still fail transiently — retry only the create() call.
      const streamResponse = await withRetry(
        () => openai.chat.completions.create({
          model,
          messages: sanitizedMessages,
          temperature,
          stream: true,
          stream_options: { include_usage: true },
        }),
        { label: "chat-completion-stream" }
      );

      const readableStream = new ReadableStream({
        async start(controller) {
          let streamUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
          try {
            for await (const chunk of streamResponse) {
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
              // Final chunk with usage (stream_options.include_usage=true).
              // deno-lint-ignore no-explicit-any
              if ((chunk as any).usage) streamUsage = (chunk as any).usage;
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (streamError) {
            console.error("Streaming error:", streamError);
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "stream_error" })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } finally {
            // Record usage after the stream closes. Non-blocking — never breaks the response.
            if (tenantId && streamUsage) {
              try {
                const { recordTokenUsage } = await import("../_shared/ai-budget.ts");
                await recordTokenUsage(supabaseService, {
                  tenant_id: tenantId,
                  user_id: user.id,
                  model,
                  tokens_in: streamUsage.prompt_tokens ?? 0,
                  tokens_out: streamUsage.completion_tokens ?? 0,
                  source: "chat-completion",
                });
              } catch (err) {
                console.error("[chat-completion:stream] recordTokenUsage failed:", err);
              }
            }
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
        status: 200,
      });
    }

    // Non-streaming: unified ai-caller handles budget + retry + ai_usage + logs.
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const aiResult = await callOpenAI(supabaseService, {
      tenantId,
      userId: user.id,
      model,
      messages: sanitizedMessages,
      temperature,
      source: "chat-completion",
    });

    return new Response(JSON.stringify({ reply: aiResult.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return new Response(
        JSON.stringify({
          error: error.decision.reason ?? error.message,
          code: error.scope === "monthly" ? "PLAN_LIMIT_EXCEEDED" : "DAILY_BUDGET_EXCEEDED",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.error("Error in chat-completion:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
