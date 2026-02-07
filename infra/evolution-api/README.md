# Evolution API - Deploy Guide (Jurify WhatsApp)

## Visão Geral

A Evolution API é uma solução self-hosted que permite conectar números de WhatsApp via QR Code, sem custos por mensagem. Esta é a integração recomendada para o MVP do Jurify.

**Custo estimado:** ~R$35-55/mês (apenas VPS)

## Pré-requisitos

- VPS com Ubuntu 22.04+ (mínimo 2 vCPU, 4GB RAM)
  - Recomendado: Hetzner CX21 (~€4.85/mês) ou Contabo VPS S (~R$30/mês)
- Domínio apontando para o IP da VPS (ex: `api-whatsapp.jurify.com.br`)
- Acesso SSH root à VPS

## Deploy Rápido (Automático)

```bash
# 1. Copie o script para a VPS
scp setup-vps.sh root@SEU_IP:/root/

# 2. Conecte via SSH
ssh root@SEU_IP

# 3. Execute o script
chmod +x setup-vps.sh
./setup-vps.sh api-whatsapp.jurify.com.br admin@jurify.com.br

# 4. SALVE a API Key que será exibida no final!
```

## Deploy Manual

### 1. Instalar Docker

```bash
sudo apt update && sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
sudo systemctl enable docker && sudo systemctl start docker
```

### 2. Configurar Nginx + SSL

```bash
# Copie o arquivo nginx/evolution-api.conf para /etc/nginx/sites-available/
sudo cp nginx/evolution-api.conf /etc/nginx/sites-available/evolution-api
sudo ln -sf /etc/nginx/sites-available/evolution-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Obtenha certificado SSL
sudo certbot --nginx -d api-whatsapp.jurify.com.br --agree-tos -m admin@jurify.com.br

sudo nginx -t && sudo systemctl reload nginx
```

### 3. Subir Evolution API

```bash
cd /opt/evolution-api

# Copie e configure o .env
cp .env.example .env
nano .env  # Preencha os valores

# Suba os containers
docker-compose up -d

# Verifique os logs
docker-compose logs -f evolution-api
```

### 4. Testar

```bash
curl -s https://api-whatsapp.jurify.com.br/instance/fetchInstances \
  -H 'apikey: SUA_API_KEY' | jq .
```

## Configurar no Supabase

Após o deploy da VPS, configure os Secrets no Supabase:

```bash
# Via Supabase CLI
supabase secrets set EVOLUTION_API_URL=https://api-whatsapp.jurify.com.br
supabase secrets set EVOLUTION_API_KEY=sua-api-key-gerada

# Faça redeploy das Edge Functions
supabase functions deploy whatsapp-webhook
supabase functions deploy send-whatsapp-message
supabase functions deploy evolution-manager
```

Ou via Dashboard do Supabase:
1. Acesse **Settings > Edge Functions > Secrets**
2. Adicione `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`

## Arquitetura

```
Usuário (WhatsApp) → Evolution API (VPS) → Webhook → Supabase Edge Function
                                                          ↓
                                                    Salva no banco
                                                          ↓
                                                    Invoca IA Agent
                                                          ↓
                                                    Resposta automática
                                                          ↓
                                              Edge Function → Evolution API → WhatsApp
```

## Arquivos Criados/Modificados

### Infraestrutura (VPS)
| Arquivo | Descrição |
|---|---|
| `infra/evolution-api/docker-compose.yml` | Docker Compose com Evolution API + PostgreSQL + Redis |
| `infra/evolution-api/.env.example` | Template de variáveis de ambiente |
| `infra/evolution-api/setup-vps.sh` | Script automatizado de setup da VPS |
| `infra/evolution-api/nginx/evolution-api.conf` | Configuração Nginx com SSL |

### Edge Functions (Supabase)
| Arquivo | Descrição |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Webhook adaptado para Evolution + Meta |
| `supabase/functions/send-whatsapp-message/index.ts` | Envio adaptado para Evolution + Meta |
| `supabase/functions/evolution-manager/index.ts` | **NOVO** - Gerencia instâncias (criar, QR, status, deletar) |

### Frontend
| Arquivo | Descrição |
|---|---|
| `src/features/whatsapp/WhatsAppSetup.tsx` | Página unificada com seleção de provider |
| `src/features/whatsapp/WhatsAppEvolutionSetup.tsx` | **NOVO** - UI de conexão via QR Code |

## Variáveis de Ambiente (Supabase Secrets)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `EVOLUTION_API_URL` | URL da Evolution API (ex: `https://api-whatsapp.jurify.com.br`) | Sim (para Evolution) |
| `EVOLUTION_API_KEY` | API Key da Evolution API | Sim (para Evolution) |
| `WHATSAPP_ACCESS_TOKEN` | Token da Meta Official API | Não (fallback) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID da Meta | Não (fallback) |

## Monitoramento

```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f evolution-api

# Restart se necessário
docker-compose restart evolution-api

# Verificar uso de recursos
docker stats
```

## Backup

```bash
# Backup do PostgreSQL
docker exec evolution-postgres pg_dump -U evolution evolution > backup_$(date +%Y%m%d).sql

# Backup das sessões WhatsApp
docker cp evolution-api:/evolution/instances ./backup_instances_$(date +%Y%m%d)
```

## Troubleshooting

| Problema | Solução |
|---|---|
| QR Code não aparece | Verifique logs: `docker-compose logs evolution-api` |
| Desconecta frequentemente | Verifique RAM/CPU da VPS; aumente se necessário |
| Webhook não chega | Verifique se `SUPABASE_WEBHOOK_URL` está correto no `.env` |
| Mensagens não enviam | Verifique `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` nos Supabase Secrets |
| SSL expirado | `sudo certbot renew` (automático via cron) |
