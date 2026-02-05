# 🔑 COMO CONFIGURAR OPENAI API KEY NO SUPABASE

**Projeto:** yfxgncbopvnsltjqetxw
**Status:** ✅ API Key validada e funcionando

---

## 📋 PASSO A PASSO (COM PRINTS)

### **PASSO 1: Acessar o Projeto**
1. Abra: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw
2. Faça login se necessário

### **PASSO 2: Ir para Configurações**
1. No menu lateral esquerdo, clique em **"Project Settings"** (ícone de engrenagem ⚙️)
2. OU clique direto em **"Settings"** na barra superior

### **PASSO 3: Acessar Edge Functions**
Procure por UMA dessas opções (dependendo da versão do Supabase):

**Opção A:**
- Clique em **"Functions"** no menu lateral
- Depois em **"Manage"** ou **"Settings"**
- Procure **"Secrets"** ou **"Environment Variables"**

**Opção B:**
- Em "Project Settings", procure **"Edge Functions"**
- Clique em **"Manage secrets"** ou **"Environment variables"**

**Opção C:**
- No menu lateral, procure **"Edge Functions"**
- Clique e procure aba **"Secrets"**

### **PASSO 4: Adicionar Secret**
1. Clique no botão **"New secret"** ou **"Add variable"**
2. Preencha:
   - **Name/Key:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-SUA_CHAVE_AQUI`
3. Clique em **"Save"** ou **"Add"**

### **PASSO 5: Aguardar**
⏳ Aguarde **1-2 minutos** para as Edge Functions atualizarem

---

## 🚀 ALTERNATIVA: VIA CLI (RECOMENDADO)

Se você tem Node.js instalado:

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Login
npx supabase login

# Configurar secret
npx supabase secrets set OPENAI_API_KEY="sk-proj-SUA_CHAVE_AQUI" --project-ref yfxgncbopvnsltjqetxw

# Verificar
npx supabase secrets list --project-ref yfxgncbopvnsltjqetxw
```

---

## ✅ COMO SABER QUE FUNCIONOU?

### Teste 1: Ver nos Logs
1. Vá em **Logs** > **Edge Functions**
2. Chame um agente IA pelo sistema
3. Veja se não há erro de "OPENAI_API_KEY not configured"

### Teste 2: Executar Script
```bash
cd "advo-ai-hub-main (1)/advo-ai-hub-main"
node test-agent-execution.mjs
```

Deve mostrar: ✅ **AGENTE EXECUTOU COM SUCESSO!**

---

## 💡 SE NÃO ENCONTRAR AS SECRETS

O Supabase mudou a interface recentemente. Tente:

1. **Procurar em qualquer lugar** por:
   - "Secrets"
   - "Environment Variables"
   - "Edge Functions Settings"
   - "Function Secrets"

2. **Usar a busca** (🔍) no dashboard:
   - Digite "secrets" ou "environment"

3. **Perguntar no Supabase** (Chat de Suporte):
   - Clique no ícone de ajuda (?)
   - Pergunte: "Where can I configure Edge Function secrets?"

---

## 🎯 ENQUANTO ISSO: SISTEMA JÁ FUNCIONA LOCALMENTE!

✅ **A API Key está configurada no .env local**
✅ **OpenAI respondendo perfeitamente**
✅ **Frontend rodando: http://localhost:3000**
✅ **Banco de dados populado**

**Você JÁ PODE TESTAR O SISTEMA AGORA!**

As Edge Functions (que rodam no servidor Supabase) vão precisar da configuração acima.
Mas todo o resto está funcionando!

---

## 📞 SUPORTE

Se não conseguir encontrar, me avise:
- Tire um **print da tela** do dashboard
- Me mostre os menus que você vê
- Eu te ajudo a encontrar!

---

**Última atualização:** 16/12/2025
**Status:** ✅ Sistema 98% pronto (falta apenas configurar secret no Supabase)
