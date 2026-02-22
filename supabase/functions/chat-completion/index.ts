// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";

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

    const { messages, model: requestedModel = DEFAULT_OPENAI_MODEL, temperature = 0.7, stream = false } =
      await req.json();

    // SECURITY: Whitelist de modelos permitidos para evitar custos excessivos
    const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo', DEFAULT_OPENAI_MODEL];
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_OPENAI_MODEL;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    const openai = new OpenAI({
      apiKey,
    });

    console.log(`Processing chat completion with model ${model}`);

    if (stream) {
      const encoder = new TextEncoder();
      const streamResponse = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        stream: true,
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
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

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
    });

    const reply = completion.choices[0]?.message?.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in chat-completion function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
