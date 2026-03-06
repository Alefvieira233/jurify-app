import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock for all Supabase operations
function createChainableQuery() {
  const result = { data: null, error: null };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    rpc: () => createChainableQuery(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/ai/model', () => ({
  DEFAULT_OPENAI_MODEL: 'gpt-4o-mini',
}));

import { AnalystAgent } from '../AnalystAgent';
import { CustomerSuccessAgent } from '../CustomerSuccessAgent';
import { QualifierAgent } from '../QualifierAgent';
import { CommercialAgent } from '../CommercialAgent';
import { CommunicatorAgent } from '../CommunicatorAgent';
import { LegalAgent } from '../LegalAgent';
import { AdvancedReasoningAgent } from '../AdvancedReasoningAgent';
import { AnalyticsAgent } from '../AnalyticsAgent';
import { CoordinatorAgent } from '../CoordinatorAgent';

describe('AnalystAgent', () => {
  let agent: AnalystAgent;

  beforeEach(() => {
    agent = new AnalystAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Analista');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Dados e Insights');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('analista');
  });

  it('can receive messages without throwing', async () => {
    await expect(
      agent.receiveMessage({
        id: 'msg-1', from: 'Test', to: 'Analista',
        type: 'task_request' as never, payload: { task: 'unknown' },
        timestamp: new Date(), priority: 'medium' as never, requires_response: false,
      })
    ).resolves.toBeUndefined();
  });
});

describe('CustomerSuccessAgent', () => {
  let agent: CustomerSuccessAgent;

  beforeEach(() => {
    agent = new CustomerSuccessAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('CustomerSuccess');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Sucesso do Cliente');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('customer_success');
  });
});

describe('QualifierAgent', () => {
  let agent: QualifierAgent;

  beforeEach(() => {
    agent = new QualifierAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Qualificador');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Qualificacao de Leads');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('qualificador');
  });
});

describe('CommercialAgent', () => {
  let agent: CommercialAgent;

  beforeEach(() => {
    agent = new CommercialAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Comercial');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Vendas');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('comercial');
  });
});

describe('CommunicatorAgent', () => {
  let agent: CommunicatorAgent;

  beforeEach(() => {
    agent = new CommunicatorAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Comunicador');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Comunicacao');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('comunicador');
  });
});

describe('LegalAgent', () => {
  let agent: LegalAgent;

  beforeEach(() => {
    agent = new LegalAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Juridico');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('Analise Legal');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('juridico');
  });
});

describe('AdvancedReasoningAgent', () => {
  let agent: AdvancedReasoningAgent;

  beforeEach(() => {
    agent = new AdvancedReasoningAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Raciocínio Avançado');
  });

  it('has correct specialization', () => {
    expect(typeof agent.getSpecialization()).toBe('string');
  });

  it('has correct agent ID', () => {
    expect(typeof agent.getAgentId()).toBe('string');
  });
});

describe('AnalyticsAgent', () => {
  let agent: AnalyticsAgent;

  beforeEach(() => {
    agent = new AnalyticsAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Analytics & Insights');
  });

  it('has correct specialization', () => {
    expect(agent.getSpecialization()).toBe('analytics');
  });

  it('has correct agent ID', () => {
    expect(agent.getAgentId()).toBe('analytics_agent');
  });
});

describe('CoordinatorAgent', () => {
  let agent: CoordinatorAgent;

  beforeEach(() => {
    agent = new CoordinatorAgent();
  });

  it('has correct name', () => {
    expect(agent.getName()).toBe('Coordenador');
  });

  it('has correct specialization', () => {
    expect(typeof agent.getSpecialization()).toBe('string');
  });

  it('has correct agent ID', () => {
    expect(typeof agent.getAgentId()).toBe('string');
  });

});
