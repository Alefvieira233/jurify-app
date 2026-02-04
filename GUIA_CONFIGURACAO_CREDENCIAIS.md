# 🔐 GUIA DE CONFIGURAÇÃO DE CREDENCIAIS - JURIFY

Este guia detalha como obter e configurar todas as credenciais necessárias para o funcionamento completo do Jurify.

---

## 📋 ÍNDICE

1. [OpenAI (IA dos Agentes)](#1-openai-ia-dos-agentes)
2. [Z-API (WhatsApp)](#2-z-api-whatsapp)
3. [ZapSign (Assinaturas Digitais)](#3-zapsign-assinaturas-digitais)
4. [N8N (Automações)](#4-n8n-automações)
5. [Google Calendar (Agendamentos)](#5-google-calendar-agendamentos)
6. [Supabase (Banco de Dados)](#6-supabase-banco-de-dados)
7. [Configuração Final](#7-configuração-final)

---

## 1. OpenAI (IA dos Agentes)

### 🎯 Propósito
Fornece inteligência artificial para os 7 agentes especializados (Coordenador, Qualificador, Jurídico, Comercial, Analista, Comunicador, Customer Success).

### 📝 Como Obter

1. **Acesse**: https://platform.openai.com
2. **Crie uma conta** ou faça login
3. **Navegue para**: Account → API Keys
4. **Clique em**: "Create new secret key"
5. **Nomeie a chave**: "Jurify Production"
6. **Copie a chave** (começa com `sk-...`)
   - ⚠️ **IMPORTANTE**: Guarde em local seguro, só aparece uma vez!

### ⚙️ Configuração

**NÃO coloque no `.env` do frontend!** A API key deve ficar no servidor (Edge Function):

```bash
# Via Supabase CLI:
supabase secrets set OPENAI_API_KEY=sk-proj-...

# OU via Dashboard Supabase:
# 1. Acesse: https://supabase.com/dashboard
# 2. Selecione seu projeto Jurify
# 3. Vá em: Edge Functions → Settings → Secrets
# 4. Adicione: OPENAI_API_KEY = sk-proj-...
```

### 💰 Custos Estimados
- **Modelo**: GPT-4 Turbo
- **Custo por execução**: ~$0.01 - $0.05
- **100 leads/mês**: ~$1 - $5/mês
- **1000 leads/mês**: ~$10 - $50/mês

### ✅ Validação
```typescript
// Teste no console do navegador após configurar:
const { data, error } = await supabase.functions.invoke('ai-agent-processor', {
  body: {
    agentName: 'Coordenador',
    agentSpecialization: 'Coordenador',
    systemPrompt: 'Você é um assistente útil.',
    userPrompt: 'Diga olá!',
    context: {},
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 100
  }
});
console.log(data);
```

---

## 2. Z-API (WhatsApp)

### 🎯 Propósito
Integração com WhatsApp para receber e enviar mensagens automaticamente.

### 📝 Como Obter

1. **Acesse**: https://z-api.io
2. **Crie uma conta** (tem plano gratuito)
3. **Crie uma instância**:
   - Dashboard → "Criar Instância"
   - Escolha um nome (ex: "Jurify Produção")
   - Escaneie o QR Code com WhatsApp
4. **Obtenha as credenciais**:
   - **Instance ID**: Aparece no dashboard (ex: `3D5F9B...`)
   - **Token**: Configurações → API Token

### ⚙️ Configuração

Adicione ao arquivo `.env` na raiz do projeto:

```env
# Z-API (WhatsApp)
VITE_ZAPI_INSTANCE_ID=sua-instancia-id-aqui
VITE_ZAPI_TOKEN=seu-token-aqui
VITE_ZAPI_BASE_URL=https://api.z-api.io/instances
```

### 💰 Custos
- **Plano Gratuito**: 500 mensagens/mês
- **Plano Start**: R$ 49/mês - 5.000 mensagens
- **Plano Pro**: R$ 99/mês - 15.000 mensagens

### ✅ Validação
```bash
# Teste via curl (substitua INSTANCE_ID e TOKEN):
curl -X POST https://api.z-api.io/instances/INSTANCE_ID/token/TOKEN/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Teste Jurify"
  }'
```

### 📌 Notas Importantes
- ⚠️ **Não use WhatsApp Business API oficial** (muito caro para começar)
- ✅ **Z-API permite WhatsApp pessoal** (mais acessível)
- 🔄 **Webhook**: Configure webhook no Z-API para receber mensagens
  - URL: `https://[seu-projeto].supabase.co/functions/v1/whatsapp-webhook`

---

## 3. ZapSign (Assinaturas Digitais)

### 🎯 Propósito
Envio e gestão de contratos para assinatura digital com validade jurídica.

### 📝 Como Obter

1. **Acesse**: https://zapsign.com.br
2. **Crie uma conta**
3. **Navegue para**: Configurações → Integrações → API
4. **Clique em**: "Gerar Token de API"
5. **Copie o token**

### ⚙️ Configuração

Adicione ao arquivo `.env`:

```env
# ZapSign (Assinaturas)
VITE_ZAPSIGN_API_TOKEN=seu-token-zapsign-aqui
VITE_ZAPSIGN_BASE_URL=https://api.zapsign.com.br/api/v1
```

### 💰 Custos
- **Plano Starter**: R$ 99/mês - 20 documentos
- **Plano Growth**: R$ 299/mês - 100 documentos
- **Plano Pro**: R$ 699/mês - 500 documentos

### ✅ Validação
```typescript
// Teste criar documento:
const response = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${VITE_ZAPSIGN_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Contrato Teste Jurify',
    signers: [{
      name: 'João Silva',
      email: 'joao@exemplo.com'
    }]
  })
});
```

---

## 4. N8N (Automações)

### 🎯 Propósito
Workflows de automação (exemplo: lead novo → criar pasta no Google Drive → notificar Slack).

### 📝 Como Obter

#### Opção A: N8N Cloud (Recomendado)
1. **Acesse**: https://n8n.io
2. **Crie uma conta** no N8N Cloud
3. **Obtenha a API Key**:
   - Settings → API Keys → Generate
4. **URL da API**: Aparece no dashboard (ex: `https://sua-instancia.app.n8n.cloud`)

#### Opção B: Self-Hosted (Grátis)
```bash
# Docker:
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Acesse: http://localhost:5678
```

### ⚙️ Configuração

```env
# N8N (Workflows)
VITE_N8N_API_KEY=sua-api-key-n8n
VITE_N8N_BASE_URL=https://sua-instancia.app.n8n.cloud/api/v1
```

### 💰 Custos
- **Self-Hosted**: Grátis (use seu próprio servidor)
- **N8N Cloud Starter**: $20/mês
- **N8N Cloud Pro**: $50/mês

### ✅ Validação
```bash
# Listar workflows:
curl https://sua-instancia.app.n8n.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: sua-api-key"
```

---

## 5. Google Calendar (Agendamentos)

### 🎯 Propósito
Criar agendamentos automáticos de reuniões com clientes.

### 📝 Como Obter

1. **Acesse**: https://console.cloud.google.com
2. **Crie um projeto**: "Jurify Production"
3. **Ative a API**:
   - APIs & Services → Library
   - Busque "Google Calendar API"
   - Clique "Enable"
4. **Crie credenciais OAuth 2.0**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5173/auth/callback` (dev) e `https://seu-dominio.com/auth/callback` (prod)
5. **Copie**:
   - Client ID
   - Client Secret

### ⚙️ Configuração

```env
# Google Calendar
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=seu-client-secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 💰 Custos
- **Grátis**: Até 1 bilhão de requisições/dia

### ✅ Validação
- Será testado quando implementarmos o OAuth (próximo passo)

---

## 6. Supabase (Banco de Dados)

### 🎯 Propósito
Backend completo: banco PostgreSQL, autenticação, storage, edge functions.

### 📝 Como Obter

Se ainda não tem projeto Supabase:

1. **Acesse**: https://supabase.com
2. **Crie uma conta**
3. **Crie um projeto**: "Jurify"
4. **Obtenha as credenciais**:
   - Settings → API
   - **URL**: Project URL (ex: `https://abc123.supabase.co`)
   - **anon key**: Chave pública
   - **service_role key**: Chave privada (só servidor!)

### ⚙️ Configuração

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

**NÃO coloque service_role no .env do frontend!**

### 💰 Custos
- **Free Tier**: 500MB database, 1GB storage, 2GB bandwidth
- **Pro**: $25/mês - 8GB database, 100GB storage
- **Ideal para começar**: Free Tier (depois upgrade)

---

## 7. Configuração Final

### 📄 Arquivo `.env` Completo

Crie/edite o arquivo `.env` na raiz do projeto:

```env
# =================================
# JURIFY - CONFIGURAÇÃO DE PRODUÇÃO
# =================================

# --- SUPABASE (OBRIGATÓRIO) ---
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# --- Z-API / WHATSAPP (OPCIONAL) ---
VITE_ZAPI_INSTANCE_ID=sua-instancia-id
VITE_ZAPI_TOKEN=seu-token-zapi
VITE_ZAPI_BASE_URL=https://api.z-api.io/instances

# --- ZAPSIGN / ASSINATURAS (OPCIONAL) ---
VITE_ZAPSIGN_API_TOKEN=seu-token-zapsign
VITE_ZAPSIGN_BASE_URL=https://api.zapsign.com.br/api/v1

# --- N8N / AUTOMAÇÕES (OPCIONAL) ---
VITE_N8N_API_KEY=sua-api-key-n8n
VITE_N8N_BASE_URL=https://sua-instancia.app.n8n.cloud/api/v1

# --- GOOGLE CALENDAR (OPCIONAL) ---
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=seu-client-secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

# --- OPENAI (CONFIGURAR NO SUPABASE EDGE FUNCTIONS) ---
# NÃO coloque aqui! Use: supabase secrets set OPENAI_API_KEY=sk-...
```

### 🔒 Segurança

**NUNCA comite o `.env` no Git!**

Verifique se `.gitignore` contém:
```
.env
.env.local
.env.production
```

### ✅ Checklist de Configuração

- [ ] Supabase configurado (URL + anon key)
- [ ] OpenAI configurada no Supabase Edge Functions
- [ ] Migrations aplicadas no Supabase
- [ ] Z-API configurada (se quiser WhatsApp)
- [ ] ZapSign configurada (se quiser assinaturas)
- [ ] N8N configurada (se quiser automações)
- [ ] Google Calendar configurado (se quiser agendamentos)
- [ ] `.env` criado e preenchido
- [ ] `.env` NÃO commitado no Git

### 🚀 Próximos Passos

Após configurar as credenciais:

```bash
# 1. Reinicie o servidor de desenvolvimento:
npm run dev

# 2. Teste cada integração individualmente

# 3. Execute os testes end-to-end (próxima fase)
```

---

## 📞 Suporte

Se tiver dúvidas sobre alguma integração:

- **OpenAI**: https://help.openai.com
- **Z-API**: https://developer.z-api.io
- **ZapSign**: suporte@zapsign.com.br
- **N8N**: https://community.n8n.io
- **Supabase**: https://supabase.com/docs
- **Google Cloud**: https://cloud.google.com/support

---

## 📊 Tabela de Prioridades

| Integração | Prioridade | Custo/mês | Funcionalidade |
|------------|------------|-----------|----------------|
| **Supabase** | 🔴 CRÍTICA | Grátis | Banco de dados, auth, storage |
| **OpenAI** | 🔴 CRÍTICA | ~$10-50 | IA dos agentes |
| **Z-API** | 🟡 MÉDIA | R$ 49-99 | WhatsApp automático |
| **ZapSign** | 🟡 MÉDIA | R$ 99-299 | Assinaturas digitais |
| **Google Calendar** | 🟢 BAIXA | Grátis | Agendamentos |
| **N8N** | 🟢 BAIXA | Grátis* | Automações avançadas |

*Self-hosted é grátis

---

**Última atualização**: 2025-12-11

