import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { downloadKapsoMedia, detectMediaCategory } from "../_shared/media-utils.ts";
import { DEFAULT_OPENAI_MODEL, WHISPER_MODEL } from "../_shared/ai-model.ts";
import { withRetry } from "../_shared/openai-retry.ts";
import { recordTokenUsage } from "../_shared/ai-budget.ts";

interface MediaProcessRequest {
  mediaUrl: string;
  messageType: string;
  caption?: string;
  fileName?: string;
  tenantId: string;
}

/** Heuristic token cost for Whisper — billed per-second, not per-token. We
 * convert seconds to a nominal token cost so ai_usage aggregates still reflect
 * spend pressure across providers. Whisper pricing (2026): ~$0.006/min ≈ $0.0001/sec,
 * roughly 1 Whisper second ≈ 4 gpt-4o-mini output tokens. We attribute 4 tokens/sec. */
function estimateWhisperTokens(durationSeconds: number): number {
  return Math.ceil(Math.max(1, durationSeconds) * 4);
}

interface MediaProcessResponse {
  extractedText: string;
  mediaCategory: string;
  processingMethod: string;
  durationMs: number;
}

/**
 * Transcribes audio using OpenAI Whisper API.
 * Returns the transcription and an estimated token cost (Whisper is billed
 * per-second — we convert to tokens so ai_usage still sums spend pressure).
 */
async function transcribeAudio(
  openai: OpenAI,
  base64Data: string,
  mimeType: string,
): Promise<{ text: string; estimatedTokens: number }> {
  const ext = mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("mpeg") || mimeType.includes("mpga") ? "mp3"
    : "ogg";

  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const file = new File([binaryData], `audio.${ext}`, { type: mimeType });
  // Whisper API doesn't return duration when response_format="text" — use
  // "verbose_json" to get it, then fall back to a byte-size heuristic.
  const transcription = await withRetry(
    () => openai.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: "pt",
      response_format: "verbose_json",
    }),
    { label: "media-processor:whisper" }
  );
  // deno-lint-ignore no-explicit-any
  const t = transcription as any;
  const text: string = typeof t === "string" ? t : (t?.text ?? "");
  const duration = typeof t?.duration === "number"
    ? t.duration
    : Math.max(1, binaryData.byteLength / 16_000); // rough: 16kB ≈ 1s of ogg-opus
  return { text, estimatedTokens: estimateWhisperTokens(duration) };
}

/**
 * Analyzes image using GPT-4o Vision.
 */
async function analyzeImage(
  openai: OpenAI,
  base64Data: string,
  mimeType: string,
  caption?: string,
): Promise<{ text: string; tokens_in: number; tokens_out: number }> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [];

  userContent.push({
    type: "image_url",
    image_url: { url: dataUrl, detail: "low" },
  });

  const promptText = caption
    ? `O cliente enviou esta imagem com a legenda: "${caption}". Descreva o conteúdo da imagem de forma objetiva, focando em informações relevantes para um escritório de advocacia (documentos, contratos, comprovantes, etc). Se for um documento, extraia o texto visível.`
    : `O cliente enviou esta imagem via WhatsApp. Descreva o conteúdo de forma objetiva, focando em informações relevantes para um escritório de advocacia. Se for um documento, extraia o texto visível. Se for uma foto pessoal ou algo não relacionado, descreva brevemente.`;

  userContent.push({ type: "text", text: promptText });

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [
        {
          role: "user",
          // deno-lint-ignore no-explicit-any
          content: userContent as any,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    }),
    { label: "media-processor:vision" }
  );

  const text = response.choices[0]?.message?.content || "[Não foi possível analisar a imagem]";
  return {
    text,
    tokens_in: response.usage?.prompt_tokens ?? 0,
    tokens_out: response.usage?.completion_tokens ?? 0,
  };
}

/**
 * Extracts text from PDF/document using the existing extract-document-text function.
 */
async function extractDocumentText(
  base64Data: string,
  fileName: string | null,
  mimeType: string,
): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/extract-document-text`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64: base64Data,
      filename: fileName,
      content_type: mimeType,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    throw new Error(`Document extraction failed: ${errText}`);
  }

  const result = await response.json();
  return result.text || "[Documento sem texto extraível]";
}

// --- MAIN HANDLER ---
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

  const startTime = Date.now();

  try {
    const body: MediaProcessRequest = await req.json();
    const { mediaUrl, messageType, caption, fileName, tenantId } = body;

    if (!mediaUrl) {
      return new Response(
        JSON.stringify({ extractedText: caption || "", mediaCategory: "text", processingMethod: "passthrough", durationMs: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[media-processor] Processing ${messageType} media from URL: ${mediaUrl.substring(0, 80)}...`);

    // Step 1: Download media
    const media = await downloadKapsoMedia(mediaUrl);
    const category = detectMediaCategory(media.mimeType);

    console.log(`[media-processor] Downloaded ${media.sizeBytes} bytes, detected: ${category} (${media.mimeType})`);

    // Step 2: Process based on category
    let extractedText: string;
    let processingMethod: string;
    let tokensIn = 0;
    let tokensOut = 0;
    let modelUsed: string | null = null;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");
    const openai = new OpenAI({ apiKey: openaiApiKey });

    switch (category) {
      case "audio": {
        const r = await transcribeAudio(openai, media.base64, media.mimeType);
        extractedText = `[Transcrição de áudio do cliente]: ${r.text}`;
        processingMethod = "whisper";
        // Whisper is output-only (transcription); attribute full estimate to completion tokens.
        tokensOut = r.estimatedTokens;
        modelUsed = WHISPER_MODEL;
        break;
      }
      case "image": {
        const r = await analyzeImage(openai, media.base64, media.mimeType, caption);
        extractedText = `[Análise de imagem enviada pelo cliente]: ${r.text}`;
        processingMethod = "gpt4o-vision";
        tokensIn = r.tokens_in;
        tokensOut = r.tokens_out;
        modelUsed = DEFAULT_OPENAI_MODEL;
        break;
      }
      case "pdf":
      case "document": {
        extractedText = await extractDocumentText(media.base64, media.fileName || fileName || null, media.mimeType);
        processingMethod = "extract-document-text";
        extractedText = `[Conteúdo do documento "${media.fileName || fileName || "arquivo"}" enviado pelo cliente]: ${extractedText}`;
        break;
      }
      default: {
        extractedText = caption || `[Arquivo ${messageType} recebido — formato não suportado para análise automática]`;
        processingMethod = "unsupported";
        break;
      }
    }

    // Record token usage for AI-powered paths (audio/image). Non-blocking — any
    // failure is swallowed because media-processor must never fail the webhook
    // just because usage accounting is unavailable.
    if (tenantId && modelUsed && (tokensIn > 0 || tokensOut > 0)) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await recordTokenUsage(supabase, {
          tenant_id: tenantId,
          model: modelUsed,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          source: "media-processor",
        });
      } catch (err) {
        console.error("[media-processor] recordTokenUsage failed:", err instanceof Error ? err.message : err);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[media-processor] Done in ${durationMs}ms via ${processingMethod}: "${extractedText.substring(0, 100)}..."`);

    const result: MediaProcessResponse = {
      extractedText,
      mediaCategory: category,
      processingMethod,
      durationMs,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[media-processor] ERROR: ${errorMsg}`);

    return new Response(
      JSON.stringify({
        extractedText: "[Não foi possível processar a mídia enviada]",
        mediaCategory: "error",
        processingMethod: "failed",
        durationMs: Date.now() - startTime,
        error: errorMsg,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
