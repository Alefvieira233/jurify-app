import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiAgentSystem } from '../lib/multiagents/core/MultiAgentSystem';
import { ExecutionTracker } from '../lib/multiagents/core/ExecutionTracker';
import { MessageType, Priority } from '../lib/multiagents/types';
import { supabase } from '../integrations/supabase/client';

// Chainable proxy for supabase queries
function createChainableQuery(data: unknown = { id: 'mock-id' }, error: unknown = null) {
  const result = { data, error };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => createChainableQuery({
      id: 'mock-lead-id',
      telefone: '+5511999999999',
      nome: 'Test Lead',
      tenant_id: 'tenant_123',
      started_at: new Date().toISOString(),
      agents_involved: [],
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      estimated_cost_usd: 0,
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } } })
    }
  }
}));

// Mock WhatsApp integration
vi.mock('../lib/integrations/WhatsAppMultiAgent', () => ({
  whatsAppMultiAgent: {
    sendMessage: vi.fn().mockResolvedValue(true)
  }
}));

describe('MultiAgent System Integration', () => {
  let system: MultiAgentSystem;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-establish supabase.functions.invoke mock cleared by clearAllMocks
    // Must return a valid AI response (data.result required) to avoid "Invalid response from AI processor"
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        result: JSON.stringify({ status: 'ok', message: 'mock default response' }),
        usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
        model: 'gpt-4',
        agentName: 'mock',
        timestamp: new Date().toISOString()
      },
      error: null
    });

    system = MultiAgentSystem.getInstance();
    await system.reset();
  });

  // Clear all pending timers to prevent leaks
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize all agents correctly', async () => {
    await system.initialize();
    const agents = system.listAgents();

    expect(agents).toContain('Coordenador');
    expect(agents).toContain('Qualificador');
    expect(agents).toContain('Juridico');
    expect(agents).toContain('Comercial');
    expect(agents).toContain('Comunicador');
    expect(agents.length).toBeGreaterThanOrEqual(5);
  });

  it('should route messages between agents', async () => {
    await system.initialize();
    const coordinator = system.getAgent('Coordenador');

    expect(coordinator).toBeDefined();

    const receiveSpy = vi.spyOn(coordinator!, 'receiveMessage');

    await system.routeMessage({
      id: 'test_msg_1',
      from: 'System',
      to: 'Coordenador',
      type: MessageType.TASK_REQUEST,
      payload: { task: 'test' },
      timestamp: new Date(),
      priority: Priority.HIGH,
      requires_response: false
    });

    expect(receiveSpy).toHaveBeenCalled();
  });

  it('should process a lead and return ExecutionResult with real structure', async () => {
    const mockQualificationResponse = {
      data: {
        result: JSON.stringify({
          qualificado: true,
          score: 85,
          area_juridica: 'trabalhista',
          urgencia: 'alta',
          proximo_passo: 'agendar_consulta'
        }),
        usage: { total_tokens: 150 },
        model: 'gpt-4',
        agentName: 'Qualificador',
        timestamp: new Date().toISOString()
      },
      error: null
    };

    const mockLegalResponse = {
      data: {
        result: JSON.stringify({
          viavel: true,
          fundamento_legal: 'CLT Art. 477',
          complexidade: 'media',
          estrategia_recomendada: 'judicial'
        }),
        usage: { total_tokens: 200 },
        model: 'gpt-4',
        agentName: 'Juridico',
        timestamp: new Date().toISOString()
      },
      error: null
    };

    const mockProposalResponse = {
      data: {
        result: JSON.stringify({
          proposta: {
            valor_total: 'R$ 5.000,00',
            modelo_cobranca: 'hibrido',
            entrada: 'R$ 1.500,00',
            parcelas: '3x de R$ 1.166,67'
          },
          mensagem_cliente: 'Prezado cliente, preparamos uma proposta...'
        }),
        usage: { total_tokens: 250 },
        model: 'gpt-4',
        agentName: 'Comercial',
        timestamp: new Date().toISOString()
      },
      error: null
    };

    const mockMessageResponse = {
      data: {
        result: JSON.stringify({
          canal: 'whatsapp',
          mensagem_formatada: 'Preparamos sua proposta personalizada...',
          tom_usado: 'semiformal'
        }),
        usage: { total_tokens: 100 },
        model: 'gpt-4',
        agentName: 'Comunicador',
        timestamp: new Date().toISOString()
      },
      error: null
    };

    // Setup mock to return different responses for each agent call
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce(mockQualificationResponse)
      .mockResolvedValueOnce(mockQualificationResponse)
      .mockResolvedValueOnce(mockLegalResponse)
      .mockResolvedValueOnce(mockProposalResponse)
      .mockResolvedValueOnce(mockMessageResponse);

    const leadData = {
      id: 'lead_test_123',
      name: 'João Silva',
      phone: '+5511999999999',
      message: 'Fui demitido sem justa causa e não recebi as verbas rescisórias',
      tenantId: 'tenant_123'
    };

    const result = await system.processLead(
      leadData,
      leadData.message,
      'whatsapp',
      { waitForCompletion: true, timeoutMs: 10000 }
    );

    expect(result).toBeDefined();
    expect(result.executionId).toBeDefined();
    expect(result.executionId).toMatch(/^exec_/);
    expect(result.leadId).toBe('lead_test_123');
    expect(result.tenantId).toBe('tenant_123');
    expect(result.status).toBeDefined();
    expect(['pending', 'processing', 'completed', 'failed', 'timeout']).toContain(result.status);

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'ai-agent-processor',
      expect.any(Object)
    );
  });

  it('should create ExecutionTracker and persist to database', async () => {
    const tracker = await ExecutionTracker.create(
      'test-lead-id',
      'test-tenant-id',
      'test-user-id'
    );

    expect(tracker).toBeDefined();
    expect(tracker.executionId).toMatch(/^exec_/);
    expect(tracker.leadId).toBe('test-lead-id');
    expect(tracker.tenantId).toBe('test-tenant-id');
    expect(tracker.getStatus()).toBe('pending');

    expect(supabase.from).toHaveBeenCalledWith('agent_executions');

    // Clean up: complete the tracker to avoid unhandled rejection from timeout
    await tracker.markCompleted();
  });

  it('should record stage results in ExecutionTracker', async () => {
    const tracker = await ExecutionTracker.create(
      'test-lead-id',
      'test-tenant-id'
    );

    await tracker.recordStageResult(
      'qualification',
      'Qualificador',
      { score: 85, area: 'trabalhista' },
      150,
      true
    );

    const result = tracker.getResult();
    expect(result.stages.length).toBe(1);
    expect(result.stages[0].stageName).toBe('qualification');
    expect(result.stages[0].agentName).toBe('Qualificador');
    expect(result.stages[0].tokens).toBe(150);
    expect(result.totalTokens).toBe(150);

    // Clean up
    await tracker.markCompleted();
  });

  it('should mark execution as completed and resolve promise', async () => {
    const tracker = await ExecutionTracker.create(
      'test-lead-id',
      'test-tenant-id'
    );

    await tracker.recordStageResult('qualification', 'Qualificador', { score: 85 }, 100, true);
    await tracker.recordStageResult('legal_validation', 'Juridico', { viable: true }, 150, true);

    await tracker.markCompleted();

    expect(tracker.getStatus()).toBe('completed');
    expect(tracker.isComplete()).toBe(true);

    const result = tracker.getResult();
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBeDefined();
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle execution failure gracefully', async () => {
    const tracker = await ExecutionTracker.create(
      'test-lead-id',
      'test-tenant-id'
    );

    // Catch the rejection from the internal completion promise
    const completionPromise = tracker.waitForCompletion(5000).catch(() => {
      // Expected: markFailed rejects the completion promise
    });

    await tracker.markFailed('Test error message');

    // Wait for the rejection to be handled
    await completionPromise;

    expect(tracker.getStatus()).toBe('failed');
    expect(tracker.isComplete()).toBe(true);

    const result = tracker.getResult();
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Test error message');
  });
});
