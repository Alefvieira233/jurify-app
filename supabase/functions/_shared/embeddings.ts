import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export async function generateEmbedding(text: string, model?: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });
  const embeddingModel = model || DEFAULT_EMBEDDING_MODEL;

  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
}
