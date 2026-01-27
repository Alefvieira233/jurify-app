// 🚀 PADRÃO ELON MUSK: Rate Limiting distribuído para escala global
// Sistema que funciona em cluster/load balancer - Tesla/SpaceX grade

import { distributedCache } from './distributedCache';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  enableLogging?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

interface RateLimitInfo {
  requests: number[];
  windowStart: number;
  totalRequests: number;
}

class DistributedRateLimitService {
  private defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100,
    keyGenerator: (id: string) => `rate_limit:${id}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    enableLogging: true
  };

  // 🚀 VERIFICAR RATE LIMIT
  async checkRateLimit(
    identifier: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator!(identifier);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Buscar dados atuais do cache distribuído
      let rateLimitInfo = await distributedCache.get<RateLimitInfo>(key);

      if (!rateLimitInfo) {
        rateLimitInfo = {
          requests: [],
          windowStart: now,
          totalRequests: 0
        };
      }

      // Filtrar requests dentro da janela de tempo
      const validRequests = rateLimitInfo.requests.filter(
        requestTime => requestTime > windowStart
      );

      // Verificar se excedeu o limite
      const allowed = validRequests.length < finalConfig.maxRequests;
      
      if (allowed) {
        // Adicionar nova request
        validRequests.push(now);
        
        // Atualizar cache
        const updatedInfo: RateLimitInfo = {
          requests: validRequests,
          windowStart: Math.max(rateLimitInfo.windowStart, windowStart),
          totalRequests: rateLimitInfo.totalRequests + 1
        };

        await distributedCache.set(key, updatedInfo, finalConfig.windowMs);
      }

      const result: RateLimitResult = {
        allowed,
        remaining: Math.max(0, finalConfig.maxRequests - validRequests.length),
        resetTime: windowStart + finalConfig.windowMs,
        totalHits: validRequests.length
      };

      // 🚀 LOGGING PARA MONITORAMENTO
      if (finalConfig.enableLogging) {
        if (!allowed) {
          console.warn(`🚨 [RateLimit] BLOQUEADO: ${identifier} - ${validRequests.length}/${finalConfig.maxRequests} requests`);
        } else if (validRequests.length > finalConfig.maxRequests * 0.8) {
          console.warn(`⚠️ [RateLimit] ALTO USO: ${identifier} - ${validRequests.length}/${finalConfig.maxRequests} requests`);
        }
      }

      return result;

    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao verificar ${identifier}:`, error);
      
      // Em caso de erro, permitir (fail-open) mas logar
      console.error('🚨 [RateLimit] FAIL-OPEN: Permitindo request devido a erro no sistema');
      
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs,
        totalHits: 0
      };
    }
  }

  // 🚀 RATE LIMIT POR IP
  async checkByIP(
    ip: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`ip:${ip}`, {
      ...config,
      keyGenerator: (id: string) => `rate_limit:${id}`
    });
  }

  // 🚀 RATE LIMIT POR USUÁRIO
  async checkByUser(
    userId: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`user:${userId}`, {
      ...config,
      keyGenerator: (id: string) => `rate_limit:${id}`
    });
  }

  // 🚀 RATE LIMIT POR API ENDPOINT
  async checkByEndpoint(
    endpoint: string,
    identifier: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`endpoint:${endpoint}:${identifier}`, {
      ...config,
      keyGenerator: (id: string) => `rate_limit:${id}`
    });
  }

  // 🚀 RATE LIMIT GLOBAL (DDOS PROTECTION)
  async checkGlobal(
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('global', {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 10000, // 10k requests por minuto globalmente
      ...config,
      keyGenerator: (id: string) => `rate_limit:global:${id}`
    });
  }

  // 🚀 RESET RATE LIMIT
  async resetRateLimit(identifier: string): Promise<boolean> {
    try {
      const key = this.defaultConfig.keyGenerator!(identifier);
      await distributedCache.delete(key);
      
      console.log(`🔄 [RateLimit] Reset: ${identifier}`);
      return true;
    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao resetar ${identifier}:`, error);
      return false;
    }
  }

  // 🚀 WHITELIST/BLACKLIST
  async isWhitelisted(identifier: string): Promise<boolean> {
    try {
      const whitelistKey = `whitelist:${identifier}`;
      const result = await distributedCache.get<boolean>(whitelistKey);
      return result === true;
    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao verificar whitelist ${identifier}:`, error);
      return false;
    }
  }

  async isBlacklisted(identifier: string): Promise<boolean> {
    try {
      const blacklistKey = `blacklist:${identifier}`;
      const result = await distributedCache.get<boolean>(blacklistKey);
      return result === true;
    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao verificar blacklist ${identifier}:`, error);
      return false;
    }
  }

  async addToWhitelist(identifier: string, ttl: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const whitelistKey = `whitelist:${identifier}`;
      await distributedCache.set(whitelistKey, true, ttl);
      
      console.log(`✅ [RateLimit] Adicionado à whitelist: ${identifier}`);
      return true;
    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao adicionar à whitelist ${identifier}:`, error);
      return false;
    }
  }

  async addToBlacklist(identifier: string, ttl: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const blacklistKey = `blacklist:${identifier}`;
      await distributedCache.set(blacklistKey, true, ttl);
      
      console.log(`🚫 [RateLimit] Adicionado à blacklist: ${identifier}`);
      return true;
    } catch (error) {
      console.error(`❌ [RateLimit] Erro ao adicionar à blacklist ${identifier}:`, error);
      return false;
    }
  }

  // 🚀 ESTATÍSTICAS E MONITORAMENTO
  async getStats(identifier?: string): Promise<any> {
    try {
      if (identifier) {
        const key = this.defaultConfig.keyGenerator!(identifier);
        const info = await distributedCache.get<RateLimitInfo>(key);
        return info;
      }

      // Stats globais (implementar conforme necessário)
      return {
        message: 'Stats globais não implementadas ainda',
        cacheStats: distributedCache.getStats()
      };
    } catch (error) {
      console.error('❌ [RateLimit] Erro ao buscar stats:', error);
      return null;
    }
  }

  // 🚀 HEALTH CHECK
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      // Testar operação básica
      const testResult = await this.checkRateLimit('health_check_test', {
        windowMs: 1000,
        maxRequests: 1,
        enableLogging: false
      });

      if (testResult.allowed) {
        return {
          status: 'healthy',
          details: {
            message: 'Rate limiting funcionando normalmente',
            cacheHealth: distributedCache.getHealthStatus()
          }
        };
      }

      return {
        status: 'degraded',
        details: {
          message: 'Rate limiting com problemas',
          cacheHealth: distributedCache.getHealthStatus()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          message: 'Rate limiting com falha crítica',
          error: error instanceof Error ? error.message : String(error),
          cacheHealth: distributedCache.getHealthStatus()
        }
      };
    }
  }
}

// 🚀 SINGLETON EXPORT - PADRÃO TESLA/SPACEX
export const distributedRateLimit = new DistributedRateLimitService();

// 🚀 CONVENIENCE EXPORTS
export const checkRateLimit = distributedRateLimit.checkRateLimit.bind(distributedRateLimit);
export const checkRateLimitByIP = distributedRateLimit.checkByIP.bind(distributedRateLimit);
export const checkRateLimitByUser = distributedRateLimit.checkByUser.bind(distributedRateLimit);
export const checkRateLimitByEndpoint = distributedRateLimit.checkByEndpoint.bind(distributedRateLimit);
export const checkGlobalRateLimit = distributedRateLimit.checkGlobal.bind(distributedRateLimit);

export default distributedRateLimit;
