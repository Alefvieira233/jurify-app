/**
 * 🧪 CONFIGURAÇÃO DE TESTES ENTERPRISE
 * 
 * Configurações e utilitários para execução dos testes do sistema multiagentes.
 */

// 🔧 CONFIGURAÇÃO DE AMBIENTE PARA TESTES
export const TEST_CONFIG = {
  // OpenAI (usar chave real ou mock)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-mock-key-for-testing',
  
  // Supabase (usar projeto real ou mock)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
  
  // WhatsApp (usar configuração real ou mock)
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || 'EAA-test-token',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '123456789',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-verify-token',
  
  // Configurações de teste
  TEST_TIMEOUT: 30000, // 30 segundos por teste
  MAX_CONCURRENT_TESTS: 5,
  MOCK_MODE: !process.env.OPENAI_API_KEY || process.env.NODE_ENV === 'test'
};

// 🎭 DADOS MOCK PARA TESTES
export const MOCK_DATA = {
  leads: [
    {
      id: 'test_lead_1',
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '+5511999888777',
      message: 'Preciso de ajuda com direito trabalhista - demissão sem justa causa.',
      legal_area: 'trabalhista',
      source: 'test',
      metadata: { test: true }
    },
    {
      id: 'test_lead_2',
      name: 'Maria Santos',
      email: 'maria@test.com',
      phone: '+5511888777666',
      message: 'Tenho um problema com contrato de aluguel - proprietário não quer devolver caução.',
      legal_area: 'civil',
      source: 'test',
      metadata: { test: true }
    },
    {
      id: 'test_lead_3',
      name: 'Carlos Oliveira',
      email: 'carlos@test.com',
      phone: '+5511777666555',
      message: 'Empresa não está pagando horas extras corretamente.',
      legal_area: 'trabalhista',
      source: 'test',
      metadata: { test: true }
    }
  ],
  
  whatsapp_messages: [
    {
      id: 'wamid.test1',
      from: '5511999888777',
      to: '5511888888888',
      text: 'Olá, preciso de ajuda jurídica urgente!',
      timestamp: Date.now(),
      type: 'text' as const,
      metadata: {
        profile_name: 'João Teste',
        wa_id: '5511999888777'
      }
    }
  ],
  
  openai_responses: {
    coordinator: 'Analisando solicitação do cliente. Direcionando para agente especializado em direito trabalhista.',
    qualifier: 'Lead qualificado: caso trabalhista de média complexidade, cliente com urgência alta.',
    legal: 'Caso válido de direito trabalhista. Recomendo análise detalhada dos documentos.',
    commercial: 'Proposta: Consultoria trabalhista - R$ 500,00. Prazo: 5 dias úteis.',
    analyst: 'Análise: Cliente com perfil adequado, caso com 85% de chance de sucesso.',
    communicator: 'Mensagem formatada e enviada via WhatsApp com sucesso.',
    customer_success: 'Cliente onboarded, próximo follow-up agendado para 48h.'
  }
};

// 🛠️ UTILITÁRIOS DE TESTE
export class TestUtils {
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeout]);
  }
  
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
  
  static sanitizeForTest(data: any): any {
    if (typeof data === 'string') {
      return data.replace(/[<>]/g, ''); // Remove caracteres perigosos
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForTest(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeForTest(value);
      }
      return sanitized;
    }
    
    return data;
  }
  
  static async cleanupTestData(): Promise<void> {
    console.log('🧹 Limpando dados de teste...');
    
    // Se não estiver em modo mock, limpa dados reais do banco
    if (!TEST_CONFIG.MOCK_MODE) {
      try {
        // Aqui você pode adicionar limpeza real do Supabase se necessário
        console.log('⚠️ Modo real - não limpando dados do banco');
      } catch (error) {
        console.warn('⚠️ Erro ao limpar dados de teste:', error);
      }
    }
    
    console.log('✅ Limpeza concluída');
  }
}

// 📊 COLLECTOR DE MÉTRICAS DE TESTE
export class TestMetricsCollector {
  private metrics: any = {
    start_time: Date.now(),
    tests_run: 0,
    tests_passed: 0,
    tests_failed: 0,
    total_duration: 0,
    memory_usage: [],
    performance_data: []
  };
  
  recordTestStart(testName: string): void {
    this.metrics.tests_run++;
    console.log(`🧪 Iniciando teste: ${testName}`);
  }
  
  recordTestResult(testName: string, passed: boolean, duration: number): void {
    if (passed) {
      this.metrics.tests_passed++;
      console.log(`✅ Teste passou: ${testName} (${duration}ms)`);
    } else {
      this.metrics.tests_failed++;
      console.log(`❌ Teste falhou: ${testName} (${duration}ms)`);
    }
    
    this.metrics.total_duration += duration;
  }
  
  recordPerformanceData(operation: string, duration: number, details?: any): void {
    this.metrics.performance_data.push({
      operation,
      duration,
      details,
      timestamp: Date.now()
    });
  }
  
  recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.metrics.memory_usage.push({
        ...process.memoryUsage(),
        timestamp: Date.now()
      });
    }
  }
  
  getMetrics(): any {
    const endTime = Date.now();
    const totalTime = endTime - this.metrics.start_time;
    
    return {
      ...this.metrics,
      end_time: endTime,
      total_execution_time: totalTime,
      success_rate: this.metrics.tests_run > 0 
        ? ((this.metrics.tests_passed / this.metrics.tests_run) * 100).toFixed(1)
        : '0',
      avg_test_duration: this.metrics.tests_run > 0
        ? Math.round(this.metrics.total_duration / this.metrics.tests_run)
        : 0
    };
  }
  
  generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
🧪 RELATÓRIO DE TESTES ENTERPRISE
================================

📊 Resumo:
- Testes executados: ${metrics.tests_run}
- Sucessos: ${metrics.tests_passed}
- Falhas: ${metrics.tests_failed}
- Taxa de sucesso: ${metrics.success_rate}%

⏱️ Performance:
- Tempo total: ${metrics.total_execution_time}ms
- Tempo médio por teste: ${metrics.avg_test_duration}ms
- Duração total dos testes: ${metrics.total_duration}ms

💾 Memória:
- Amostras coletadas: ${metrics.memory_usage.length}
- Operações monitoradas: ${metrics.performance_data.length}

🎯 Status: ${metrics.tests_failed === 0 ? 'TODOS OS TESTES PASSARAM ✅' : 'ALGUNS TESTES FALHARAM ❌'}
`;
  }
}

// 🚀 CONFIGURAÇÃO GLOBAL PARA TESTES
export function setupTestEnvironment(): void {
  console.log('🚀 Configurando ambiente de testes enterprise...');
  
  // Configura variáveis de ambiente para testes
  if (TEST_CONFIG.MOCK_MODE) {
    console.log('🎭 Modo MOCK ativado - usando dados simulados');
    
    // Define variáveis mock
    process.env.OPENAI_API_KEY = TEST_CONFIG.OPENAI_API_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_CONFIG.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_CONFIG.SUPABASE_ANON_KEY;
  } else {
    console.log('🔴 Modo REAL ativado - usando APIs reais');
  }
  
  // Configura timeouts globais
  if (typeof jest !== 'undefined') {
    jest.setTimeout(TEST_CONFIG.TEST_TIMEOUT);
  }
  
  console.log('✅ Ambiente de testes configurado');
}

// 🧪 MOCK FACTORY
export class MockFactory {
  static createMockOpenAIResponse(agentType: string): any {
    return {
      choices: [{
        message: {
          content: MOCK_DATA.openai_responses[agentType as keyof typeof MOCK_DATA.openai_responses] || 
                  'Resposta mock padrão do agente.'
        }
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      }
    };
  }
  
  static createMockSupabaseResponse(operation: string, data?: any): any {
    switch (operation) {
      case 'select':
        return { data: data || [], error: null };
      case 'insert':
        return { data: data || { id: TestUtils.generateTestId() }, error: null };
      case 'update':
        return { data: data || { id: TestUtils.generateTestId() }, error: null };
      case 'delete':
        return { data: null, error: null };
      default:
        return { data: null, error: null };
    }
  }
  
  static createMockWhatsAppWebhook(message?: any): any {
    return {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '5511888888888',
              phone_number_id: TEST_CONFIG.WHATSAPP_PHONE_NUMBER_ID
            },
            messages: [message || MOCK_DATA.whatsapp_messages[0]]
          },
          field: 'messages'
        }]
      }]
    };
  }
}

export default {
  TEST_CONFIG,
  MOCK_DATA,
  TestUtils,
  TestMetricsCollector,
  setupTestEnvironment,
  MockFactory
};
