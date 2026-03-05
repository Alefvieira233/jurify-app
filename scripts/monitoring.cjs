#!/usr/bin/env node
// 🚀 PADRÃO ELON MUSK: Sistema de monitoramento Tesla/SpaceX grade

const https = require('https');

class ProductionMonitoring {
  constructor() {
    this.metrics = {
      uptime: 0,
      responseTime: [],
      errorRate: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      lastCheck: Date.now()
    };
    
    this.alerts = [];
    this.thresholds = {
      maxResponseTime: 2000, // 2s
      maxErrorRate: 5, // 5%
      minCacheHitRate: 80, // 80%
      maxRateLimitHits: 100 // por minuto
    };
  }

  // 🚀 HEALTH CHECK COMPLETO
  async healthCheck() {
    console.log('🔍 [MONITOR] Executando health check completo...');
    
    const checks = [
      this.checkDatabase(),
      this.checkCache(),
      this.checkRateLimit(),
      this.checkEdgeFunctions(),
      this.checkSSLCertificate()
    ];
    
    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.error(`❌ [MONITOR] ${failures.length} verificações falharam`);
      this.sendAlert('CRITICAL', `Health check falhou: ${failures.length} serviços indisponíveis`);
      return false;
    }
    
    console.log('✅ [MONITOR] Todos os serviços funcionando normalmente');
    return true;
  }

  // 🚀 VERIFICAR BANCO DE DADOS
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      // Simular verificação do Supabase
      await this.makeRequest(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      const responseTime = Date.now() - startTime;
      this.metrics.responseTime.push(responseTime);
      
      if (responseTime > this.thresholds.maxResponseTime) {
        this.sendAlert('WARNING', `Database response time alto: ${responseTime}ms`);
      }
      
      console.log(`✅ [MONITOR] Database OK (${responseTime}ms)`);
      return true;
      
    } catch (error) {
      console.error('❌ [MONITOR] Database falhou:', error.message);
      throw error;
    }
  }

  // 🚀 VERIFICAR CACHE DISTRIBUÍDO
  async checkCache() {
    // Cache check requires Redis/KV — skip when not configured
    console.log('⏭️  [MONITOR] Cache check skipped (no Redis/KV configured)');
    this.metrics.cacheHitRate = -1; // unknown
    return true;
  }

  // 🚀 VERIFICAR RATE LIMITING
  async checkRateLimit() {
    // Rate limiting is enforced in Edge Functions at runtime.
    // No external service to probe — verify by checking the shared module exists.
    const rlPath = require('path').join(__dirname, '..', 'supabase', 'functions', '_shared', 'rate-limiter.ts');
    if (require('fs').existsSync(rlPath)) {
      console.log('✅ [MONITOR] Rate limiter module present');
      return true;
    }
    console.log('⚠️  [MONITOR] Rate limiter module not found');
    throw new Error('rate-limiter.ts missing');
  }

  // 🚀 VERIFICAR EDGE FUNCTIONS
  async checkEdgeFunctions() {
    try {
      console.log('🔄 [MONITOR] Testando Edge Functions...');
      
      const functions = [
        'agentes-ia-api'
      ];
      
      for (const func of functions) {
        const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/${func}`;

        try {
          await this.makeRequest(url, {
            method: 'OPTIONS', // CORS preflight
            headers: {
              'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
            }
          });

          console.log(`✅ [MONITOR] Edge Function ${func} OK`);
        } catch (error) {
          console.error(`❌ [MONITOR] Edge Function ${func} falhou:`, error.message);
          throw error;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ [MONITOR] Edge Functions falharam:', error.message);
      throw error;
    }
  }

  // 🚀 VERIFICAR CERTIFICADO SSL
  async checkSSLCertificate() {
    try {
      console.log('🔄 [MONITOR] Verificando certificado SSL...');
      
      const url = new URL(process.env.VITE_SUPABASE_URL || 'https://localhost:5173');
      
      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: url.hostname,
          port: url.port || 443,
          method: 'HEAD',
          timeout: 5000
        }, (res) => {
          const cert = res.connection.getPeerCertificate();
          
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 30) {
              this.sendAlert('WARNING', `Certificado SSL expira em ${daysUntilExpiry} dias`);
            }
            
            console.log(`✅ [MONITOR] SSL Certificate OK (expira em ${daysUntilExpiry} dias)`);
            resolve(true);
          } else {
            reject(new Error('Certificado SSL inválido'));
          }
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('SSL check timeout')));
        req.end();
      });
      
    } catch (error) {
      console.error('❌ [MONITOR] SSL Certificate falhou:', error.message);
      throw error;
    }
  }

  // 🚀 ENVIAR ALERTAS
  sendAlert(level, message) {
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: 'jurify-legal-saas'
    };
    
    this.alerts.push(alert);
    
    console.log(`🚨 [ALERT-${level}] ${message}`);
    
    // Em produção, integrar com Slack, Discord, email, etc.
    if (level === 'CRITICAL') {
      this.sendCriticalAlert(alert);
    }
  }

  // 🚀 ALERTAS CRÍTICOS
  sendCriticalAlert(alert) {
    console.log('🚨🚨🚨 [CRITICAL ALERT] 🚨🚨🚨');
    console.log(JSON.stringify(alert, null, 2));
    
    // Em produção:
    // - Enviar para Slack/Discord
    // - Enviar email para equipe
    // - Integrar com PagerDuty
    // - Notificar via SMS
  }

  // 🚀 HELPER PARA REQUESTS
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000
      };
      
      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  // 🚀 RELATÓRIO DE MÉTRICAS
  generateReport() {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: {
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: this.metrics.errorRate,
        cacheHitRate: this.metrics.cacheHitRate,
        rateLimitHits: this.metrics.rateLimitHits
      },
      alerts: this.alerts.slice(-10), // Últimos 10 alertas
      status: this.alerts.some(a => a.level === 'CRITICAL') ? 'CRITICAL' : 
              this.alerts.some(a => a.level === 'WARNING') ? 'WARNING' : 'HEALTHY'
    };
    
    console.log('📊 [MONITOR] Relatório de Métricas:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }
}

// 🚀 EXECUÇÃO PRINCIPAL
async function main() {
  const monitor = new ProductionMonitoring();
  
  console.log('🚀 [MONITOR] Iniciando monitoramento de produção...');
  
  try {
    await monitor.healthCheck();
    const report = monitor.generateReport();
    
    console.log('✅ [MONITOR] Monitoramento concluído com sucesso');
    return report;
    
  } catch (error) {
    console.error('❌ [MONITOR] Monitoramento falhou:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ProductionMonitoring, main };
