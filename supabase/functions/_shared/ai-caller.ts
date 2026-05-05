/**
 * ai-caller.ts — Unified OpenAI call path for every Edge Function in Jurify.
 *
 * Before this module, three separate pipelines (whatsapp-webhook, ai-agent-processor,
 * assistant, chat-completion, orchestrator, media-processor) each:
 *   - Instantiated their own OpenAI client
 *   - Called `checkBudgetBeforeCall` / `recordTokenUsage` with different arguments
 *   - Wrote to `agent_ai_logs` with inconsistent columns
 *   - Wrapped with `withRetry` differently (or not at all)
 *
 * This file consolidates:
 *   1. Budget enforcement (daily + monthly, by TOKENS)
 *   2. OpenAI call with exponential-backoff retry
 *   3. Usage recording in `ai_usage` (token-granular)
 *   4. Unified logging in `agent_ai_logs`
 *
 * Call sites must NOT call OpenAI directly. Always use `callOpenAI`.
 */

import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import type { createClient } from "jsr:@supabase/supabase-js@2";
import { withRetry } from "./openai-retry.ts";
import { redactPII } from "./security.ts";
import {
  checkBudgetBeforeCall,
  recordTokenUsage,
  type BudgetDecision,
} from "./ai-budget.ts";

type SupabaseClient = ReturnType<typeof createClient>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AICallSource =
  | "whatsapp-webhook"
  | "ai-agent-processor"
  | "assistant"
  | "chat-completion"
  | "media-processor"
  | "orchestrator";

export interface AIMessage {
  role: string;
  content: string | Array<unknown>;
  [k: string]: unknown;
}

export interface AICallParams {
  tenantId: string;
  userId?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  leadId?: string | null;
  executionId?: string | null;
  model: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: string };
  tools?: unknown[];
  toolChoice?: string | Record<string, unknown>;
  abortSignal?: AbortSignal;
  source: AICallSource;
  metadata?: Record<string, unknown>;
  /**
   * Log prompt/result previews to `agent_ai_logs`. Defaults to true.
   * Orchestrator sets this false (100 tokens, no user content worth logging).
   */
  persistLog?: boolean;
  retries?: number;
}

export interface AICallResult {
  content: string;
  tokens_in: number;
  tokens_out: number;
  tokens_total: number;
  model: string;
  latency_ms: number;
  /** Raw OpenAI response — callers that need tool_calls or finish_reason access it here. */
  raw: {
    choices: Array<{
      message?: {
        content?: string | null;
        tool_calls?: unknown[];
        [k: string]: unknown;
      };
      finish_reason?: string;
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    model?: string;
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  public readonly scope: "daily" | "monthly";
  public readonly decision: BudgetDecision;

  constructor(scope: "daily" | "monthly", decision: BudgetDecision) {
    super(`AI budget exceeded (${scope}): ${decision.reason}`);
    this.name = "BudgetExceededError";
    this.scope = scope;
    this.decision = decision;
  }
}

export class OpenAIKeyMissingError extends Error {
  constructor() {
    super("OPENAI_API_KEY not configured");
    this.name = "OpenAIKeyMissingError";
  }
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new OpenAIKeyMissingError();
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Unified OpenAI chat completion call. Enforces budget, retries on transient
 * failures, records token usage, and writes a structured log row.
 *
 * Throws `BudgetExceededError` (callers decide: 429 or graceful fallback message)
 * or any transport error surfaced by OpenAI after retries are exhausted.
 */
export async function callOpenAI(
  supabase: SupabaseClient,
  params: AICallParams,
): Promise<AICallResult> {
  // --- 1. Budget check (daily + monthly tokens) ---
  const decision = await checkBudgetBeforeCall(supabase, params.tenantId, params.model);
  if (!decision.allowed) {
    throw new BudgetExceededError(decision.scope ?? "daily", decision);
  }

  // --- 2. Call OpenAI (with retry) ---
  const openai = getClient();
  const started = Date.now();

  const completion = await withRetry(
    () => openai.chat.completions.create(
      {
        model: params.model,
        // deno-lint-ignore no-explicit-any
        messages: params.messages as any,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        // deno-lint-ignore no-explicit-any
        response_format: params.responseFormat as any,
        // deno-lint-ignore no-explicit-any
        tools: params.tools as any,
        // deno-lint-ignore no-explicit-any
        tool_choice: params.toolChoice as any,
      },
      params.abortSignal ? { signal: params.abortSignal } : undefined,
    ),
    { label: `ai-caller:${params.source}`, retries: params.retries },
  );

  const latency_ms = Date.now() - started;

  // --- 3. Parse usage ---
  const tokens_in = completion.usage?.prompt_tokens ?? 0;
  const tokens_out = completion.usage?.completion_tokens ?? 0;
  const tokens_total = completion.usage?.total_tokens ?? (tokens_in + tokens_out);
  const content = completion.choices?.[0]?.message?.content ?? "";
  const resolvedModel = completion.model ?? params.model;

  // --- 4. Record usage (non-blocking on error — must not fail the request) ---
  try {
    await recordTokenUsage(supabase, {
      tenant_id: params.tenantId,
      user_id: params.userId ?? null,
      agent_id: params.agentId ?? null,
      model: resolvedModel,
      tokens_in,
      tokens_out,
      source: params.source,
    });
  } catch (err) {
    console.error(`[ai-caller:${params.source}] recordTokenUsage failed:`, err instanceof Error ? err.message : err);
  }

  // --- 5. Structured log (fire-and-forget-style; awaited for consistency but
  // any failure is swallowed — logging must never break the pipeline) ---
  if (params.persistLog !== false) {
    try {
      const preview = typeof content === "string" ? redactPII(content.substring(0, 2000)) : "";
      await supabase.from("agent_ai_logs").insert({
        execution_id: null, // callers that have an execution row should set metadata.execution_row_id
        agent_name: params.agentName ?? params.source,
        lead_id: params.leadId ?? null,
        tenant_id: params.tenantId,
        user_id: params.userId ?? null,
        model: resolvedModel,
        prompt_tokens: tokens_in,
        completion_tokens: tokens_out,
        total_tokens: tokens_total,
        result_preview: preview.substring(0, 200),
        full_result: preview,
        context: {
          source: params.source,
          latency_ms,
          ...(params.metadata ?? {}),
        },
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[ai-caller:${params.source}] log insert failed:`, err instanceof Error ? err.message : err);
    }
  }

  return {
    content: typeof content === "string" ? content : "",
    tokens_in,
    tokens_out,
    tokens_total,
    model: resolvedModel,
    latency_ms,
    // deno-lint-ignore no-explicit-any
    raw: completion as any,
  };
}

// ---------------------------------------------------------------------------
// Helper: expose client for media-processor (Whisper/Vision use non-chat APIs)
// ---------------------------------------------------------------------------

/**
 * Returns the underlying OpenAI client for non-chat calls (e.g. Whisper transcription,
 * embeddings). Caller is responsible for calling `recordTokenUsage` manually to keep
 * the ai_usage / ai_budget accounting consistent.
 */
export function getOpenAIClient(): OpenAI {
  return getClient();
}
