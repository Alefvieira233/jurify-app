import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiAgentSystem } from '../lib/multiagents/core/MultiAgentSystem';
import { MessageType, Priority } from '../lib/multiagents/types';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

describe('MultiAgent System Integration', () => {
  let system: MultiAgentSystem;

  beforeEach(async () => {
    // Reset singleton and mocks
    vi.clearAllMocks();
    system = MultiAgentSystem.getInstance();
    await system.reset();
  });

  it('should initialize all agents correctly', async () => {
    await system.initialize();
    const agents = system.listAgents();

    expect(agents).toContain('Coordenador');
    expect(agents).toContain('Juridico');
    expect(agents).toContain('Comercial');
    expect(agents.length).toBeGreaterThan(0);
  });

  it('should route messages between agents', async () => {
    await system.initialize();
    const coordinator = system.getAgent('Coordenador');

    expect(coordinator).toBeDefined();

    // Spy on receiveMessage
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

  it('should process a lead flow with mocked AI', async () => {
    // Mock AI response for Edge Function
    const mockAiResponse = {
      data: {
        result: 'AI Analysis Result',
        usage: { total_tokens: 100 },
        model: 'gpt-4',
        agentName: 'TestAgent',
        timestamp: new Date().toISOString()
      },
      error: null
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockAiResponse);

    const leadData = {
      id: 'lead_test_123',
      name: 'John Doe',
      message: 'I need a lawyer for a contract review',
      tenantId: 'tenant_123'
    };

    const result = await system.processLead(leadData, leadData.message);

    expect(result).toBeDefined();
    expect(result.executionId).toBeDefined();

    // Check if AI function was called (proving agents are trying to think)
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'ai-agent-processor',
      expect.any(Object)
    );
  });
});
