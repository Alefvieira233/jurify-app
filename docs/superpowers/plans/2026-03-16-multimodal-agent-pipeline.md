# Multimodal Agent Pipeline - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WhatsApp understand images, audio, and PDFs, and orchestrate specialist agents to always respond intelligently.

**Architecture:** 3-stage pipeline: (1) `media-processor` downloads and converts all media to text, (2) `agent-orchestrator` decides which specialist handles the message, (3) specialist agents respond with domain-specific knowledge. The webhook becomes a thin controller calling each stage.

**Tech Stack:** OpenAI GPT-4o (Vision + Chat), Whisper API (audio transcription), Evolution API (media download), Deno Edge Functions, existing `extract-document-text` for PDFs.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/functions/media-processor/index.ts` | Downloads media from Evolution, routes to Whisper/Vision/PDF extraction, returns text |
| `supabase/functions/agent-orchestrator/index.ts` | Analyzes message + context, decides which specialist agent handles it |
| `supabase/functions/_shared/media-utils.ts` | Evolution media download helper, MIME detection, base64 encoding |
| `supabase/functions/_shared/agent-prompts.ts` | System prompts for all 6 specialist agents (single source of truth) |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Refactor `processNormalizedMessage` to call media-processor → orchestrator → specialist pipeline instead of inline OpenAI |
| `supabase/functions/_shared/ai-model.ts` | Add Whisper model constant |

### Unchanged (reused as-is)
| File | Role in pipeline |
|------|-----------------|
| `supabase/functions/extract-document-text/index.ts` | Called by media-processor for PDFs |
| `supabase/functions/_shared/legal-context.ts` | Called by orchestrator for legal context |
| `supabase/functions/_shared/embeddings.ts` | Used by legal-context for semantic search |
| `supabase/functions/_shared/rate-limiter.ts` | Used by webhook |
| `supabase/functions/_shared/cors.ts` | Used by all new functions |

---

## Chunk 1: Media Processor

### Task 1: Create `_shared/media-utils.ts` — Evolution media download helper

**Files:**
- Create: `supabase/functions/_shared/media-utils.ts`

- [ ] **Step 1: Create media download utility**

```typescript
// supabase/functions/_shared/media-utils.ts
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
  fileName: string | null;
  sizeBytes: number;
}

const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Downloads media from Evolution API.
 * Evolution stores media and exposes it via the message's mediaUrl field.
 * The URL is a direct download link that requires the API key.
 */
export async function downloadEvolutionMedia(
  mediaUrl: string,
): Promise<DownloadedMedia> {
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

  const headers: Record<string, string> = {};
  // If the URL is from the Evolution API server, add auth
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
  if (evolutionApiUrl && mediaUrl.startsWith(evolutionApiUrl)) {
    headers["apikey"] = evolutionApiKey || "";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(mediaUrl, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Media download failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > MAX_MEDIA_SIZE) {
    throw new Error(`Media too large: ${buffer.byteLength} bytes (max ${MAX_MEDIA_SIZE})`);
  }

  const disposition = response.headers.get("content-disposition");
  let fileName: string | null = null;
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?(?:;|$)/);
    if (match?.[1]) fileName = match[1];
  }

  return {
    base64: base64Encode(new Uint8Array(buffer)),
    mimeType: contentType,
    fileName,
    sizeBytes: buffer.byteLength,
  };
}

/**
 * Detects media category from MIME type.
 */
export function detectMediaCategory(
  mimeType: string,
): "image" | "audio" | "pdf" | "document" | "unknown" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("word") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("text/")
  ) return "document";
  return "unknown";
}
```

- [ ] **Step 2: Add Whisper model constant to ai-model.ts**

```typescript
// supabase/functions/_shared/ai-model.ts
export const DEFAULT_OPENAI_MODEL = "gpt-4o";
export const WHISPER_MODEL = "whisper-1";
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/media-utils.ts supabase/functions/_shared/ai-model.ts
git commit -m "feat: add media download utility and Whisper model constant"
```

---

### Task 2: Create `media-processor` Edge Function

**Files:**
- Create: `supabase/functions/media-processor/index.ts`

- [ ] **Step 1: Create the media-processor function**

This function receives a media URL + type, downloads it, and converts to text using the appropriate method:
- **Audio** → OpenAI Whisper transcription
- **Image** → GPT-4o Vision description
- **PDF/Document** → Calls existing `extract-document-text`

```typescript
// supabase/functions/media-processor/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { downloadEvolutionMedia, detectMediaCategory } from "../_shared/media-utils.ts";
import { DEFAULT_OPENAI_MODEL, WHISPER_MODEL } from "../_shared/ai-model.ts";

interface MediaProcessRequest {
  mediaUrl: string;
  messageType: string;   // "image" | "audio" | "document" | "video"
  caption?: string;       // User caption on media
  fileName?: string;
  tenantId: string;
}

interface MediaProcessResponse {
  extractedText: string;
  mediaCategory: string;
  processingMethod: string;
  durationMs: number;
}

/**
 * Transcribes audio using OpenAI Whisper API.
 */
async function transcribeAudio(
  openai: OpenAI,
  base64Data: string,
  mimeType: string,
): Promise<string> {
  // Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
  const ext = mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("mpeg") || mimeType.includes("mpga") ? "mp3"
    : "ogg"; // Default for WhatsApp audio (opus in ogg container)

  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const file = new File([binaryData], `audio.${ext}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: "pt",
    response_format: "text",
  });

  return transcription as unknown as string;
}

/**
 * Analyzes image using GPT-4o Vision.
 */
async function analyzeImage(
  openai: OpenAI,
  base64Data: string,
  mimeType: string,
  caption?: string,
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [];

  userContent.push({
    type: "image_url",
    image_url: { url: dataUrl, detail: "low" }, // "low" = 85 tokens, fast
  });

  const promptText = caption
    ? `O cliente enviou esta imagem com a legenda: "${caption}". Descreva o conteúdo da imagem de forma objetiva, focando em informações relevantes para um escritório de advocacia (documentos, contratos, comprovantes, etc). Se for um documento, extraia o texto visível.`
    : `O cliente enviou esta imagem via WhatsApp. Descreva o conteúdo de forma objetiva, focando em informações relevantes para um escritório de advocacia. Se for um documento, extraia o texto visível. Se for uma foto pessoal ou algo não relacionado, descreva brevemente.`;

  userContent.push({ type: "text", text: promptText });

  const response = await openai.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    max_tokens: 500,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content || "[Não foi possível analisar a imagem]";
}

/**
 * Extracts text from PDF/document using the existing extract-document-text function.
 * Calls it internally via fetch to avoid edge-function-to-edge-function issues.
 */
async function extractDocumentText(
  base64Data: string,
  fileName: string | null,
  mimeType: string,
): Promise<string> {
  // Use the same PDF extraction logic inline to avoid function-to-function calls
  // For PDFs: use pdfjs-dist
  // For images: use OCR.space
  // We call the extract-document-text via Supabase URL with service role key

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

  const startTime = Date.now();

  try {
    const body: MediaProcessRequest = await req.json();
    const { mediaUrl, messageType, caption, fileName } = body;

    if (!mediaUrl) {
      return new Response(
        JSON.stringify({ extractedText: caption || "", mediaCategory: "text", processingMethod: "passthrough", durationMs: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[media-processor] Processing ${messageType} media from URL: ${mediaUrl.substring(0, 80)}...`);

    // Step 1: Download media
    const media = await downloadEvolutionMedia(mediaUrl);
    const category = detectMediaCategory(media.mimeType);

    console.log(`[media-processor] Downloaded ${media.sizeBytes} bytes, detected: ${category} (${media.mimeType})`);

    // Step 2: Process based on category
    let extractedText: string;
    let processingMethod: string;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");
    const openai = new OpenAI({ apiKey: openaiApiKey });

    switch (category) {
      case "audio": {
        extractedText = await transcribeAudio(openai, media.base64, media.mimeType);
        processingMethod = "whisper";
        // Prepend context so the AI knows this was audio
        extractedText = `[Transcrição de áudio do cliente]: ${extractedText}`;
        break;
      }
      case "image": {
        extractedText = await analyzeImage(openai, media.base64, media.mimeType, caption);
        processingMethod = "gpt4o-vision";
        extractedText = `[Análise de imagem enviada pelo cliente]: ${extractedText}`;
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }, // 200 so webhook continues
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/media-processor/index.ts
git commit -m "feat: add media-processor edge function (Whisper + Vision + PDF)"
```

---

## Chunk 2: Agent Orchestrator + Specialist Prompts

### Task 3: Create `_shared/agent-prompts.ts` — Single source of truth for all agent prompts

**Files:**
- Create: `supabase/functions/_shared/agent-prompts.ts`

- [ ] **Step 1: Create the agent prompts file**

```typescript
// supabase/functions/_shared/agent-prompts.ts

/**
 * Centralized specialist agent definitions.
 * Each agent has: name, specialization, systemPrompt, temperature, maxTokens.
 */

export interface AgentDefinition {
  name: string;
  specialization: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export const AGENTS: Record<string, AgentDefinition> = {
  recepcionista: {
    name: "Recepcionista",
    specialization: "Recepção e qualificação de leads jurídicos",
    systemPrompt: `Você é a recepcionista virtual do escritório de advocacia.

REGRAS:
1. Seja educada, profissional e acolhedora. Linguagem simples e direta.
2. Na PRIMEIRA mensagem, cumprimente e pergunte como pode ajudar.
3. Objetivo: QUALIFICAR o lead — entender problema jurídico, urgência e dados básicos.
4. Faça perguntas UMA de cada vez.
5. Colete: nome completo, tipo de problema (trabalhista, família, consumidor, etc), urgência.
6. Quando tiver informações suficientes, informe que um advogado especialista entrará em contato.
7. NUNCA dê orientação jurídica específica.
8. Responda SEMPRE em português brasileiro.
9. Respostas curtas (máximo 3 parágrafos) — é WhatsApp.
10. Se o cliente mandar apenas "oi", "olá", etc, responda com saudação e pergunte como pode ajudar.

FLUXO: Saudação → Entender problema → Coletar nome → Classificar área → Verificar urgência → Encaminhar`,
    temperature: 0.5,
    maxTokens: 400,
  },

  juridico: {
    name: "Assistente Jurídico",
    specialization: "Assistência jurídica contextual para clientes ativos",
    systemPrompt: `Você é o assistente jurídico do escritório. Tem acesso aos processos, prazos, honorários e documentos do cliente.

REGRAS:
1. Responda com PRECISÃO usando os dados fornecidos no contexto.
2. NÃO invente informações. Use apenas o que está no contexto jurídico.
3. Para prazos urgentes, ALERTE com ênfase e datas específicas.
4. Para honorários, informe valores e status de forma clara.
5. Para processos, explique a fase atual em linguagem simples.
6. Se não tiver dados suficientes no contexto, diga claramente e ofereça encaminhar para o advogado responsável.
7. Respostas objetivas, máximo 4 parágrafos.
8. SEMPRE em português brasileiro.`,
    temperature: 0.3,
    maxTokens: 800,
  },

  comercial: {
    name: "Consultor Comercial",
    specialization: "Propostas comerciais e negociação de honorários",
    systemPrompt: `Você é o consultor comercial do escritório de advocacia.

REGRAS:
1. Apresente os serviços do escritório de forma profissional.
2. Explique modalidades de honorários (fixo, êxito, misto) sem citar valores específicos.
3. Para valores, diga que depende da análise do caso pelo advogado.
4. Enfatize diferenciais: atendimento personalizado, experiência, tecnologia.
5. Objetivo: converter leads qualificados em consultas agendadas.
6. Respostas objetivas, máximo 3 parágrafos.
7. SEMPRE em português brasileiro.`,
    temperature: 0.5,
    maxTokens: 500,
  },

  suporte: {
    name: "Suporte ao Cliente",
    specialization: "Pós-venda e suporte a clientes ativos",
    systemPrompt: `Você é o suporte ao cliente do escritório de advocacia.

REGRAS:
1. Ajude clientes com dúvidas sobre andamento, documentos, pagamentos.
2. Consulte o contexto jurídico para dar respostas precisas.
3. Para reclamações, seja empático e registre para o advogado responsável.
4. Para dúvidas sobre pagamento/honorários, consulte os dados do contexto.
5. Se não puder resolver, encaminhe para atendimento humano.
6. Respostas curtas e empáticas.
7. SEMPRE em português brasileiro.`,
    temperature: 0.4,
    maxTokens: 500,
  },

  analista_documentos: {
    name: "Analista de Documentos",
    specialization: "Análise de documentos jurídicos enviados por clientes",
    systemPrompt: `Você é o analista de documentos do escritório de advocacia. O cliente enviou um documento (imagem, PDF, foto) e você recebeu o conteúdo extraído.

REGRAS:
1. Analise o conteúdo extraído do documento enviado pelo cliente.
2. Identifique o TIPO de documento (contrato, petição, notificação, comprovante, etc).
3. Resuma os PONTOS-CHAVE do documento.
4. Se for um documento jurídico, identifique prazos, partes envolvidas, valores mencionados.
5. Se for ilegível ou incompleto, peça ao cliente para reenviar com melhor qualidade.
6. NÃO dê parecer jurídico — apenas descreva e organize as informações.
7. Informe que o advogado vai analisar o documento em detalhes.
8. Respostas objetivas, máximo 4 parágrafos.
9. SEMPRE em português brasileiro.`,
    temperature: 0.2,
    maxTokens: 600,
  },
};

/**
 * Orchestrator prompt — decides which agent handles the message.
 */
export const ORCHESTRATOR_PROMPT = `Você é o orquestrador do time de agentes do escritório de advocacia. Sua ÚNICA função é decidir qual agente deve responder a mensagem do cliente.

AGENTES DISPONÍVEIS:
- "recepcionista" — Primeiro contato, leads novos, qualificação, saudações
- "juridico" — Clientes com processos ativos, perguntas sobre prazos/andamento/documentos
- "comercial" — Perguntas sobre preços, contratos, propostas, negociação
- "suporte" — Reclamações, dúvidas de pagamento, problemas com atendimento
- "analista_documentos" — Quando o cliente enviou imagem/foto/PDF de documento

REGRAS DE DECISÃO:
1. Se a mensagem contém conteúdo extraído de mídia (imagem/documento/PDF) → "analista_documentos"
2. Se o cliente tem contexto jurídico (processos, prazos, honorários) e pergunta sobre isso → "juridico"
3. Se é primeiro contato ou saudação simples → "recepcionista"
4. Se pergunta sobre valores, contratos, propostas → "comercial"
5. Se é reclamação ou problema → "suporte"
6. Se tem áudio transcrito SEM contexto jurídico → "recepcionista" (tratar como texto normal)
7. Se tem áudio transcrito COM contexto jurídico → "juridico"
8. Na dúvida → "recepcionista"

CONTEXTO FORNECIDO:
- has_legal_context: se o cliente tem processos/prazos/honorários no sistema
- has_media: se a mensagem contém mídia processada
- media_category: tipo da mídia (image/audio/pdf/document/text)
- is_first_contact: se é o primeiro contato do cliente
- message_text: o texto da mensagem (ou transcrição/análise da mídia)

Responda APENAS com um JSON:
{"agent": "nome_do_agente", "reason": "motivo em 1 frase"}`;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/agent-prompts.ts
git commit -m "feat: add centralized agent prompts for 5 specialists + orchestrator"
```

---

### Task 4: Create `agent-orchestrator` Edge Function

**Files:**
- Create: `supabase/functions/agent-orchestrator/index.ts`

- [ ] **Step 1: Create the orchestrator function**

```typescript
// supabase/functions/agent-orchestrator/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { DEFAULT_OPENAI_MODEL } from "../_shared/ai-model.ts";
import { ORCHESTRATOR_PROMPT, AGENTS, type AgentDefinition } from "../_shared/agent-prompts.ts";

interface OrchestratorRequest {
  messageText: string;
  hasLegalContext: boolean;
  hasMedia: boolean;
  mediaCategory: string;   // "image" | "audio" | "pdf" | "document" | "text"
  isFirstContact: boolean;
  leadId: string | null;
  tenantId: string;
  conversationHistory?: string;
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

    // Build context summary for the orchestrator
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
      temperature: 0.1,  // Very deterministic routing
      max_tokens: 100,   // Only needs a small JSON response
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

    // Fallback: always route to recepcionista on error
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/agent-orchestrator/index.ts
git commit -m "feat: add agent-orchestrator edge function with specialist routing"
```

---

## Chunk 3: Refactor Webhook to Use Pipeline

### Task 5: Refactor `whatsapp-webhook` — Replace inline AI with pipeline calls

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts` (lines 833–1115)

This is the critical task. The webhook's `processNormalizedMessage` function currently:
1. Builds prompt inline (lines 840–960)
2. Calls OpenAI directly (lines 962–1111)

After refactor it will:
1. Call `media-processor` if media exists → get text
2. Call `agent-orchestrator` → get specialist agent
3. Call OpenAI with the specialist's prompt → get response

- [ ] **Step 1: Add helper to call edge functions via fetch (avoids functions.invoke issues)**

Add this helper near the top of the file (after imports, around line 10):

```typescript
/**
 * Calls a Supabase Edge Function via HTTP fetch.
 * Uses service role key for auth. Avoids functions.invoke() issues.
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`${functionName} failed: HTTP ${response.status} — ${errText}`);
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Replace the AI call section (lines 833–1115) with pipeline**

Replace everything from `// --- INVOKE AI AGENT ---` (line 835) to the line before `// --- HUMAN HANDOFF ---` (line 1117) with:

```typescript
    console.log(`[processMsg:${provider}] Starting AI pipeline for conversation ${conversationId}`);

    // ========================================
    // STAGE 1: MEDIA PROCESSING
    // ========================================
    let processedText = text;  // Default: use raw text
    let mediaCategory = "text";

    if (msg.mediaUrl && msg.messageType !== "text") {
      console.log(`[processMsg:${provider}] Processing media: ${msg.messageType}`);
      try {
        const mediaResult = await callEdgeFunction<{
          extractedText: string;
          mediaCategory: string;
          processingMethod: string;
          durationMs: number;
        }>("media-processor", {
          mediaUrl: msg.mediaUrl,
          messageType: msg.messageType,
          caption: text !== `[${msg.messageType.charAt(0).toUpperCase() + msg.messageType.slice(1)} recebido]` ? text : undefined,
          tenantId: tenantId,
        });

        processedText = mediaResult.extractedText;
        mediaCategory = mediaResult.mediaCategory;
        console.log(`[processMsg:${provider}] Media processed (${mediaResult.processingMethod}, ${mediaResult.durationMs}ms): "${processedText.substring(0, 80)}..."`);
      } catch (mediaErr) {
        console.error(`[processMsg:${provider}] Media processing failed, using raw text:`, mediaErr);
        // Continue with original text tag ("[Imagem recebida]", etc)
      }
    }

    // ========================================
    // STAGE 2: BUILD CONTEXT + ORCHESTRATE
    // ========================================

    // Legal context (existing)
    const legalCtx = await buildLegalContext(supabase, leadId, tenantId, processedText);

    // Command detection (existing)
    const COMMANDS: Record<string, string> = {
      "/prazos": "liste os prazos processuais do cliente",
      "/processos": "liste os processos ativos do cliente",
      "/documentos": "informe quantos documentos o cliente tem no sistema",
      "/honorarios": "informe o status dos honorários do cliente",
      "/status": "dê um resumo completo dos casos do cliente",
    };
    const commandKey = Object.keys(COMMANDS).find((cmd) =>
      processedText.trim().toLowerCase().startsWith(cmd)
    );
    const commandIntent = commandKey ? COMMANDS[commandKey] : null;

    // Conversation history (existing)
    let conversationHistory = "";
    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("sender, content")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (recentMessages && recentMessages.length > 1) {
      conversationHistory = recentMessages
        .reverse()
        .map((m: { sender: string; content: string }) => `${m.sender === "lead" ? "Cliente" : "Assistente"}: ${m.content}`)
        .join("\n");
    }

    // Get office name from tenants
    let officeName = "nosso escritório";
    let assistantName = "Ana";
    try {
      const { data: tenantConfig } = await supabase
        .from("tenants")
        .select("nome, configuracoes")
        .eq("id", tenantId)
        .maybeSingle();

      if (tenantConfig?.nome) officeName = tenantConfig.nome;
      const config = tenantConfig?.configuracoes as Record<string, unknown> | null;
      if (config?.whatsapp_assistant_name) assistantName = config.whatsapp_assistant_name as string;
    } catch { /* use defaults */ }

    // Orchestrate: decide which specialist agent handles this
    let agentName: string;
    let agentPrompt: string;
    let agentTemp: number;
    let agentMaxTokens: number;

    if (commandKey) {
      // Commands always go to juridico
      agentName = "Assistente Jurídico";
      agentPrompt = "";  // Will be set below
      agentTemp = 0.3;
      agentMaxTokens = 800;
    } else {
      try {
        const routing = await callEdgeFunction<{
          agent: string;
          agentDefinition: { name: string; specialization: string; systemPrompt: string; temperature: number; maxTokens: number };
          reason: string;
        }>("agent-orchestrator", {
          messageText: processedText,
          hasLegalContext: legalCtx.has_context,
          hasMedia: mediaCategory !== "text",
          mediaCategory,
          isFirstContact: !conversation,
          leadId,
          tenantId,
        });

        agentName = routing.agentDefinition.name;
        agentPrompt = routing.agentDefinition.systemPrompt;
        agentTemp = routing.agentDefinition.temperature;
        agentMaxTokens = routing.agentDefinition.maxTokens;
        console.log(`[processMsg:${provider}] Orchestrator routed to: ${routing.agent} (${routing.reason})`);
      } catch (orchErr) {
        console.error(`[processMsg:${provider}] Orchestrator failed, using default:`, orchErr);
        agentName = legalCtx.has_context ? "Assistente Jurídico" : "Recepcionista";
        agentPrompt = "";  // Will be built below
        agentTemp = 0.5;
        agentMaxTokens = legalCtx.has_context ? 800 : 400;
      }
    }

    // Build final system prompt with context
    let finalSystemPrompt = agentPrompt ||
      `Você é ${assistantName}, ${agentName.toLowerCase()} do escritório ${officeName}. Atenda o cliente de forma profissional e objetiva em português brasileiro. Respostas curtas (WhatsApp).`;

    // Add office context
    finalSystemPrompt = `Você trabalha no escritório ${officeName}. Seu nome é ${assistantName}.\n\n${finalSystemPrompt}`;

    // Add conversation history
    if (conversationHistory) {
      finalSystemPrompt += `\n\nHISTÓRICO DA CONVERSA:\n${conversationHistory}`;
    }

    // Add legal context if available
    if (legalCtx.has_context) {
      const sections = [
        legalCtx.processos.length > 0
          ? `PROCESSOS ATIVOS (${legalCtx.processos.length}):\n` +
            legalCtx.processos.map((p) =>
              `- ${p.numero_processo ?? "Sem nº"} | ${p.tipo_acao} | ${p.fase_processual} | ${p.tribunal ?? "Sem tribunal"}`
            ).join("\n")
          : null,
        legalCtx.prazos_urgentes.length > 0
          ? `PRAZOS URGENTES (próximos 30 dias):\n` +
            legalCtx.prazos_urgentes.map((p) =>
              `- ${p.tipo}: ${p.descricao} — VENCE EM ${p.dias_restantes} DIA(S) (${new Date(p.data_prazo).toLocaleDateString("pt-BR")})`
            ).join("\n")
          : null,
        legalCtx.honorarios.length > 0
          ? `HONORÁRIOS:\n` +
            legalCtx.honorarios.map((h) =>
              `- ${h.tipo}: R$ ${h.valor_total_acordado ?? 0} acordado / R$ ${h.valor_recebido ?? 0} recebido — ${h.status}`
            ).join("\n")
          : null,
        legalCtx.documentos_count > 0
          ? `DOCUMENTOS: ${legalCtx.documentos_count} arquivo(s) no sistema`
          : null,
        legalCtx.memories.length > 0
          ? `HISTÓRICO RELEVANTE:\n` + legalCtx.memories.map((m) => `- ${m.content}`).join("\n")
          : null,
      ].filter(Boolean).join("\n\n");

      finalSystemPrompt += `\n\n== CONTEXTO JURÍDICO DO CLIENTE ==\n${sections}\n\nIMPORTANTE: Use os dados acima para responder com precisão. Responda de forma contextualizada e objetiva.`;
    }

    // ========================================
    // STAGE 3: CALL SPECIALIST AGENT (Direct OpenAI)
    // ========================================
    let aiResponse: { result: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string } | null = null;
    let aiError: Error | null = null;

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const aiStartTime = Date.now();
    let executionRowId: string | null = null;

    try {
      const { data: execData } = await supabase
        .from("agent_executions")
        .insert({
          execution_id: executionId,
          lead_id: leadId,
          tenant_id: tenantId,
          status: "processing",
          current_agent: agentName,
          agents_involved: [agentName],
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      executionRowId = execData?.id ?? null;
    } catch { /* non-critical */ }

    try {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

      const openai = new OpenAI({ apiKey: openaiApiKey });

      const aiMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: commandIntent ?? processedText },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let completion;
      try {
        completion = await openai.chat.completions.create(
          {
            model: DEFAULT_OPENAI_MODEL,
            messages: aiMessages,
            temperature: agentTemp,
            max_tokens: agentMaxTokens,
          },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const resultText = completion.choices[0]?.message?.content || "";
      aiResponse = {
        result: resultText,
        usage: completion.usage
          ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
          : undefined,
        model: completion.model,
      };

      // Mark execution completed
      const duration = Date.now() - aiStartTime;
      void supabase
        .from("agent_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_duration_ms: duration,
          total_tokens: aiResponse.usage?.total_tokens || 0,
        })
        .eq("execution_id", executionId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] execution complete error:", error.message); });

      // Log AI processing (non-blocking)
      if (executionRowId) {
        void supabase.from("agent_ai_logs").insert({
          execution_id: executionRowId,
          agent_name: agentName,
          lead_id: leadId,
          tenant_id: tenantId,
          model: aiResponse.model,
          prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
          completion_tokens: aiResponse.usage?.completion_tokens || 0,
          total_tokens: aiResponse.usage?.total_tokens || 0,
          result_preview: resultText.substring(0, 200),
          system_prompt: finalSystemPrompt.substring(0, 500),
          user_prompt: (commandIntent ?? processedText).substring(0, 500),
          full_result: resultText.substring(0, 2000),
          context: { mediaCategory, agent: agentName, hasLegalContext: legalCtx.has_context },
          created_at: new Date().toISOString(),
        }).then(({ error }) => { if (error) console.error("[webhook] ai_log insert error:", error.message); });
      }

      console.log(`[processMsg:${provider}] ${agentName} responded: "${resultText.substring(0, 80)}..."`);
    } catch (err) {
      aiError = err instanceof Error ? err : new Error(String(err));
      console.error(`[processMsg:${provider}] AI error (using fallback):`, aiError.message);

      void supabase
        .from("agent_executions")
        .update({
          status: "failed",
          error_message: aiError.message,
          completed_at: new Date().toISOString(),
        })
        .eq("execution_id", executionId)
        .eq("tenant_id", tenantId)
        .then(({ error }) => { if (error) console.error("[webhook] execution fail error:", error.message); });
    }

    const aiText = aiError
      ? `Olá! Recebi sua mensagem e em breve um de nossos advogados entrará em contato. Obrigado pelo contato com ${officeName}!`
      : (aiResponse?.result || "Desculpe, não consegui processar sua mensagem no momento.");
```

**IMPORTANT**: The code from `// --- HUMAN HANDOFF ---` (line 1117) onwards stays EXACTLY as-is. Only the section between lines 833 and 1115 is replaced.

- [ ] **Step 3: Remove the now-unused imports and variables**

The following are no longer needed inline (handled by pipeline):
- Remove the `analyzeQualification` function call's `currentLeadStatus` variable if it breaks (it shouldn't — it's defined earlier in processNormalizedMessage)

- [ ] **Step 4: Update agent memory save to use agentName variable**

The existing agent memory block (around line 1142) references hardcoded "Assistente Juridico". Update it to use the dynamic `agentName`:

Find: `agent_name: "Assistente Juridico",`
Replace: `agent_name: agentName,`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/whatsapp-webhook/index.ts
git commit -m "refactor: replace inline AI with 3-stage pipeline (media → orchestrator → specialist)"
```

---

## Chunk 4: Deploy and Verify

### Task 6: Deploy all new and modified functions

- [ ] **Step 1: Deploy media-processor**

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy media-processor --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 2: Deploy agent-orchestrator**

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy agent-orchestrator --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 3: Deploy updated whatsapp-webhook**

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 4: Smoke test each function**

```bash
# Test media-processor responds
curl -s -X POST "https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/media-processor" \
  -H "Content-Type: application/json" \
  -d '{"mediaUrl":"","messageType":"text","tenantId":"test"}'

# Test orchestrator responds
curl -s -X POST "https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/agent-orchestrator" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messageText":"Oi bom dia","hasLegalContext":false,"hasMedia":false,"mediaCategory":"text","isFirstContact":true,"leadId":null,"tenantId":"test"}'

# Test webhook still responds
curl -s -X POST "https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

- [ ] **Step 5: Commit deploy confirmation**

```bash
git add -A
git commit -m "deploy: multimodal agent pipeline live in production"
```

---

## Verification Checklist

After deploy, test these scenarios by sending real WhatsApp messages:

| Scenario | Expected Behavior |
|----------|-------------------|
| "Oi, bom dia" | Recepcionista responde com saudação |
| Send photo of a contract | Analista de Documentos descreve o contrato |
| Send audio "preciso de ajuda com um processo" | Whisper transcreve → Recepcionista qualifica |
| Send PDF | extract-document-text processa → Analista resume |
| Client with active process asks "/prazos" | Assistente Jurídico lista prazos do contexto |
| "Quanto custa uma consulta?" | Consultor Comercial responde |
| "Estou insatisfeito com o atendimento" | Suporte ao Cliente responde com empatia |

**DB verification queries:**
```sql
-- Check latest messages with processing info
SELECT sender, content, send_status, processed_by_agent, message_type
FROM whatsapp_messages ORDER BY timestamp DESC LIMIT 10;

-- Check agent executions completed (not stuck in processing)
SELECT execution_id, current_agent, status, total_duration_ms
FROM agent_executions ORDER BY started_at DESC LIMIT 10;

-- Check AI logs show different agents being used
SELECT agent_name, model, total_tokens, result_preview
FROM agent_ai_logs ORDER BY created_at DESC LIMIT 10;
```
