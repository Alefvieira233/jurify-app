# 🤖 Jurify MultiAgent System v2.0

## 📖 Visão Geral

Sistema de multiagentes autônomos para automação jurídica completa. Arquitetura enterprise-grade com segurança SpaceX standard.

**Versão**: 2.0.0
**Status**: ✅ Produção
**Licença**: Proprietário

---

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
src/lib/multiagents/
├── README.md                     # Este arquivo
├── index.ts                      # Exports centralizados
│
├── types/
│   └── index.ts                  # TypeScript types & interfaces
│
├── validation/
│   └── schemas.ts                # Zod schemas para validação runtime
│
├── core/
│   ├── BaseAgent.ts              # Classe base abstrata para agentes
│   └── MultiAgentSystem.ts       # Orquestrador principal (Singleton)
│
└── agents/
    ├── CoordinatorAgent.ts       # Coordenador estratégico
    ├── QualifierAgent.ts         # Qualificador de leads
    ├── LegalAgent.ts             # Especialista jurídico
    ├── CommercialAgent.ts        # Vendas e propostas
    ├── AnalystAgent.ts           # Análise de dados
    ├── CommunicatorAgent.ts      # Comunicação multicanal
    └── CustomerSuccessAgent.ts   # Sucesso do cliente
```

---

## 🎯 Agentes Disponíveis

| Agente | Responsabilidade | Especialização |
|--------|------------------|----------------|
| **Coordenador** | Orquestração geral | Planejamento estratégico e coordenação |
| **Qualificador** | Análise de leads | Identificação de área jurídica e urgência |
| **Jurídico** | Validação legal | Viabilidade, precedentes e estratégias |
| **Comercial** | Propostas | Vendas consultivas e fechamento |
| **Analista** | Métricas | Insights de performance e ROI |
| **Comunicador** | Mensagens | Formatação WhatsApp/Email/Chat |
| **Customer Success** | Pós-venda | Onboarding e retenção |

---

## 🚀 Quick Start

### 1. Instalação

```bash
# Instalar dependências
npm install

# Aplicar migrações
supabase db push

# Deploy Edge Function
supabase functions deploy ai-agent-processor

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sk-your-key
```

### 2. Uso Básico

```typescript
import { multiAgentSystem } from '@/lib/multiagents';
import type { LeadData } from '@/lib/multiagents/types';

// Inicializar sistema
await multiAgentSystem.initialize();

// Processar lead
const leadData: LeadData = {
  id: 'lead_123',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '+5511999999999',
  message: 'Preciso de ajuda com ação trabalhista',
  source: 'whatsapp',
  tenantId: 'tenant_001'
};

await multiAgentSystem.processLead(
  leadData,
  leadData.message,
  'whatsapp'
);

// Verificar estatísticas
const stats = multiAgentSystem.getSystemStats();
console.log(`Total de agentes: ${stats.total_agents}`);
console.log(`Mensagens processadas: ${stats.messages_processed}`);
```

---

## 🔐 Segurança

### Proteção de API Keys

**❌ NUNCA faça isso:**
```typescript
// ERRADO - Expõe API key no frontend
import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**✅ SEMPRE faça assim:**
```typescript
// CORRETO - API key protegida no servidor
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.functions.invoke('ai-agent-processor', {
  body: request
});
```

### Row Level Security (RLS)

Todas as tabelas têm RLS ativado:
- `agent_ai_logs`: Isolamento por tenant
- Políticas: SELECT (tenant), INSERT (service role), DELETE (admin)

### Autenticação

Edge Functions requerem autenticação via Supabase Auth:
```typescript
const { data } = await supabase.functions.invoke('ai-agent-processor', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  },
  body: request
});
```

---

## 🛡️ Validação

### Runtime Validation com Zod

```typescript
import {
  validateLeadData,
  validateAgentAIRequest,
  safeParseLeadData
} from '@/lib/multiagents/validation/schemas';

// Opção 1: Throw error se inválido
const validLead = validateLeadData(data);

// Opção 2: Safe parse
const result = safeParseLeadData(data);
if (result.success) {
  const validLead = result.data;
} else {
  console.error(result.error);
}
```

### Schemas Disponíveis

- `AgentMessageSchema`
- `AgentAIRequestSchema`
- `AgentAIResponseSchema`
- `LeadDataSchema`
- `TaskRequestPayloadSchema`
- `StatusUpdatePayloadSchema`
- `ErrorReportPayloadSchema`
- `SystemStatsSchema`

---

## 📨 Sistema de Mensagens

### Tipos de Mensagens

```typescript
enum MessageType {
  TASK_REQUEST = 'task_request',        // Solicitar tarefa
  TASK_RESPONSE = 'task_response',      // Responder tarefa
  DATA_SHARE = 'data_share',            // Compartilhar dados
  DECISION_REQUEST = 'decision_request', // Pedir decisão
  DECISION_RESPONSE = 'decision_response', // Responder decisão
  STATUS_UPDATE = 'status_update',      // Atualizar status
  ERROR_REPORT = 'error_report'         // Reportar erro
}
```

### Prioridades

```typescript
enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Enviar Mensagem

```typescript
// Dentro de um agente
await this.sendMessage(
  'Qualificador',          // Para
  MessageType.TASK_REQUEST,
  { task: 'analyze_lead', data: leadData },
  Priority.HIGH
);
```

---

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
npm run test

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage

# Específico
npm run test AgentsIntegration.test.ts
```

### Exemplo de Teste

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MultiAgentSystem } from '@/lib/multiagents/core/MultiAgentSystem';

describe('Coordenador', () => {
  let system: MultiAgentSystem;

  beforeEach(async () => {
    system = MultiAgentSystem.getInstance();
    await system.reset();
  });

  it('deve orquestrar fluxo completo', async () => {
    await system.initialize();

    const leadData = {
      id: 'test_001',
      message: 'Preciso de ajuda',
      source: 'whatsapp'
    };

    await system.processLead(leadData, leadData.message, 'whatsapp');

    const stats = system.getSystemStats();
    expect(stats.messages_processed).toBeGreaterThan(0);
  });
});
```

---

## 📊 Monitoramento e Analytics

### Logs de IA

Todas as chamadas de IA são automaticamente logadas em `agent_ai_logs`:

```sql
SELECT
  agent_name,
  model,
  total_tokens,
  created_at
FROM agent_ai_logs
WHERE tenant_id = 'your-tenant'
ORDER BY created_at DESC
LIMIT 100;
```

### Materialized View para Analytics

```sql
SELECT
  agent_name,
  date,
  total_calls,
  total_tokens_used,
  avg_tokens_per_call
FROM agent_ai_logs_stats
WHERE tenant_id = 'your-tenant'
  AND date >= NOW() - INTERVAL '30 days';
```

### Custo Estimado

```typescript
const { data: logs } = await supabase
  .from('agent_ai_logs')
  .select('total_tokens')
  .eq('tenant_id', tenantId)
  .gte('created_at', startDate);

const totalTokens = logs.reduce((sum, log) => sum + log.total_tokens, 0);

// GPT-4 Turbo: $0.01 / 1K prompt tokens, $0.03 / 1K completion tokens
// Estimativa simplificada: $0.02 / 1K tokens
const estimatedCost = (totalTokens / 1000) * 0.02;

console.log(`Custo estimado: $${estimatedCost.toFixed(2)}`);
```

---

## 🎨 Criar Novo Agente

### 1. Criar Arquivo

```typescript
// src/lib/multiagents/agents/MyNewAgent.ts
import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, TaskRequestPayload } from '../types';

export class MyNewAgent extends BaseAgent {
  constructor() {
    super('MeuAgente', 'Descrição da especialização');
  }

  protected getSystemPrompt(): string {
    return `
      Você é o MeuAgente especialista em X. Suas responsabilidades:

      1. Fazer X
      2. Processar Y
      3. Validar Z

      Seja preciso e eficiente.
    `;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.TASK_REQUEST:
        const payload = message.payload as TaskRequestPayload;
        await this.processTask(payload);
        break;

      default:
        console.log(`⚠️ MeuAgente: mensagem não tratada ${message.type}`);
    }
  }

  private async processTask(payload: TaskRequestPayload): Promise<void> {
    console.log('🔧 MeuAgente processando tarefa...');

    const result = await this.processWithAI(
      `Sua tarefa: ${JSON.stringify(payload)}`,
      payload.context
    );

    // Envia resultado
    await this.sendMessage(
      'Coordenador',
      MessageType.TASK_RESPONSE,
      { result, success: true }
    );
  }
}
```

### 2. Registrar no MultiAgentSystem

```typescript
// src/lib/multiagents/core/MultiAgentSystem.ts
import { MyNewAgent } from '../agents/MyNewAgent';

// No método initialize()
this.agents.set('MeuAgente', new MyNewAgent());
```

### 3. Exportar

```typescript
// src/lib/multiagents/index.ts
export { MyNewAgent } from './agents/MyNewAgent';
```

### 4. Adicionar Testes

```typescript
// src/tests/MyNewAgent.test.ts
describe('MyNewAgent', () => {
  it('deve processar tarefa corretamente', async () => {
    const system = MultiAgentSystem.getInstance();
    await system.reset();

    const agent = system.getAgent('MeuAgente');
    expect(agent).toBeDefined();
    expect(agent?.getSpecialization()).toBe('Descrição da especialização');
  });
});
```

---

## 🔧 Configuração Avançada

### Customizar Parâmetros de IA

```typescript
class MyAgent extends BaseAgent {
  constructor() {
    super('MeuAgente', 'Especialização');

    // Configurar parâmetros de IA
    this.configureAI({
      model: 'gpt-4o',
      temperature: 0.9,  // Mais criativo
      maxTokens: 2000    // Respostas mais longas
    });
  }
}
```

### Contexto Compartilhado

```typescript
class MyAgent extends BaseAgent {
  async processTask() {
    // Ler contexto
    const context = this.getContext();
    console.log(`Lead ID: ${context?.leadId}`);

    // Atualizar contexto
    this.updateSharedContext({
      currentStage: 'my_custom_stage',
      decisions: {
        ...context?.decisions,
        myDecision: { value: 'approved', timestamp: new Date() }
      }
    });
  }
}
```

---

## 📈 Performance

### Otimizações Implementadas

- ✅ **Debounce em filtros**: 500ms
- ✅ **Índices de banco**: Otimizados para queries frequentes
- ✅ **Materialized views**: Analytics pré-computados
- ✅ **Caching de contexto**: Contexto compartilhado em memória
- ✅ **Batch processing**: Mensagens processadas em batch

### Recomendações

1. **Rate Limiting**: Implementar se > 1000 chamadas/dia
2. **Retry Logic**: Adicionar retry com exponential backoff
3. **Circuit Breaker**: Para falhas consecutivas da OpenAI
4. **Caching de Respostas**: Cache respostas idênticas

---

## 🐛 Troubleshooting

### Problema: Edge Function timeout
**Solução**: Reduzir `maxTokens` ou dividir tarefa em subtarefas menores.

### Problema: Validação Zod falhando
**Solução**: Verificar schema e dados. Usar `safeParse` para debug:
```typescript
const result = safeParseLeadData(data);
console.log(result.error?.format());
```

### Problema: Agente não responde
**Solução**: Verificar logs e histórico:
```typescript
const history = multiAgentSystem.getMessageHistory();
console.log(history);
```

### Problema: Custo alto de tokens
**Solução**:
- Reduzir `maxTokens`
- Otimizar prompts (ser mais conciso)
- Usar cache para respostas repetidas

---

## 📚 Recursos

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Zod Documentation](https://zod.dev)
- [Vitest Documentation](https://vitest.dev)

---

## 🔄 Changelog

### v2.0.0 (2025-12-10)
- ✅ Refatoração completa para arquitetura modular
- ✅ Segurança: Edge Functions para chamadas de IA
- ✅ Validação runtime com Zod
- ✅ Testes de integração completos
- ✅ Logs de auditoria em banco
- ✅ Documentação completa

### v1.0.0 (2024-XX-XX)
- 🏗️ Versão inicial monolítica

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar este README
2. Consultar `MIGRATION_GUIDE.md`
3. Verificar `REFACTORING_SUMMARY.md`
4. Executar `npm run test` para validar setup

---

**✅ JURIFY MULTIAGENT SYSTEM v2.0 - READY FOR PRODUCTION**

