/**
 * Default OpenAI models for Supabase Edge functions.
 * gpt-4o-mini: ~$0.15/1M tokens (orchestrator, routing, simple tasks)
 * gpt-4o: ~$15/1M tokens (complex legal analysis — use only when needed)
 */
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const PREMIUM_OPENAI_MODEL = "gpt-4o";
export const WHISPER_MODEL = "whisper-1";
