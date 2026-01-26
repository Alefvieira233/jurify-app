# 🏗️ Jurify Infrastructure & Operations Guide

**Data de criação:** 18/12/2025
**Versão:** 2.0
**Status:** ✅ Production Ready

---

## 📋 Índice

1. [Arquitetura Geral](#arquitetura-geral)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Monitoring & Observability](#monitoring--observability)
4. [Load Testing](#load-testing)
5. [Security](#security)
6. [Deployment](#deployment)
7. [Operations Runbook](#operations-runbook)

---

## 🏛️ Arquitetura Geral

### Stack Tecnológico

```
Frontend:  React 18 + TypeScript + Vite
Backend:   Supabase (PostgreSQL + Edge Functions Deno)
Auth:      Supabase Auth (JWT)
Storage:   Supabase Storage
IA:        OpenAI GPT-4 (via Edge Functions)
CI/CD:     GitHub Actions
Monitoring: Sentry
Testing:   Vitest + Playwright + k6
```

### Fluxo de Deploy

```
┌─────────────┐
│   Código    │
│   GitHub    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   CI Pipeline       │
│  ✓ Lint             │
│  ✓ Type Check       │
│  ✓ Tests            │
│  ✓ Security Scan    │
│  ✓ Build            │
└──────┬──────────────┘
       │
       ▼ (master/main)
┌─────────────────────┐
│  Deploy Pipeline    │
│  ✓ Frontend         │
│  ✓ Edge Functions   │
│  ✓ Migrations       │
│  ✓ Smoke Tests      │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│  Produção   │
└─────────────┘
```

---

## 🔄 CI/CD Pipeline

### Workflows Disponíveis

#### 1. `.github/workflows/ci.yml`
**Trigger:** Push/PR em master/main/develop
**Jobs:**
1. **Lint & Type Check** (~2min)
   - ESLint
   - TypeScript strict mode

2. **Unit Tests** (~3min)
   - Vitest
   - Coverage report

3. **Build** (~5min)
   - Vite production build
   - Bundle size analysis

4. **Security Scan** (~2min)
   - TruffleHog (detect secrets)
   - npm audit

5. **E2E Tests** (~10min, opcional)
   - Playwright
   - Apenas em PR para master

#### 2. `.github/workflows/deploy-production.yml`
**Trigger:** Push em master/main ou manual
**Jobs:**
1. **Deploy Frontend**
   - Opções: Vercel | Netlify | SFTP

2. **Deploy Edge Functions**
   - Supabase CLI
   - Auto-deploy todas funções

3. **Run Migrations**
   - Supabase DB migrations

4. **Smoke Tests**
   - Health checks
   - Basic functionality

#### 3. `.github/workflows/pre-commit-check.yml`
**Trigger:** Pull Request
**Jobs:**
- Scan for secrets (TruffleHog)
- Check hardcoded credentials
- Verify .env.example exists

### Secrets Necessários no GitHub

```bash
# Supabase
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN

# OpenAI (para edge functions)
OPENAI_API_KEY

# Sentry
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN

# Deploy (escolher um)
VERCEL_TOKEN / NETLIFY_AUTH_TOKEN / SFTP_*
```

### Configurar Secrets no GitHub

```bash
# Via CLI
gh secret set VITE_SUPABASE_URL --body "https://xxx.supabase.co"

# Via UI
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
```

---

## 📊 Monitoring & Observability

### Sentry Integration

#### Configuração

1. **Criar projeto no Sentry**
   ```bash
   # Ir em sentry.io
   # Criar novo projeto: React
   # Copiar DSN
   ```

2. **Configurar .env**
   ```bash
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   VITE_APP_VERSION=1.0.0
   ```

3. **Features habilitadas**
   - ✅ Error tracking
   - ✅ Performance monitoring
   - ✅ Session replay
   - ✅ User feedback widget
   - ✅ Release tracking
   - ✅ Source maps upload

#### Como usar no código

```typescript
import { useSentry } from '@/lib/sentry';

function MyComponent() {
  const { captureError, addBreadcrumb } = useSentry();

  const handleAction = () => {
    addBreadcrumb('User clicked button');

    try {
      // ... código
    } catch (error) {
      captureError(error, { context: 'button_action' });
    }
  };
}
```

#### Dashboards Recomendados

1. **Error Rate** - Taxa de erros por hora
2. **Performance** - Latência P50/P95/P99
3. **User Impact** - Quantos usuários afetados
4. **Release Health** - Crash rate por versão

---

## 🧪 Load Testing

### Setup

```bash
# Instalar k6
brew install k6  # Mac
choco install k6 # Windows

# Ir para pasta de testes
cd "advo-ai-hub-main (1)/advo-ai-hub-main/tests/load"

# Rodar teste específico
k6 run 01-health-check.js

# Ou todos
chmod +x run-all-tests.sh
./run-all-tests.sh
```

### Testes Disponíveis

| Teste | Carga | Duração | Custo | Quando Rodar |
|-------|-------|---------|-------|--------------|
| **Health Check** | 100 VUs | 50s | Grátis | Sempre |
| **Auth Stress** | 50 VUs | 2min | Grátis | Antes de releases |
| **AI Agents** | 20 VUs | 3min | $0.50-2.00 | Mudanças em agentes IA |

### Thresholds de Sucesso

```javascript
✅ P95 latency < 500ms     (frontend)
✅ P95 latency < 2s        (auth)
✅ P90 latency < 10s       (AI agents)
✅ Error rate < 1%         (geral)
✅ Error rate < 5%         (auth/AI)
```

### Quando Rodar Load Tests

1. **Antes de deploy major** - Validar que nada quebrou
2. **Após mudanças em infra** - Database, caching, etc.
3. **Periodicamente** - 1x por mês para baseline
4. **Antes de marketing campaigns** - Garantir que aguentará tráfego

---

## 🔒 Security

### Checklist de Segurança

#### ✅ Implementado

- [x] RLS (Row Level Security) em todas tabelas
- [x] RBAC (Role-Based Access Control)
- [x] JWT authentication via Supabase
- [x] Auto-logout após 30min inatividade
- [x] Audit logging de ações sensíveis
- [x] Input validation (Zod schemas)
- [x] DOMPurify para XSS prevention
- [x] HTTPS obrigatório em produção
- [x] CSP headers configurados
- [x] Secret detection (TruffleHog no CI)
- [x] OpenAI keys no servidor (Edge Functions)
- [x] Rate limiting nas Edge Functions (100 req/min)

#### ⚠️ Pendente

- [ ] 2FA para admins
- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection (Cloudflare)
- [ ] Backup automático diário

### Pre-commit Hooks

Instalados automaticamente:

```bash
cd "advo-ai-hub-main (1)/advo-ai-hub-main"
npm run setup-hooks  # Ou: bash scripts/setup-git-hooks.sh
```

**O que fazem:**
1. Detectam .env files sendo commitados
2. Detectam API keys no código
3. Rodam TypeScript check
4. Validam mensagens de commit

**Bypass (emergências apenas):**
```bash
git commit --no-verify -m "emergency fix"
```

---

## 🚀 Deployment

### Deploy Manual

#### Frontend

```bash
# Build
cd "advo-ai-hub-main (1)/advo-ai-hub-main"
npm run build

# Deploy para Vercel
vercel --prod

# Ou Netlify
netlify deploy --prod --dir=dist
```

#### Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy todas functions
supabase functions deploy

# Ou function específica
supabase functions deploy agentes-ia-api
```

#### Migrations

```bash
# Rodar migrations pendentes
supabase db push
```

### Deploy Automático (Recomendado)

Apenas fazer push para `master`:

```bash
git push origin master
```

GitHub Actions fará automaticamente:
1. CI completo
2. Deploy frontend
3. Deploy edge functions
4. Rodar migrations
5. Smoke tests

---

## 📖 Operations Runbook

### Cenários Comuns

#### 1. Sistema Lento

**Sintomas:** Latência alta, timeouts
**Debug:**
```bash
# 1. Verificar Sentry
→ Ir em Sentry → Performance
→ Identificar endpoint lento

# 2. Verificar Supabase
→ Dashboard → Database → Query Performance
→ Identificar queries lentas

# 3. Verificar logs
→ Supabase → Edge Functions → Logs
→ Procurar erros/timeouts
```

**Soluções:**
- Adicionar index no database
- Implementar caching (Redis)
- Otimizar queries (usar `.select('id,name')` ao invés de `*`)

---

#### 2. Edge Function Falhando

**Sintomas:** 500 errors, execuções travadas
**Debug:**
```bash
# Ver logs em tempo real
supabase functions logs agentes-ia-api --tail

# Ver erros específicos
supabase functions logs agentes-ia-api --level error
```

**Soluções comuns:**
- Verificar OpenAI API key configurada
- Verificar rate limiting (100 req/min)
- Verificar timeout (30s default)

---

#### 3. Erros de Autenticação

**Sintomas:** Usuários não conseguem logar
**Debug:**
```bash
# 1. Verificar Supabase Auth dashboard
→ Supabase → Authentication → Users
→ Ver se usuário existe

# 2. Verificar RLS policies
→ Supabase → Database → Policies
→ Ver se policies estão habilitadas

# 3. Verificar JWT
→ Chrome DevTools → Application → Local Storage
→ Ver se token existe
```

**Soluções:**
- Verificar email confirmado
- Verificar RLS policy para `profiles`
- Limpar cache/cookies

---

#### 4. Custos OpenAI Altos

**Sintomas:** Conta OpenAI > $100/mês
**Debug:**
```bash
# Ver quantos tokens sendo usados
SELECT
  COUNT(*) as total_executions,
  AVG(tokens_used) as avg_tokens,
  SUM(tokens_used) as total_tokens
FROM agent_ai_logs
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Soluções:**
- Reduzir `max_tokens` de 4000 para 1500
- Implementar caching de respostas
- Usar GPT-3.5-turbo ao invés de GPT-4
- Implementar rate limiting por usuário

---

### Comandos Úteis

```bash
# Ver status do sistema
supabase status

# Ver logs em tempo real
supabase functions logs --tail

# Rodar migrations
supabase db push

# Reset database (DEV ONLY!)
supabase db reset

# Backup manual
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Ver usage de AI
psql $DATABASE_URL -c "SELECT COUNT(*), SUM(tokens_used) FROM agent_ai_logs WHERE created_at > NOW() - INTERVAL '1 day';"
```

---

## 📞 Contatos & Escalação

### Níveis de Severidade

| Sev | Descrição | Response Time | Exemplos |
|-----|-----------|---------------|----------|
| **P0** | Sistema down | < 15min | Database down, app não carrega |
| **P1** | Feature crítica down | < 1h | Auth quebrado, AI agents não funcionam |
| **P2** | Feature não-crítica down | < 4h | Relatórios quebrados, bug visual |
| **P3** | Melhorias | Best effort | Performance lenta, UX não ideal |

### Escalação

1. **P0/P1:** Pingar no Slack #incidents
2. **P2:** Criar ticket no GitHub Issues
3. **P3:** Adicionar ao backlog

---

## 📚 Recursos Adicionais

- [Supabase Docs](https://supabase.com/docs)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Sentry Docs](https://docs.sentry.io/)
- [k6 Docs](https://k6.io/docs/)
- [Vite Docs](https://vitejs.dev/)

---

**Última atualização:** 18/12/2025
**Mantido por:** Time Jurify
**Feedback:** [GitHub Issues](https://github.com/Alefvieira233/jurify2025v01/issues)

