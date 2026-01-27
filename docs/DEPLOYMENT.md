
# Guia de Deploy - Jurify SaaS

## 🚀 Deploy no Lovable

### 1. Preparação
```bash
# Verificar se todos os arquivos estão commitados
git status
git add .
git commit -m "Preparando para deploy"
```

### 2. Conectar GitHub ao Lovable
1. No Lovable, acesse Project Settings
2. Conecte seu repositório GitHub
3. Configure branch principal (main/master)

### 3. Configurar Environment
No Lovable Dashboard:
- Defina NODE_ENV=production
- Configure custom domain (opcional)
- Ative HTTPS automático

### 4. Deploy Automático
O Lovable fará deploy automático a cada push na branch principal.

## 🔧 Configurações Pós-Deploy

### DNS e Domínio
```
# Exemplo de configuração DNS
CNAME www your-app.lovable.app
A @ IP_DO_LOVABLE
```

### SSL/TLS
- Certificado automático via Let's Encrypt
- Redirecionamento HTTP → HTTPS
- HSTS habilitado

## 📊 Monitoramento

### Métricas Disponíveis
- Uptime
- Response time
- Error rate
- Traffic volume

### Logs
- Application logs
- Access logs  
- Error logs
- Performance metrics

## 🔄 CI/CD Pipeline

### Workflow Automático
1. Push para main
2. Build automático
3. Testes (se configurados)
4. Deploy para produção
5. Health check

### Rollback
Em caso de problemas:
1. Acesse Lovable Dashboard
2. Selecione versão anterior
3. Execute rollback

## 🛡️ Segurança

### Headers de Segurança
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Rate Limiting
- Configurado no Supabase
- 1000 requests/dia por API key
- DDoS protection automático

## 📈 Scaling

### Performance
- CDN automático
- Gzip compression
- Cache headers otimizados

### Database
- Connection pooling
- Read replicas (se necessário)
- Backup automático

## 🚨 Disaster Recovery

### Backup Strategy
1. **Database**: Backup diário automático no Supabase
2. **Código**: Versionado no Git
3. **Configurações**: Exportação via sistema interno

### Recovery Procedures
1. Restaurar database do backup
2. Redeployar código da versão estável
3. Reconfigurar integrações se necessário
