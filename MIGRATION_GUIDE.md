# 📚 GUIA DE MIGRAÇÃO - MultiAgent System v2.0

## 🎯 Objetivo

Este guia ajuda a migrar código que usava o antigo `MultiAgentSystem.ts` monolítico para a nova arquitetura modular.

---

## 🔄 IMPORTS - ANTES vs DEPOIS

### ❌ ANTES (Antigo)
```typescript
import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';
import { MessageType, AgentMessage } from '@/lib/multiagents/MultiAgentSystem';
```

### ✅ DEPOIS (Novo)
```typescript
import { multiAgentSystem } from '@/lib/multiagents';
import { MessageType, AgentMessage } from '@/lib/multiagents/types';

// Ou import específico
import { MultiAgentSystem } from '@/lib/multiagents/core/MultiAgentSystem';
import type { AgentMessage, MessageType } from '@/lib/multiagents/types';
```

---

## 🚀 INICIALIZAÇÃO - ANTES vs DEPOIS

### ❌ ANTES
```typescript
// Sistema iniciava automaticamente ao importar
import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';

// Uso direto
multiAgentSystem.processLead(leadData, message, 'whatsapp');
```

### ✅ DEPOIS
```typescript
import { multiAgentSystem } from '@/lib/multiagents';

// IMPORTANTE: Inicializar explicitamente
await multiAgentSystem.initialize();

// Agora pode usar
await multiAgentSystem.processLead(leadData, message, 'whatsapp');
```

**Motivo**: Inicialização explícita permite melhor controle e tratamento de erros.

---

## 🔐 CHAMADAS DE IA - ANTES vs DEPOIS

### ❌ ANTES (INSEGURO)
```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // EXPOSTO NO FRONTEND!
});

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...]
});
```

### ✅ DEPOIS (SEGURO)
```typescript
import { supabase } from '@/integrations/supabase/client';
import type { AgentAIRequest, AgentAIResponse } from '@/lib/multiagents/types';

const request: AgentAIRequest = {
  agentName: 'Coordenador',
  agentSpecialization: 'Orquestração',
  systemPrompt: 'Você é o coordenador...',
  userPrompt: 'Analise este lead...',
  context: { leadId: '123' },
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 1500
};

const { data, error } = await supabase.functions.invoke<AgentAIResponse>(
  'ai-agent-processor',
  { body: request }
);

if (error) throw error;
console.log('Resposta:', data.result);
console.log('Tokens usados:', data.usage?.total_tokens);
```

**Motivo**: API key fica protegida no servidor (Edge Function).

---

## 🤖 CRIAÇÃO DE AGENTES - ANTES vs DEPOIS

### ❌ ANTES (Tudo no mesmo arquivo)
```typescript
// Todos os agentes definidos em MultiAgentSystem.ts (689 linhas)
export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super('Coordenador', 'Orquestração...');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}
```

### ✅ DEPOIS (Arquivos separados)
```typescript
// src/lib/multiagents/agents/CoordinatorAgent.ts
import { BaseAgent } from '../core/BaseAgent';
import type { AgentMessage } from '../types';

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super('Coordenador', 'Orquestração e planejamento de tarefas jurídicas');
  }

  protected getSystemPrompt(): string {
    return 'Você é o Coordenador...';
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    // Implementação específica
  }
}
```

**Benefícios**:
- ✅ Cada agente em seu próprio arquivo
- ✅ Mais fácil de testar
- ✅ Mais fácil de manter
- ✅ Não expõe API keys

---

## 📨 ENVIO DE MENSAGENS - ANTES vs DEPOIS

### ❌ ANTES
```typescript
// Método processWithAI chamava OpenAI diretamente
protected async processWithAI(prompt: string, context?: any): Promise<string> {
  const completion = await this.openai.chat.completions.create({
    model: "gpt-4o",
    messages: [...]
  });
  return completion.choices[0]?.message?.content || 'Erro';
}
```

### ✅ DEPOIS
```typescript
// BaseAgent.processWithAI agora chama Edge Function
protected async processWithAI(
  prompt: string,
  context?: Record<string, unknown>
): Promise<string> {
  // Implementação interna chama supabase.functions.invoke
  // API key fica protegida no servidor
}
```

**Uso (mesmo para desenvolvedores)**:
```typescript
class MeuAgente extends BaseAgent {
  async minhaLogica() {
    const resposta = await this.processWithAI(
      'Analise este lead...',
      { leadId: '123', data: {...} }
    );
    console.log(resposta);
  }
}
```

---

## 🛡️ VALIDAÇÃO - ANTES vs DEPOIS

### ❌ ANTES (Sem validação)
```typescript
async processLead(leadData: any, message: string) {
  // Nenhuma validação - qualquer coisa passava
  const context = {
    leadId: leadData.id || `lead_${Date.now()}`,
    // ...
  };
}
```

### ✅ DEPOIS (Com Zod)
```typescript
import { validateLeadData, safeParseLeadData } from '@/lib/multiagents/validation/schemas';

// Opção 1: Lança erro se inválido
const validatedLead = validateLeadData(leadData);

// Opção 2: Safe parse (retorna resultado)
const result = safeParseLeadData(leadData);
if (!result.success) {
  console.error('Dados inválidos:', result.error);
  return;
}
const validatedLead = result.data;

// Usar dados validados
await multiAgentSystem.processLead(validatedLead, message, 'whatsapp');
```

---

## 🧪 TESTES - ANTES vs DEPOIS

### ❌ ANTES (Sem testes)
```typescript
// Nenhum teste implementado
// Impossível testar agentes isoladamente
```

### ✅ DEPOIS (Testes completos)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MultiAgentSystem } from '@/lib/multiagents/core/MultiAgentSystem';

describe('Sistema Multiagentes', () => {
  let system: MultiAgentSystem;

  beforeEach(async () => {
    system = MultiAgentSystem.getInstance();
    await system.reset();
  });

  it('deve inicializar com 7 agentes', async () => {
    await system.initialize();

    const stats = system.getSystemStats();
    expect(stats.total_agents).toBe(7);
  });

  // ... mais testes
});
```

**Executar testes**:
```bash
npm run test
npm run test:watch  # Modo watch
npm run test:coverage  # Com cobertura
```

---

## 📊 ESTATÍSTICAS E MONITORAMENTO

### ✅ NOVO: Logs de IA no Banco
```typescript
// Todos os usos de IA são automaticamente logados
// Tabela: agent_ai_logs

// Query de exemplo para analytics
const { data: logs } = await supabase
  .from('agent_ai_logs')
  .select('*')
  .eq('tenant_id', 'meu-tenant')
  .gte('created_at', '2025-01-01');

// Custo total de tokens
const totalTokens = logs.reduce((sum, log) => sum + log.total_tokens, 0);

// Materialize view para analytics
const { data: stats } = await supabase
  .from('agent_ai_logs_stats')
  .select('*')
  .eq('tenant_id', 'meu-tenant');
```

---

## 🔧 CONFIGURAÇÃO DE AMBIENTE

### Arquivo `.env`
```bash
# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (Edge Functions - via Supabase Dashboard)
OPENAI_API_KEY=sk-your-openai-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Configurar Secrets (Terminal)
```bash
# Login no Supabase
supabase login

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Verificar
supabase secrets list
```

---

## 🚀 DEPLOY CHECKLIST

### 1. Aplicar Migrações
```bash
cd supabase
supabase db push
```

### 2. Deploy Edge Function
```bash
supabase functions deploy ai-agent-processor
```

### 3. Testar Edge Function
```bash
# Localmente
supabase functions serve ai-agent-processor

# Produção - testar via curl
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-processor \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Test",
    "agentSpecialization": "Testing",
    "systemPrompt": "You are a test",
    "userPrompt": "Say hello"
  }'
```

### 4. Verificar Logs
```bash
supabase functions logs ai-agent-processor --tail
```

---

## 🐛 PROBLEMAS COMUNS

### ❌ "MultiAgentSystem not initialized"
**Causa**: Tentar usar o sistema antes de inicializar.

**Solução**:
```typescript
await multiAgentSystem.initialize();
```

### ❌ "Agent not found: NomeDoAgente"
**Causa**: Nome do agente incorreto.

**Solução**: Use os nomes corretos:
- `Coordenador`
- `Qualificador`
- `Juridico`
- `Comercial`
- `Analista`
- `Comunicador`
- `CustomerSuccess`

### ❌ Edge Function retorna erro 401
**Causa**: Falta token de autenticação.

**Solução**:
```typescript
const { data } = await supabase.functions.invoke('ai-agent-processor', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  },
  body: request
});
```

### ❌ "OPENAI_API_KEY not configured"
**Causa**: Secret não configurado na Edge Function.

**Solução**:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

---

## 📋 EXEMPLO COMPLETO DE MIGRAÇÃO

### ❌ CÓDIGO ANTIGO
```typescript
// OldLeadProcessor.ts
import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';

export async function processNewLead(data: any) {
  // Sem validação
  // Sem inicialização explícita
  // Sem error handling
  await multiAgentSystem.processLead(data, data.message, 'whatsapp');
}
```

### ✅ CÓDIGO NOVO
```typescript
// NewLeadProcessor.ts
import { multiAgentSystem } from '@/lib/multiagents';
import { validateLeadData } from '@/lib/multiagents/validation/schemas';
import type { LeadData } from '@/lib/multiagents/types';

export async function processNewLead(data: unknown): Promise<void> {
  try {
    // 1. Validar dados
    const validatedLead: LeadData = validateLeadData(data);

    // 2. Inicializar sistema (se necessário)
    if (!multiAgentSystem.isReady()) {
      await multiAgentSystem.initialize();
    }

    // 3. Processar lead
    await multiAgentSystem.processLead(
      validatedLead,
      validatedLead.message || '',
      'whatsapp'
    );

    console.log('✅ Lead processado com sucesso');

  } catch (error) {
    console.error('❌ Erro ao processar lead:', error);
    throw error;
  }
}
```

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

1. **Atualizar imports** em todos os arquivos que usam multiagentes
2. **Adicionar validação Zod** em todos os pontos de entrada
3. **Executar testes** para garantir compatibilidade
4. **Monitorar logs** de IA no banco para analytics
5. **Implementar retry logic** para chamadas de IA (opcional)
6. **Adicionar rate limiting** se necessário (opcional)

---

## 📞 SUPORTE

Se encontrar problemas durante a migração:
1. Verifique este guia
2. Leia `REFACTORING_SUMMARY.md`
3. Execute `npm run type-check` para erros de tipo
4. Execute `npm run test` para validar funcionamento
5. Verifique logs: `supabase functions logs ai-agent-processor`

---

**✅ MIGRAÇÃO COMPLETA - BEM-VINDO AO MULTIAGENT SYSTEM v2.0!**

