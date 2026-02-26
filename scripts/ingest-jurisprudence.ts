/**
 * ⚖️ JURIFY TRUST ENGINE — Ingestão de Jurisprudência
 *
 * Script ETL server-side para ingerir súmulas, leis e acórdãos
 * no banco vetorial (legal_knowledge + pgvector).
 *
 * Uso:
 *   npx tsx scripts/ingest-jurisprudence.ts
 *
 * Env vars obrigatórias:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Config ─────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CHUNK_CHARS = 3500;
const OVERLAP_CHARS = 250;
const MAX_CONCURRENT_EMBEDDINGS = 3;
const BATCH_PAUSE_MS = 500;

// ─── Env ────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  // Try dotenv if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  } catch {
    // dotenv not available, env vars must be set externally
  }
  const val = process.env[name];
  if (!val) {
    console.error(`❌ Missing env var: ${name}`);
    process.exit(1);
  }
  return val;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = requireEnv('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─── Types ──────────────────────────────────────────────────────────────────

interface SourceDocument {
  id: string;
  text: string;
  url?: string;
  tags?: string[];
  tribunal?: string;
  year?: number;
}

interface Chunk {
  sourceId: string;
  sourceType: string;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  chunkIndex: number;
  chunkCount: number;
}

// ─── Text Processing ────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

function chunkText(text: string, maxChars = MAX_CHUNK_CHARS, overlapChars = OVERLAP_CHARS): string[] {
  const normalized = normalizeText(text);

  // If text fits in one chunk, return as-is
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;
  let previousStart = -1;

  while (start < normalized.length) {
    // Infinite loop guard — if start hasn't advanced, force it forward
    if (start <= previousStart) {
      start = previousStart + maxChars;
      if (start >= normalized.length) break;
    }
    previousStart = start;

    let end = start + maxChars;

    if (end >= normalized.length) {
      chunks.push(normalized.slice(start).trim());
      break;
    }

    // Try to split at paragraph boundary
    const slice = normalized.slice(start, end);
    let splitAt = slice.lastIndexOf('\n\n');

    // Fallback: sentence boundary
    if (splitAt === -1 || splitAt < maxChars * 0.5) {
      splitAt = slice.lastIndexOf('. ');
      if (splitAt !== -1) splitAt += 2; // include the period + space
    }

    // Fallback: semicolon
    if (splitAt === -1 || splitAt < maxChars * 0.3) {
      splitAt = slice.lastIndexOf('; ');
      if (splitAt !== -1) splitAt += 2;
    }

    // Last fallback: hard cut at maxChars
    if (splitAt === -1 || splitAt < maxChars * 0.2) {
      splitAt = maxChars;
    }

    chunks.push(normalized.slice(start, start + splitAt).trim());
    start = start + splitAt - overlapChars;
  }

  return chunks.filter(c => c.length > 0);
}

function inferSourceType(sourceId: string): string {
  const id = sourceId.toUpperCase();
  if (id.includes('SUM_') || id.includes('SUM_VINC')) return 'sumula';
  if (id.includes('LEI_') || id.includes('ART')) return 'lei';
  if (id.includes('RESP') || id.includes('TEMA')) return 'acordao';
  return 'outro';
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

class SimpleSemaphore {
  private queue: (() => void)[] = [];
  private running = 0;

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Embedding Generation ───────────────────────────────────────────────────

const semaphore = new SimpleSemaphore(MAX_CONCURRENT_EMBEDDINGS);

async function generateEmbedding(text: string, retries = 3): Promise<number[] | null> {
  await semaphore.acquire();
  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: text,
        });
        return response.data[0]?.embedding ?? null;
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        if (error.status === 429 || (error.status && error.status >= 500)) {
          const backoff = Math.pow(2, attempt) * 1000;
          console.warn(`  ⚠️ API ${error.status} on attempt ${attempt}, retrying in ${backoff}ms...`);
          await sleep(backoff);
        } else {
          console.error(`  ❌ Embedding failed: ${error.message || 'Unknown error'}`);
          return null;
        }
      }
    }
    console.error('  ❌ Embedding failed after all retries');
    return null;
  } finally {
    semaphore.release();
  }
}

// ─── Main Ingest ────────────────────────────────────────────────────────────

async function main() {
  console.log('⚖️ JURIFY TRUST ENGINE — Ingestão de Jurisprudência');
  console.log('='.repeat(55));

  // 1. Read source data
  const dataPath = path.resolve(__dirname, 'data/mock_stj_sumulas.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Source file not found: ${dataPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as unknown[];
  console.log(`📄 Source documents loaded: ${rawData.length}`);

  // 2. Validate and chunk
  const allChunks: Chunk[] = [];
  let skippedDocs = 0;

  for (const raw of rawData) {
    const doc = raw as SourceDocument;

    // Validate
    if (!doc.id || !doc.text || typeof doc.text !== 'string') {
      console.warn(`  ⚠️ Skipping invalid doc: ${JSON.stringify(doc).slice(0, 80)}`);
      skippedDocs++;
      continue;
    }

    const sourceType = inferSourceType(doc.id);
    const chunks = chunkText(doc.text);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      allChunks.push({
        sourceId: doc.id,
        sourceType,
        content,
        contentHash: sha256(content),
        metadata: {
          url: doc.url || null,
          tags: doc.tags || [],
          tribunal: doc.tribunal || null,
          year: doc.year || null,
          ingested_at: new Date().toISOString(),
          doc_type: sourceType,
          chunk_index: i,
          chunk_count: chunks.length,
        },
        chunkIndex: i,
        chunkCount: chunks.length,
      });
    }
  }

  console.log(`📦 Total chunks to process: ${allChunks.length} (skipped ${skippedDocs} invalid docs)`);

  // 3. Generate embeddings and upsert
  let inserted = 0;
  let deduped = 0;
  let failed = 0;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const label = `[${i + 1}/${allChunks.length}] ${chunk.sourceId}`;

    // Check if already exists (dedup by source_id + content_hash)
    const { data: existing } = await supabase
      .from('legal_knowledge')
      .select('id')
      .eq('source_id', chunk.sourceId)
      .eq('content_hash', chunk.contentHash)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  ♻️ ${label} — already exists (dedup)`);
      deduped++;
      continue;
    }

    // Generate embedding
    console.log(`  🧠 ${label} — generating embedding...`);
    const embedding = await generateEmbedding(chunk.content);

    if (!embedding) {
      console.error(`  ❌ ${label} — embedding failed, skipping`);
      failed++;
      continue;
    }

    // Upsert
    const { error: upsertError } = await supabase
      .from('legal_knowledge')
      .upsert(
        {
          source_type: chunk.sourceType,
          source_id: chunk.sourceId,
          content: chunk.content,
          content_hash: chunk.contentHash,
          embedding: embedding,
          metadata: chunk.metadata,
        },
        { onConflict: 'source_id,content_hash' }
      );

    if (upsertError) {
      console.error(`  ❌ ${label} — upsert error: ${upsertError.message}`);
      failed++;
    } else {
      console.log(`  ✅ ${label} — inserted`);
      inserted++;
    }

    // Rate limit pause between batches
    if ((i + 1) % MAX_CONCURRENT_EMBEDDINGS === 0) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(55));
  console.log('📊 INGESTÃO COMPLETA');
  console.log(`  📄 Documentos lidos:    ${rawData.length}`);
  console.log(`  📦 Chunks gerados:      ${allChunks.length}`);
  console.log(`  ✅ Inseridos:           ${inserted}`);
  console.log(`  ♻️ Dedup (já existiam): ${deduped}`);
  console.log(`  ❌ Falhas:              ${failed}`);
  console.log(`  ⚠️ Docs inválidos:      ${skippedDocs}`);
  console.log('='.repeat(55));
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
