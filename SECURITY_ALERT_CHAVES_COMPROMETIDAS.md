# 🚨 ALERTA DE SEGURANÇA - CHAVES COMPROMETIDAS

**Data**: 2025-12-17
**Severidade**: 🔴 CRÍTICA
**Status**: AÇÃO IMEDIATA NECESSÁRIA

---

## ⚠️ PROBLEMA IDENTIFICADO

As seguintes chaves de API foram **expostas publicamente no Git** e estão **COMPROMETIDAS**:

### 1. OpenAI API Key
```
❌ COMPROMETIDA: sk-proj-SUA_CHAVE_AQUI
```

**Risco**: Qualquer pessoa com acesso ao repositório pode:
- Usar sua cota da OpenAI
- Gerar custos não autorizados (potencialmente milhares de dólares)
- Acessar histórico de conversas

### 2. Supabase Keys
```
❌ EXPOSTA: VITE_SUPABASE_URL=https://yfxgncbopvnsltjqetxw.supabase.co
❌ EXPOSTA: VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
❌ EXPOSTA: SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

**Risco**:
- Anon Key: Acesso limitado mas ainda preocupante
- Service Role Key: **ACESSO TOTAL AO BANCO** (bypass RLS)

---

## ✅ AÇÕES JÁ TOMADAS

1. ✅ `.env` adicionado ao `.gitignore`
2. ✅ Commit de segurança criado
3. ✅ `.env.example` criado com placeholders seguros

---

## 🔥 AÇÕES IMEDIATAS NECESSÁRIAS

### 1. Revogar e Gerar Nova OpenAI API Key (URGENTE)

**Passos**:
1. Acesse: https://platform.openai.com/api-keys
2. **Revogue** a chave antiga: `sk-proj-SUA_CHAVE_AQUI`
3. Crie uma nova API Key
4. Configure no Supabase Dashboard como SECRET:
   - Vá em: **Settings > Edge Functions > Secrets**
   - Nome: `OPENAI_API_KEY`
   - Valor: `sua-nova-chave`

**⚠️ NÃO coloque a nova chave no .env com prefixo VITE_!**

### 2. Verificar Uso da OpenAI (URGENTE)

**Passos**:
1. Acesse: https://platform.openai.com/usage
2. Verifique se há **uso não autorizado** nos últimos dias
3. Se houver gastos suspeitos:
   - Entre em contato com OpenAI support
   - Explique que a chave foi comprometida
   - Solicite reembolso se possível

### 3. Considerar Rotacionar Supabase Keys (RECOMENDADO)

**Anon Key** (Exposição de baixo risco):
- Se o RLS está bem configurado, risco é mínimo
- Rotação não é urgente mas é boa prática

**Service Role Key** (Exposição de ALTO risco):
- **URGENTE se foi commitada no git**
- Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api
- Gere nova Service Role Key
- Atualize no `.env` local (SEM prefixo VITE_)

### 4. Atualizar .env Local

Copie `.env.example` para `.env` e preencha com as **novas** credenciais:

```bash
cp .env.example .env
# Edite .env com suas NOVAS chaves
```

### 5. Configurar OpenAI no Supabase (CRÍTICO)

A chave OpenAI deve estar no Supabase Vault, não no .env:

```bash
# Via CLI (se tiver instalado)
supabase secrets set OPENAI_API_KEY=sk-proj-sua-nova-chave

# Ou via Dashboard
# Settings > Edge Functions > Secrets
```

### 6. Limpar Histórico do Git (OPCIONAL mas RECOMENDADO)

**Atenção**: Isso reescreve o histórico do git!

```bash
# Instalar BFG Repo-Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Remover .env de todo histórico
bfg --delete-files .env

# Ou usar git-filter-repo
git filter-repo --path .env --invert-paths
```

**Alternativa** (se for repositório pessoal):
```bash
# Crie um novo repositório limpo
git checkout --orphan new-main
git add -A
git commit -m "Initial commit (clean history)"
git branch -D master
git branch -m master
git push -f origin master
```

---

## 📋 CHECKLIST DE SEGURANÇA

- [ ] OpenAI API Key revogada
- [ ] Nova OpenAI API Key gerada
- [ ] Nova chave configurada no Supabase Secrets
- [ ] Verificado uso da OpenAI (sem cobranças suspeitas)
- [ ] Supabase Service Role Key rotacionada (se necessário)
- [ ] .env local atualizado com novas credenciais
- [ ] Sistema testado com novas credenciais
- [ ] Histórico do git limpo (opcional)

---

## 🛡️ PREVENÇÃO FUTURA

### 1. Usar Git Hooks

Instale `pre-commit` hook para evitar commit de secrets:

```bash
# Instalar
npm install --save-dev @commitlint/cli husky

# Criar hook
echo '#!/bin/sh
if git diff --cached --name-only | grep -E "\.env$"; then
  echo "❌ Tentativa de commit do .env bloqueada!"
  exit 1
fi' > .git/hooks/pre-commit

chmod +x .git/hooks/pre-commit
```

### 2. Usar Ferramentas de Detecção

- **git-secrets**: https://github.com/awslabs/git-secrets
- **gitleaks**: https://github.com/gitleaks/gitleaks
- **truffleHog**: https://github.com/trufflesecurity/trufflehog

### 3. Princípios de Segurança

✅ **NUNCA** use prefixo `VITE_` para secrets
✅ **SEMPRE** use Supabase Vault para API keys
✅ **SEMPRE** revise arquivos antes de commit
✅ **CONFIGURE** pre-commit hooks
✅ **ROTACIONE** chaves periodicamente (a cada 90 dias)

---

## 💰 CUSTO POTENCIAL

Se as chaves foram exploradas:

| Serviço | Custo Potencial | Probabilidade |
|---------|-----------------|---------------|
| OpenAI | $500 - $5,000/mês | Alta |
| Supabase | Grátis (tier free) | Baixa |
| **Total** | **$500 - $5,000** | **Médio-Alto** |

---

## 📞 CONTATOS DE EMERGÊNCIA

- **OpenAI Support**: https://help.openai.com/
- **Supabase Support**: https://supabase.com/dashboard/support

---

## ✅ CONCLUSÃO

**O problema foi identificado e mitigado**.

**Próximos passos OBRIGATÓRIOS**:
1. Revogar OpenAI API Key antiga (5 minutos)
2. Gerar e configurar nova chave (10 minutos)
3. Verificar uso não autorizado (5 minutos)
4. Testar sistema com novas credenciais (10 minutos)

**Tempo total**: ~30 minutos

**Não fazer nada**: Risco de **milhares de dólares** em custos não autorizados.

---

**Criado por**: Claude Code (Security Audit - Sprint 1)
**Data**: 2025-12-17
