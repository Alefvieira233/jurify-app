
# Guia de Setup - Jurify SaaS

## 🚀 Setup Local

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Conta no Lovable (para deploy)

### 1. Configuração do Supabase

#### Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote as credenciais do projeto

#### Executar Migrações
1. No Supabase Dashboard, acesse "SQL Editor"
2. Execute todas as migrações da pasta `supabase/migrations/`
3. Verifique se todas as tabelas foram criadas

#### Configurar Secrets
No Dashboard do Supabase, acesse Settings > Edge Functions:
```
OPENAI_API_KEY=sk-xxx...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
ZAPSIGN_TOKEN=xxx
WHATSAPP_TOKEN=xxx
```

### 2. Configuração Local

#### Clone e Instalação
```bash
git clone [url-do-repositorio]
cd jurify-saas
npm install
```

#### Configurar Variáveis
Atualize `src/integrations/supabase/client.ts` com suas credenciais:
```typescript
const SUPABASE_URL = "sua-url-supabase";
const SUPABASE_PUBLISHABLE_KEY = "sua-anon-key";
```

#### Executar Aplicação
```bash
npm run dev
```

### 3. Configuração Inicial

#### Primeiro Usuário Admin
1. Acesse a aplicação
2. Registre-se com email/senha
3. No Supabase Dashboard, acesse "Authentication > Users"
4. Promova o usuário para admin via SQL:

```sql
-- Encontre o ID do usuário na tabela auth.users
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid-aqui', 'administrador');
```

#### Configurações Básicas
1. Acesse "Configurações Gerais"
2. Configure as integrações necessárias
3. Crie as primeiras API keys
4. Configure templates de notificação

## 🌐 Deploy no Lovable

### 1. Conectar Repositório
1. No Lovable, conecte seu repositório GitHub
2. Configure as variáveis de ambiente
3. Execute o primeiro deploy

### 2. Configurações Pós-Deploy
1. Configure domínio personalizado (se necessário)
2. Ative HTTPS
3. Configure monitoramento

### 3. Testes de Produção
- [ ] Login/logout funcionando
- [ ] Criação de leads
- [ ] Execução de agentes IA
- [ ] Geração de contratos
- [ ] Sincronização Google Calendar

## 🔧 Configurações Avançadas

### Google Calendar
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie projeto e ative Calendar API
3. Configure OAuth 2.0
4. Adicione redirect URI: `https://seu-dominio.com/auth/google/callback`

### ZapSign
1. Acesse [ZapSign](https://app.zapsign.com.br)
2. Gere token da API
3. Configure webhook (opcional)

### WhatsApp Business
1. Configure WhatsApp Business API
2. Obtenha token de acesso
3. Configure webhook para recebimento

## 🔍 Troubleshooting

### Problemas Comuns

#### Erro de Autenticação
```
Error: Invalid JWT
```
**Solução**: Verifique se as credenciais do Supabase estão corretas

#### RLS Violation
```
new row violates row-level security policy
```
**Solução**: Verifique se o usuário tem as permissões necessárias

#### Edge Function Error
```
Function not found
```
**Solução**: Execute o deploy das Edge Functions

### Logs e Debug
- Supabase Dashboard > Edge Functions > Logs
- Browser DevTools > Console
- Network tab para requisições

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Todas as migrações executadas
- [ ] Secrets configurados
- [ ] Edge Functions funcionando
- [ ] Testes locais passando

### Pós-Deploy  
- [ ] DNS configurado
- [ ] SSL ativo
- [ ] Primeiro admin criado
- [ ] Integrações testadas
- [ ] Backup configurado

## 🆘 Suporte

### Recursos
- Documentação Supabase: [docs.supabase.com](https://supabase.com/docs)
- Documentação Lovable: [docs.lovable.dev](https://docs.lovable.dev)
- Shadcn/UI: [ui.shadcn.com](https://ui.shadcn.com)

### Contato
- Abra uma issue no repositório
- Documentação técnica em `/docs`
