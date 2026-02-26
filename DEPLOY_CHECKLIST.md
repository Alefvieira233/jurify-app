# 🚀 JURIFY - DEPLOY PRODUCTION CHECKLIST

## 📋 **RESUMO DAS MODIFICAÇÕES RECENTES**

### ✅ **Correções Críticas Aplicadas**
1. **Tenant Isolation em Edge Functions**
   - `whatsapp-webhook`: 3 mutations com `tenant_id` corrigidos
   - `ai-agent-processor`: 2 mutations com `tenant_id` corrigidos  
   - `evolution-manager`: 4 mutations com `tenant_id` corrigidos

2. **Segurança Multi-Tenant**
   - Todas as mutations agora usam `.eq("tenant_id", profile.tenantId)`
   - RLS policies verificadas e funcionando
   - Índices de performance otimizados

3. **Schema Database**
   - 55 migrations aplicadas
   - RLS habilitado em todas as tabelas
   - Índices compostos para performance
   - WhatsApp tables com tenant isolation

---

## 🔐 **SECRETS OBRIGATÓRIOS NO SUPABASE**

### **Core Supabase**
```bash
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **AI & OpenAI**
```bash
OPENAI_API_KEY=sk-your_openai_key
DEFAULT_OPENAI_MODEL=gpt-4o
```

### **WhatsApp Evolution API**
```bash
EVOLUTION_API_URL=http://your-evolution-server:8080
EVOLUTION_API_KEY=your_evolution_api_key
EVOLUTION_WEBHOOK_SECRET=your_webhook_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

### **WhatsApp Meta API (Opcional)**
```bash
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### **Email - Postmark**
```bash
POSTMARK_SERVER_TOKEN=your_postmark_token
POSTMARK_FROM_EMAIL=noreply@jurify.com.br
POSTMARK_FROM_NAME=Jurify
```

### **Pagamentos - Stripe**
```bash
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_PRO=price_your_pro_plan
STRIPE_PRICE_ENTERPRISE=price_your_enterprise_plan
```

### **Assinatura Digital - ZapSign**
```bash
ZAPSIGN_API_KEY=your_zapsign_key
ZAPSIGN_API_URL=https://api.zapsign.com.br
```

### **Google Calendar**
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### **Segurança & Monitoring**
```bash
ENCRYPTION_KEY=your_32_char_encryption_key
HEALTH_CHECK_TOKEN=your_health_token
ALLOWED_ORIGINS=https://jurify.com.br,https://app.jurify.com.br
FRONTEND_URL=https://jurify.com.br
```

---

## 🧪 **TESTES ANTES DO DEPLOY**

### **1. Build & Type Check**
```bash
npm run pre-deploy
```

### **2. Testes Unitários**
```bash
npm run test
npm run test:coverage
```

### **3. Testes E2E**
```bash
npm run test:e2e
```

### **4. Security Audit**
```bash
npm run test:security
```

### **5. Health Check das Edge Functions**
```bash
curl https://your-project.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_HEALTH_TOKEN"
```

---

## 🚀 **COMANDOS DE DEPLOY**

### **1. Deploy Frontend (Vercel/Netlify)**
```bash
npm run build:production
# Deploy dist/ folder para sua plataforma
```

### **2. Deploy Edge Functions (Supabase)**
```bash
# Deploy todas as functions
supabase functions deploy --no-verify-jwt

# Deploy específicas críticas
supabase functions deploy whatsapp-webhook
supabase functions deploy ai-agent-processor
supabase functions deploy evolution-manager
supabase functions deploy health-check
```

### **3. Database Migrations**
```bash
# Verificar migrations pendentes
supabase db diff --schema public

# Aplicar migrations
supabase db push
```

---

## 🔍 **PÓS-DEPLOY VALIDATION**

### **1. Verificar Edge Functions**
```bash
# Health Check
curl -X POST https://your-project.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_HEALTH_TOKEN" \
  -H "Content-Type: application/json"

# Testar WhatsApp Webhook
curl -X POST https://your-project.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### **2. Verificar Frontend**
- Acessar https://jurify.com.br
- Login com admin@jurify.com
- Verificar Dashboard carrega
- Testar criação de Lead
- Testar WhatsApp (se configurado)

### **3. Verificar Multi-Tenant**
- Criar usuário de teste
- Verificar isolation de dados
- Testar RLS policies

---

## 🚨 **ROLLBACK PLAN**

### **Se algo der errado:**
1. **Frontend**: Reverter deploy anterior
2. **Edge Functions**: 
   ```bash
   supabase functions deploy --version=previous
   ```
3. **Database**: 
   ```bash
   supabase db reset --version=previous
   ```

---

## 📊 **MONITORING**

### **Logs em Produção**
```bash
# Verificar logs das Edge Functions
supabase functions logs whatsapp-webhook
supabase functions logs ai-agent-processor
supabase functions logs evolution-manager
```

### **Métricas Críticas**
- Response time < 2s
- Error rate < 1%
- WhatsApp delivery rate > 95%
- AI response time < 5s

---

## ✅ **CHECKLIST FINAL**

- [ ] Todos os secrets configurados no Supabase
- [ ] Build passa sem erros
- [ ] Testes unitários passando
- [ ] Testes e2e passando
- [ ] Security audit aprovado
- [ ] Edge functions deployadas
- [ ] Database migrations aplicadas
- [ ] Health check respondendo
- [ ] Frontend acessível
- [ ] Multi-tenant isolation testado
- [ ] WhatsApp funcionando (se aplicável)
- [ ] Monitoring configurado

---

## 🆘 **EMERGENCY CONTACTS**

- **Database Issues**: Supabase Dashboard
- **Edge Functions**: Supabase Functions Logs
- **Frontend**: Vercel/Netlify Analytics
- **WhatsApp**: Evolution API Logs
- **AI**: OpenAI Usage Dashboard

---

**Status**: ✅ **PRONTO PARA DEPLOY PRODUCTION**
