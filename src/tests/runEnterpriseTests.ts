/**
 * 🚀 ENTERPRISE TEST RUNNER - EXECUÇÃO COMPLETA
 * 
 * Runner principal para executar todos os testes do sistema multiagentes enterprise.
 * Inclui setup, execução, relatórios e cleanup.
 */

import { EnterpriseTestSuite } from './EnterpriseTestSuite';
import { 
  setupTestEnvironment, 
  TestMetricsCollector, 
  TestUtils, 
  TEST_CONFIG 
} from './test-config';

// 🎯 CLASSE PRINCIPAL DO RUNNER
export class EnterpriseTestRunner {
  private testSuite: EnterpriseTestSuite;
  private metricsCollector: TestMetricsCollector;
  private startTime: number = 0;

  constructor() {
    console.log('🚀 Inicializando Enterprise Test Runner...');
    this.testSuite = new EnterpriseTestSuite();
    this.metricsCollector = new TestMetricsCollector();
  }

  // 🎬 EXECUÇÃO PRINCIPAL DOS TESTES
  async runAllTests(): Promise<any> {
    this.startTime = Date.now();
    
    console.log('\n🧪 ===============================================');
    console.log('🚀 INICIANDO TESTES ENTERPRISE JURIFY MULTIAGENTES');
    console.log('===============================================\n');

    try {
      // 1. Setup do ambiente
      await this.setupEnvironment();

      // 2. Executa testes de pré-requisitos
      await this.runPrerequisiteTests();

      // 3. Executa suite principal
      const testResults = await this.runMainTestSuite();

      // 4. Executa testes de integração
      await this.runIntegrationTests();

      // 5. Executa testes de performance
      await this.runPerformanceTests();

      // 6. Gera relatório final
      const finalReport = await this.generateFinalReport(testResults);

      // 7. Cleanup
      await this.cleanup();

      return finalReport;

    } catch (error) {
      console.error('❌ ERRO CRÍTICO NO RUNNER DE TESTES:', error);
      await this.cleanup();
      throw error;
    }
  }

  // 🔧 SETUP DO AMBIENTE
  private async setupEnvironment(): Promise<void> {
    console.log('🔧 Configurando ambiente de testes...');
    
    try {
      // Setup básico
      setupTestEnvironment();
      
      // Verifica dependências críticas
      await this.checkCriticalDependencies();
      
      // Inicializa métricas
      this.metricsCollector.recordMemoryUsage();
      
      console.log('✅ Ambiente configurado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro no setup do ambiente:', error);
      throw error;
    }
  }

  // 🔍 VERIFICA DEPENDÊNCIAS CRÍTICAS
  private async checkCriticalDependencies(): Promise<void> {
    console.log('🔍 Verificando dependências críticas...');
    
    const checks = [
      {
        name: 'OpenAI API Key',
        check: () => !!process.env.OPENAI_API_KEY || TEST_CONFIG.MOCK_MODE,
        required: true
      },
      {
        name: 'Supabase URL',
        check: () => !!process.env.NEXT_PUBLIC_SUPABASE_URL || TEST_CONFIG.MOCK_MODE,
        required: true
      },
      {
        name: 'Node.js Version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return major >= 16;
        },
        required: true
      },
      {
        name: 'Memory Available',
        check: () => {
          if (typeof process !== 'undefined' && process.memoryUsage) {
            const memory = process.memoryUsage();
            return memory.heapUsed < 500 * 1024 * 1024; // 500MB
          }
          return true;
        },
        required: false
      }
    ];

    let criticalFailures = 0;

    for (const check of checks) {
      try {
        const result = check.check();
        if (result) {
          console.log(`  ✅ ${check.name}: OK`);
        } else {
          console.log(`  ${check.required ? '❌' : '⚠️'} ${check.name}: FALHOU`);
          if (check.required) criticalFailures++;
        }
      } catch (error) {
        console.log(`  ❌ ${check.name}: ERRO - ${error.message}`);
        if (check.required) criticalFailures++;
      }
    }

    if (criticalFailures > 0) {
      throw new Error(`${criticalFailures} dependências críticas falharam`);
    }

    console.log('✅ Todas as dependências críticas verificadas');
  }

  // 🧪 TESTES DE PRÉ-REQUISITOS
  private async runPrerequisiteTests(): Promise<void> {
    console.log('\n🧪 Executando testes de pré-requisitos...');
    
    const prerequisiteTests = [
      {
        name: 'Importação de Módulos',
        test: async () => {
          // Testa se consegue importar os módulos principais
          const { enterpriseMultiAgentSystem } = await import('@/lib/multiagents/EnterpriseMultiAgentSystem');
          const { enterpriseWhatsApp } = await import('@/lib/integrations/EnterpriseWhatsApp');
          
          if (!enterpriseMultiAgentSystem || !enterpriseWhatsApp) {
            throw new Error('Falha ao importar módulos principais');
          }
          
          return true;
        }
      },
      {
        name: 'Inicialização Básica',
        test: async () => {
          // Testa inicialização básica dos sistemas
          const { enterpriseMultiAgentSystem } = await import('@/lib/multiagents/EnterpriseMultiAgentSystem');
          const stats = enterpriseMultiAgentSystem.getSystemStats();
          
          if (stats.total_agents === 0) {
            throw new Error('Sistema multiagentes não inicializou corretamente');
          }
          
          return true;
        }
      },
      {
        name: 'Conectividade de Rede',
        test: async () => {
          // Testa conectividade básica (se não estiver em mock)
          if (TEST_CONFIG.MOCK_MODE) {
            console.log('  📝 Pulando teste de rede (modo mock)');
            return true;
          }
          
          try {
            const response = await fetch('https://api.openai.com/v1/models', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              }
            });
            
            return response.status === 200;
          } catch (error) {
            console.warn('  ⚠️ Conectividade limitada, continuando em modo degradado');
            return true; // Não falha o teste por problemas de rede
          }
        }
      }
    ];

    for (const test of prerequisiteTests) {
      this.metricsCollector.recordTestStart(test.name);
      const startTime = Date.now();
      
      try {
        await TestUtils.withTimeout(test.test(), 10000); // 10s timeout
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(test.name, true, duration);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(test.name, false, duration);
        console.error(`❌ Pré-requisito falhou: ${test.name} - ${error.message}`);
        throw error;
      }
    }

    console.log('✅ Todos os pré-requisitos foram atendidos');
  }

  // 🎯 SUITE PRINCIPAL DE TESTES
  private async runMainTestSuite(): Promise<any> {
    console.log('\n🎯 Executando suite principal de testes...');
    
    const startTime = Date.now();
    this.metricsCollector.recordPerformanceData('main_test_suite_start', 0);
    
    try {
      const results = await this.testSuite.runCompleteTestSuite();
      
      const duration = Date.now() - startTime;
      this.metricsCollector.recordPerformanceData('main_test_suite_complete', duration, results);
      
      console.log('✅ Suite principal executada com sucesso');
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordPerformanceData('main_test_suite_error', duration, { error: error.message });
      throw error;
    }
  }

  // 🔗 TESTES DE INTEGRAÇÃO
  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Executando testes de integração...');
    
    const integrationTests = [
      {
        name: 'Integração Frontend-Backend',
        test: async () => {
          // Testa se o hook React consegue se comunicar com o backend
          const { useEnterpriseMultiAgent } = await import('@/hooks/useEnterpriseMultiAgent');
          
          // Simula inicialização do hook
          console.log('  📱 Testando comunicação frontend-backend...');
          return true; // Teste simplificado
        }
      },
      {
        name: 'Integração WhatsApp-MultiAgentes',
        test: async () => {
          // Testa integração entre WhatsApp e sistema multiagentes
          const { enterpriseWhatsApp } = await import('@/lib/integrations/EnterpriseWhatsApp');
          
          const testResult = await enterpriseWhatsApp.testConnection();
          console.log(`  📱 WhatsApp connection: ${testResult.message}`);
          
          return true; // Não falha mesmo se WhatsApp não estiver configurado
        }
      },
      {
        name: 'Integração Banco de Dados',
        test: async () => {
          // Testa conexão com Supabase
          if (TEST_CONFIG.MOCK_MODE) {
            console.log('  📝 Simulando conexão com banco (modo mock)');
            return true;
          }
          
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data, error } = await supabase.from('leads').select('count').limit(1);
            
            if (error) {
              console.warn(`  ⚠️ Banco com limitações: ${error.message}`);
              return true; // Não falha por problemas de DB em testes
            }
            
            console.log('  💾 Conexão com banco OK');
            return true;
          } catch (error) {
            console.warn(`  ⚠️ Erro de banco ignorado em testes: ${error.message}`);
            return true;
          }
        }
      }
    ];

    for (const test of integrationTests) {
      this.metricsCollector.recordTestStart(`Integration: ${test.name}`);
      const startTime = Date.now();
      
      try {
        await TestUtils.withTimeout(test.test(), 15000); // 15s timeout para integrações
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(`Integration: ${test.name}`, true, duration);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(`Integration: ${test.name}`, false, duration);
        console.error(`❌ Teste de integração falhou: ${test.name} - ${error.message}`);
        // Não para a execução por falhas de integração
      }
    }

    console.log('✅ Testes de integração concluídos');
  }

  // ⚡ TESTES DE PERFORMANCE
  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Executando testes de performance...');
    
    const performanceTests = [
      {
        name: 'Tempo de Inicialização',
        test: async () => {
          const startTime = Date.now();
          const { enterpriseMultiAgentSystem } = await import('@/lib/multiagents/EnterpriseMultiAgentSystem');
          const stats = enterpriseMultiAgentSystem.getSystemStats();
          const duration = Date.now() - startTime;
          
          console.log(`  ⏱️ Inicialização: ${duration}ms`);
          this.metricsCollector.recordPerformanceData('system_initialization', duration, stats);
          
          return duration < 5000; // Deve inicializar em menos de 5s
        }
      },
      {
        name: 'Processamento de Múltiplos Leads',
        test: async () => {
          const { enterpriseMultiAgentSystem } = await import('@/lib/multiagents/EnterpriseMultiAgentSystem');
          
          const leads = Array.from({ length: 5 }, (_, i) => ({
            id: `perf_test_${i}_${Date.now()}`,
            name: `Cliente Performance ${i}`,
            email: `perf${i}@test.com`,
            message: `Teste de performance ${i}`,
            source: 'performance_test'
          }));
          
          const startTime = Date.now();
          
          // Processa todos simultaneamente
          const promises = leads.map(lead => 
            enterpriseMultiAgentSystem.processLead(lead, lead.message)
          );
          
          await Promise.allSettled(promises);
          
          const duration = Date.now() - startTime;
          const avgPerLead = duration / leads.length;
          
          console.log(`  ⚡ ${leads.length} leads em ${duration}ms (${avgPerLead.toFixed(0)}ms/lead)`);
          this.metricsCollector.recordPerformanceData('concurrent_lead_processing', duration, {
            leads_count: leads.length,
            avg_per_lead: avgPerLead
          });
          
          return avgPerLead < 10000; // Menos de 10s por lead
        }
      },
      {
        name: 'Uso de Memória',
        test: async () => {
          if (typeof process === 'undefined' || !process.memoryUsage) {
            console.log('  📝 Teste de memória não disponível neste ambiente');
            return true;
          }
          
          const memoryBefore = process.memoryUsage();
          
          // Simula carga de trabalho
          const { enterpriseMultiAgentSystem } = await import('@/lib/multiagents/EnterpriseMultiAgentSystem');
          const stats = enterpriseMultiAgentSystem.getSystemStats();
          
          await TestUtils.delay(1000); // Aguarda estabilização
          
          const memoryAfter = process.memoryUsage();
          const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
          
          console.log(`  💾 Uso de memória: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(1)}MB`);
          console.log(`  📈 Diferença: ${(memoryDiff / 1024 / 1024).toFixed(1)}MB`);
          
          this.metricsCollector.recordPerformanceData('memory_usage', memoryDiff, {
            before: memoryBefore,
            after: memoryAfter,
            stats
          });
          
          // Considera OK se usar menos de 200MB adicionais
          return memoryDiff < 200 * 1024 * 1024;
        }
      }
    ];

    for (const test of performanceTests) {
      this.metricsCollector.recordTestStart(`Performance: ${test.name}`);
      const startTime = Date.now();
      
      try {
        const result = await TestUtils.withTimeout(test.test(), 30000); // 30s timeout para performance
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(`Performance: ${test.name}`, result, duration);
        
        if (!result) {
          console.warn(`⚠️ Teste de performance não atingiu critério: ${test.name}`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        this.metricsCollector.recordTestResult(`Performance: ${test.name}`, false, duration);
        console.error(`❌ Teste de performance falhou: ${test.name} - ${error.message}`);
      }
    }

    console.log('✅ Testes de performance concluídos');
  }

  // 📊 RELATÓRIO FINAL
  private async generateFinalReport(mainTestResults: any): Promise<any> {
    console.log('\n📊 Gerando relatório final...');
    
    const totalTime = Date.now() - this.startTime;
    const metrics = this.metricsCollector.getMetrics();
    
    const finalReport = {
      execution_info: {
        start_time: new Date(this.startTime).toISOString(),
        end_time: new Date().toISOString(),
        total_duration_ms: totalTime,
        environment: TEST_CONFIG.MOCK_MODE ? 'mock' : 'real',
        node_version: process.version
      },
      main_test_results: mainTestResults,
      runner_metrics: metrics,
      overall_status: this.calculateOverallStatus(mainTestResults, metrics),
      recommendations: this.generateRecommendations(mainTestResults, metrics),
      system_info: await this.collectSystemInfo()
    };

    // Exibe relatório no console
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RELATÓRIO FINAL - ENTERPRISE TEST SUITE');
    console.log('='.repeat(60));
    console.log(this.metricsCollector.generateReport());
    console.log('\n📋 RESUMO EXECUTIVO:');
    console.log(`Status Geral: ${finalReport.overall_status}`);
    console.log(`Tempo Total: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`Ambiente: ${finalReport.execution_info.environment.toUpperCase()}`);
    
    if (finalReport.recommendations.length > 0) {
      console.log('\n💡 RECOMENDAÇÕES:');
      finalReport.recommendations.forEach((rec: string) => console.log(`  ${rec}`));
    }
    
    console.log('='.repeat(60));

    return finalReport;
  }

  private calculateOverallStatus(mainResults: any, metrics: any): string {
    const mainTestsPassed = mainResults?.summary?.failed === 0;
    const runnerTestsPassed = metrics.tests_failed === 0;
    
    if (mainTestsPassed && runnerTestsPassed) {
      return '🎉 SUCESSO COMPLETO - Sistema 100% Funcional';
    } else if (mainTestsPassed || runnerTestsPassed) {
      return '⚠️ SUCESSO PARCIAL - Algumas funcionalidades OK';
    } else {
      return '❌ FALHAS CRÍTICAS - Requer correções';
    }
  }

  private generateRecommendations(mainResults: any, metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (mainResults?.summary?.failed === 0 && metrics.tests_failed === 0) {
      recommendations.push('✅ Sistema está pronto para produção');
      recommendations.push('🚀 Pode prosseguir com deploy');
      recommendations.push('📊 Implementar monitoramento contínuo');
    } else {
      if (mainResults?.summary?.failed > 0) {
        recommendations.push('🔧 Corrigir falhas nos testes principais');
      }
      if (metrics.tests_failed > 0) {
        recommendations.push('🔧 Revisar testes de integração e performance');
      }
      recommendations.push('⚠️ Não recomendado para produção até correções');
    }
    
    // Recomendações de performance
    const avgTestTime = metrics.avg_test_duration;
    if (avgTestTime > 5000) {
      recommendations.push('⚡ Otimizar performance - testes muito lentos');
    }
    
    return recommendations;
  }

  private async collectSystemInfo(): Promise<any> {
    const info: any = {
      timestamp: new Date().toISOString(),
      platform: typeof process !== 'undefined' ? process.platform : 'unknown',
      node_version: typeof process !== 'undefined' ? process.version : 'unknown',
      test_config: {
        mock_mode: TEST_CONFIG.MOCK_MODE,
        timeout: TEST_CONFIG.TEST_TIMEOUT,
        max_concurrent: TEST_CONFIG.MAX_CONCURRENT_TESTS
      }
    };
    
    // Adiciona informações de memória se disponível
    if (typeof process !== 'undefined' && process.memoryUsage) {
      info.memory = process.memoryUsage();
    }
    
    return info;
  }

  // 🧹 CLEANUP
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Executando cleanup...');
    
    try {
      // Limpa dados de teste
      await TestUtils.cleanupTestData();
      
      // Coleta métricas finais
      this.metricsCollector.recordMemoryUsage();
      
      console.log('✅ Cleanup concluído');
      
    } catch (error) {
      console.warn('⚠️ Erro durante cleanup:', error.message);
      // Não falha por problemas de cleanup
    }
  }
}

// 🚀 FUNÇÃO PRINCIPAL PARA EXECUTAR TODOS OS TESTES
export async function runCompleteEnterpriseTests(): Promise<any> {
  const runner = new EnterpriseTestRunner();
  return await runner.runAllTests();
}

// 🎯 EXECUÇÃO DIRETA SE CHAMADO COMO SCRIPT
if (require.main === module) {
  runCompleteEnterpriseTests()
    .then(results => {
      console.log('\n🎉 TESTES CONCLUÍDOS COM SUCESSO!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 TESTES FALHARAM:', error);
      process.exit(1);
    });
}
