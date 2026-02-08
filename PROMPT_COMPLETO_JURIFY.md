# PROMPT ENGENHEIRADO - RESOLUÇÃO COMPLETA JURIFY

## CONTEXTO DO PROJETO
Você é um engenheiro de software sênior especialista em TypeScript, React, Supabase e arquitetura SaaS multi-tenant. Seu objetivo é deixar o projeto Jurify 100% funcional, type-safe e pronto para produção.

## REPOSITÓRIO
- **Path**: `e:\Jurify` (Windows)
- **Stack**: React + TypeScript + Vite + Supabase + Tailwind + shadcn/ui
- **Tenant**: Arquitetura multi-tenant com `tenant_id` em todas as tabelas

## 🚨 PROBLEMAS CRÍTICOS A RESOLVER

### 1. WHATSAPP INTEGRATION - ERRO 400 (PRIORIDADE MÁXIMA)
**Local**: `supabase/functions/evolution-manager/index.ts`
**Fluxo atual**:
- Frontend chama Edge Function ao clicar "Conectar WhatsApp"
- Erro 400 no console (Bad Request)
- QR Code não aparece

**Causas identificadas**:
- ENUM `status_integracao` só aceita: `'ativa'`, `'inativa'`, `'erro'`
- Tabela `configuracoes_integracoes` NÃO tem colunas: `tenant_id`, `phone_number_id`, `verify_token`
- Função tentava usar valores inválidos: `'aguardando_qr'`, `'desconectada'`

**O que já foi tentado**:
- Corrigido ENUM values na Edge Function
- Removido colunas inexistentes das queries
- Deploy da Edge Function realizado

**Verificar**:
- Se Evolution API está respondendo: `http://76.13.226.20:8080`
- Se webhook está configurado corretamente
- Se RLS está permitindo acesso
- Se há erros nos logs do Supabase

### 2. TIPAGEM - ELIMINAR TODOS `any` (PRIORIDADE ALTA)
**Arquivos com `any`**:
```
src/hooks/useGoogleCalendar.ts (11 ocorrências)
src/hooks/useDashboardMetrics.ts (5 ocorrências) - ✅ PARCIALMENTE CORRIGIDO
src/hooks/enterprise/useEnterpriseMetrics.ts (2 ocorrências)
src/hooks/useSupabaseQuery.ts (2 ocorrências)
src/hooks/useZapSignIntegration.ts (2 ocorrências)
```

**Ações**:
- Criar interfaces TypeScript apropriadas
- Usar tipos do Supabase quando possível
- Adicionar `satisfies` ou type guards onde necessário

### 3. TEST COVERAGE (PRIORIDADE MÉDIA)
**Framework**: Vitest + React Testing Library
**Meta**: > 80% coverage nos fluxos críticos

**Fluxos prioritários**:
- Autenticação (login/logout)
- CRUD de Leads
- CRUD de Contratos
- Integração WhatsApp (mockar Supabase)
- Dashboard metrics

**Criar**:
- `src/tests/integration/auth.test.tsx`
- `src/tests/integration/leads.test.tsx`
- `src/tests/integration/whatsapp.test.tsx`
- Mocks para Supabase e Evolution API

### 4. ACCESSIBILITY (PRIORIDADE MÉDIA)
**Verificar**:
- Todos botões têm `aria-label`
- Formulários têm `label` associado a inputs
- Cores têm contraste WCAG 2.1 AA
- Navegação por teclado funciona
- Focus indicators visíveis

## 🔧 CHECKLIST TÉCNICO

### TypeScript Strict Mode
- Habilitar `"strict": true` no tsconfig.json
- Corrigir todos erros de strict mode
- Nenhum `any` no código de produção

### Supabase
- Verificar se todas migrations foram aplicadas
- Confirmar RLS policies em todas tabelas
- Verificar Edge Functions estão deployadas
- Confirmar secrets configuradas: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

### Performance
- Lazy loading de rotas pesadas
- Memoização de componentes críticos
- Otimização de queries Supabase

### Segurança
- Sanitização de inputs
- Proteção contra XSS
- CSP headers configurados

## 📋 INSTRUÇÕES DE EXECUÇÃO

1. **Comece pelo WhatsApp** - É o recurso mais crítico e visível
   - Teste localmente primeiro (`npm run dev`)
   - Verifique logs do Supabase Dashboard
   - Use `console.log` estratégico na Edge Function

2. **TypeScript** - Corrija um arquivo por vez
   - Comece pelos hooks mais usados
   - Teste após cada arquivo

3. **Testes** - Comece com testes de integração
   - Mock externo (Supabase/Evolution API)
   - Teste fluxos completos do usuário

4. **Accessibility** - Audit com Lighthouse
   - Corrija erros críticos primeiro
   - Teste navegação por teclado

## 🎯 CRITÉRIOS DE SUCESSO

- [ ] WhatsApp: QR Code aparece em < 5s ao clicar "Conectar"
- [ ] WhatsApp: Estado de conexão persiste após reload
- [ ] TypeScript: Zero erros de compilação (`npm run build`)
- [ ] TypeScript: Zero `any` types no `src/`
- [ ] Testes: > 80% coverage em fluxos críticos
- [ ] Lighthouse: Score > 90 em Performance, A11y, Best Practices
- [ ] Build: Produção builda sem warnings

## 🔍 COMO DEBUGAR O WHATSAPP

1. Abra DevTools (F12) → Console
2. Acesse "WhatsApp IA" no menu
3. Clique "Conectar WhatsApp"
4. Observe o erro no console:
   - Se 400: Problema na Edge Function ou banco
   - Se CORS: Problema nas configurações do Supabase
   - Se 500: Erro interno na Evolution API

**Logs importantes**:
```javascript
// Na Edge Function
console.log("[evolution-manager] Action:", action);
console.log("[evolution-manager] Instance:", instanceName);
console.log("[evolution-manager] Evolution API response:", result);

// No frontend
console.log("[WhatsApp] Iniciando conexão...");
console.log("[WhatsApp] Resposta da Edge Function:", result);
console.log("[WhatsApp] QR Code recebido:", qr ? "Sim" : "Não");
```

## 🆘 SE WHATSAPP CONTINUAR COM ERRO 400

**Verifique na ordem**:
1. Console do Supabase (Logs → Edge Functions)
2. Console da Evolution API no VPS (`docker logs evolution-api`)
3. Network tab no DevTools (ver request/response completo)
4. RLS: Execute `SELECT * FROM configuracoes_integracoes` no SQL Editor

**Possíveis causas restantes**:
- RLS bloqueando INSERT/UPDATE
- Tenant ID não sendo passado corretamente
- Evolution API offline ou URL incorreta
- Autenticação JWT falhando na Edge Function

## 📤 ENTREGA ESPERADA

1. Código funcionando (commit claro por problema resolvido)
2. README atualizado com instruções de setup
3. Documentação de quaisquer hacks/workarounds temporários
4. Lista de débitos técnicos para próximas sprints

---

**RESOLVA TUDO. NÃO ENTREGE NADA PARCIAL. O OBJETIVO É 10/10.**
