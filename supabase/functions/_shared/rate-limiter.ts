/**
 * 🛡️ RATE LIMITER - Sistema de Controle de Taxa
 *
 * Implementação de rate limiting para Edge Functions usando Upstash Redis
 * ou fallback para armazenamento em memória (desenvolvimento).
 *
 * Protege contra:
 * - DoS attacks
 * - Abuso de API
 * - Custos excessivos
 *
 * @version 1.0.0
 * @security Enterprise Grade
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =========================================================
// TIPOS
// =========================================================

export interface RateLimitConfig {
  /**
   * Número máximo de requisições permitidas
   */
  maxRequests: number;

  /**
   * Janela de tempo em segundos
   */
  windowSeconds: number;

  /**
   * Identificador único (ex: IP, user_id, phone)
   */
  identifier: string;

  /**
   * Namespace para separar diferentes limitadores
   */
  namespace?: string;
}

export interface RateLimitResult {
  /**
   * Se a requisição foi permitida
   */
  allowed: boolean;

  /**
   * Número de requisições restantes na janela
   */
  remaining: number;

  /**
   * Tempo até reset em segundos
   */
  resetInSeconds: number;

  /**
   * Timestamp do reset
   */
  resetAt: Date;

  /**
   * Total de requisições na janela atual
   */
  current: number;

  /**
   * Limite máximo
   */
  limit: number;
}

// =========================================================
// IN-MEMORY STORAGE (Fallback para desenvolvimento)
// =========================================================

interface MemoryRecord {
  count: number;
  resetAt: number;
}

const memoryStorage = new Map<string, MemoryRecord>();

/**
 * Limpa registros expirados da memória (garbage collection)
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, record] of memoryStorage.entries()) {
    if (record.resetAt < now) {
      memoryStorage.delete(key);
    }
  }
}

// Executar limpeza a cada 5 minutos
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

// =========================================================
// RATE LIMITER - IN-MEMORY
// =========================================================

async function checkRateLimitMemory(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.namespace || "default"}:${config.identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let record = memoryStorage.get(key);

  // Se não existe ou expirou, cria novo
  if (!record || record.resetAt < now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStorage.set(key, record);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetInSeconds: config.windowSeconds,
      resetAt: new Date(record.resetAt),
      current: 1,
      limit: config.maxRequests,
    };
  }

  // Incrementa contador
  record.count++;

  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    resetInSeconds,
    resetAt: new Date(record.resetAt),
    current: record.count,
    limit: config.maxRequests,
  };
}

// =========================================================
// RATE LIMITER - SUPABASE (usando tabela custom)
// =========================================================

async function checkRateLimitSupabase(
  config: RateLimitConfig,
  supabase: ReturnType<typeof createClient>
): Promise<RateLimitResult> {
  const key = `${config.namespace || "default"}:${config.identifier}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowSeconds * 1000);

  try {
    // Tenta buscar registro existente
    const { data: existing } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", key)
      .single();

    // Se não existe ou expirou, cria novo
    if (!existing || new Date(existing.reset_at) < now) {
      await supabase.from("rate_limits").upsert({
        key,
        count: 1,
        reset_at: resetAt.toISOString(),
        namespace: config.namespace || "default",
        identifier: config.identifier,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetInSeconds: config.windowSeconds,
        resetAt,
        current: 1,
        limit: config.maxRequests,
      };
    }

    // Incrementa contador
    const newCount = existing.count + 1;

    await supabase
      .from("rate_limits")
      .update({ count: newCount })
      .eq("key", key);

    const allowed = newCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - newCount);
    const resetInSeconds = Math.ceil(
      (new Date(existing.reset_at).getTime() - now.getTime()) / 1000
    );

    return {
      allowed,
      remaining,
      resetInSeconds,
      resetAt: new Date(existing.reset_at),
      current: newCount,
      limit: config.maxRequests,
    };
  } catch (error) {
    console.error("❌ Error checking rate limit in Supabase:", error);
    // Fallback para memória em caso de erro
    return checkRateLimitMemory(config);
  }
}

// =========================================================
// INTERFACE PÚBLICA
// =========================================================

/**
 * Verifica se uma requisição está dentro do rate limit
 *
 * @param config - Configuração do rate limit
 * @param supabase - Cliente Supabase (opcional, usa memória se não fornecido)
 * @returns Resultado do rate limit
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  supabase?: ReturnType<typeof createClient>
): Promise<RateLimitResult> {
  // Validação de config
  if (!config.identifier) {
    throw new Error("Rate limit identifier is required");
  }

  if (config.maxRequests <= 0) {
    throw new Error("Rate limit maxRequests must be positive");
  }

  if (config.windowSeconds <= 0) {
    throw new Error("Rate limit windowSeconds must be positive");
  }

  // Se tem Supabase, usa tabela; senão usa memória
  if (supabase) {
    return checkRateLimitSupabase(config, supabase);
  } else {
    return checkRateLimitMemory(config);
  }
}

/**
 * Helper para criar resposta 429 (Too Many Requests)
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders?: Record<string, string>
): Response {
  const headers = {
    ...(corsHeaders || {}),
    "Content-Type": "application/json",
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    "Retry-After": result.resetInSeconds.toString(),
  };

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `Too many requests. Please try again in ${result.resetInSeconds} seconds.`,
      limit: result.limit,
      current: result.current,
      remaining: result.remaining,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Helper para extrair identificador de requisição
 * Prioriza: user_id > IP > fallback genérico
 */
export function getRequestIdentifier(
  req: Request,
  user?: { id: string }
): string {
  // 1. Se tem user autenticado, usa user_id
  if (user?.id) {
    return `user:${user.id}`;
  }

  // 2. Tenta obter IP (funciona em alguns ambientes)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    return `ip:${ip}`;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }

  // 3. Fallback: usa hostname (menos preciso mas melhor que nada)
  const url = new URL(req.url);
  return `host:${url.hostname}`;
}

/**
 * Middleware helper para aplicar rate limit em Edge Functions
 *
 * @example
 * ```typescript
 * serve(async (req) => {
 *   const rateLimitCheck = await applyRateLimit(req, {
 *     maxRequests: 100,
 *     windowSeconds: 60,
 *   });
 *
 *   if (!rateLimitCheck.allowed) {
 *     return rateLimitCheck.response;
 *   }
 *
 *   // Continua processamento normal...
 * });
 * ```
 */
export async function applyRateLimit(
  req: Request,
  config: Omit<RateLimitConfig, "identifier">,
  options?: {
    supabase?: ReturnType<typeof createClient>;
    user?: { id: string };
    corsHeaders?: Record<string, string>;
  }
): Promise<
  | { allowed: true; result: RateLimitResult }
  | { allowed: false; result: RateLimitResult; response: Response }
> {
  const identifier = getRequestIdentifier(req, options?.user);

  const result = await checkRateLimit(
    {
      ...config,
      identifier,
    },
    options?.supabase
  );

  if (!result.allowed) {
    return {
      allowed: false,
      result,
      response: createRateLimitResponse(result, options?.corsHeaders),
    };
  }

  return {
    allowed: true,
    result,
  };
}

// =========================================================
// LIMPEZA PERIÓDICA (se usar Supabase)
// =========================================================

/**
 * Remove registros expirados do banco de dados
 * Deve ser executado periodicamente (ex: cron job)
 */
export async function cleanupExpiredRateLimits(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("rate_limits")
      .delete()
      .lt("reset_at", new Date().toISOString())
      .select("id");

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error("❌ Error cleaning up rate limits:", error);
    return 0;
  }
}
