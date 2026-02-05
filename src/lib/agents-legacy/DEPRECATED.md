# ⚠️ ARQUITETURA LEGADO — NÃO USAR

**Status**: DEPRECATED  
**Sprint**: 4 — Unificação de Arquitetura de Agentes  
**Data**: 04/02/2026  

---

## Por que este código foi isolado?

O projeto Jurify possuía **duas arquiteturas paralelas de agentes**:

| Arquitetura | Localização | Status |
|-------------|-------------|--------|
| **A (Legado)** | `src/lib/agents-legacy/` | ⚠️ DEPRECATED |
| **B (Oficial)** | `src/lib/multiagents/` | ✅ ATIVA |

A **Arquitetura A** foi isolada porque:

1. **Não integra RAG** (Sprint 2) — busca vetorial não implementada
2. **Não integra Streaming SSE** (Sprint 3) — respostas não são streamadas
3. **Modelo simplificado** — apenas 3 tipos de agente (SDR, CLOSER, CS)
4. **Não é o caminho de produção** — WhatsApp e Playground usam `multiagents`
5. **Sem testes** — nenhum teste de integração

---

## O que usar no lugar?

```typescript
// ❌ ERRADO (legado)
import { agentEngine } from '@/lib/agents-legacy/AgentEngine';
await agentEngine.processLeadMessage(leadId, message);

// ✅ CORRETO (arquitetura oficial)
import { multiAgentSystem } from '@/lib/multiagents';
await multiAgentSystem.processLead(leadData, message, 'whatsapp');
```

---

## Arquivos nesta pasta

| Arquivo | Descrição | Uso permitido |
|---------|-----------|---------------|
| `AgentEngine.ts` | Motor legado de agentes | ⚠️ Apenas tipos (`AgentType` enum) |
| `LeadProcessor.ts` | Processador de leads legado | ❌ Não usar |
| `WorkflowProcessor.ts` | Processador de workflows legado | ❌ Não usar |

---

## Referências

- **Arquitetura oficial**: `src/lib/multiagents/README.md`
- **Decisão técnica**: Sprint 4 — Unificação de Arquitetura
- **Hook oficial**: `useMultiAgentSystem` (não `useAgentEngine`)

---

## Posso deletar esta pasta?

**Não recomendado** no momento. Motivos:

1. Componentes de UI (`AgentTypeManager.tsx`, `NovoAgenteForm.tsx`) ainda usam o enum `AgentType`
2. Serve como referência histórica
3. Permite rollback emergencial (não recomendado)

**Futuramente**: Quando os componentes de UI forem migrados para usar tipos da arquitetura oficial, esta pasta pode ser removida.

---

**Última atualização**: Sprint 4 (04/02/2026)
