#!/bin/bash
# ============================================
# JURIFY - Setup VPS para Evolution API
# ============================================
# Execute este script em uma VPS Ubuntu 22.04+
# Uso: chmod +x setup-vps.sh && sudo ./setup-vps.sh
# ============================================

set -e

DOMAIN="${1:-api-whatsapp.jurify.com.br}"
EMAIL="${2:-admin@jurify.com.br}"

echo "============================================"
echo "  JURIFY - Evolution API VPS Setup"
echo "  Domínio: $DOMAIN"
echo "  Email: $EMAIL"
echo "============================================"

# 1. Atualizar sistema
echo "[1/7] Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências
echo "[2/7] Instalando Docker e Nginx..."
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx curl ufw

# 3. Configurar firewall
echo "[3/7] Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 4. Habilitar Docker
echo "[4/7] Habilitando Docker..."
systemctl enable docker
systemctl start docker

# 5. Configurar Nginx
echo "[5/7] Configurando Nginx..."
cat > /etc/nginx/sites-available/evolution-api << 'NGINX_CONF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        return 301 https://$server_name$request_uri;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
NGINX_CONF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/evolution-api
ln -sf /etc/nginx/sites-available/evolution-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx

# 6. SSL com Let's Encrypt
echo "[6/7] Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

# Adicionar proxy config ao bloco HTTPS gerado pelo certbot
cat > /etc/nginx/sites-available/evolution-api << NGINX_FULL
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }
}
NGINX_FULL

nginx -t && systemctl reload nginx

# 7. Subir Evolution API
echo "[7/7] Iniciando Evolution API..."
cd /opt
mkdir -p evolution-api
cd evolution-api

# Gerar API Key segura
API_KEY=$(openssl rand -hex 32)
PG_PASS=$(openssl rand -hex 16)

cat > .env << ENV_FILE
EVOLUTION_DOMAIN=$DOMAIN
EVOLUTION_API_KEY=$API_KEY
POSTGRES_PASSWORD=$PG_PASS
SUPABASE_WEBHOOK_URL=https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook
ENV_FILE

cat > docker-compose.yml << 'DOCKER_COMPOSE'
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    env_file: .env
    environment:
      - SERVER_URL=https://${EVOLUTION_DOMAIN}
      - SERVER_PORT=8080
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evolution:${POSTGRES_PASSWORD}@postgres:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/0
      - CACHE_REDIS_PREFIX_KEY=evolution
      - CACHE_REDIS_SAVE_INSTANCES=true
      - CACHE_LOCAL_ENABLED=false
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=${SUPABASE_WEBHOOK_URL}
      - WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_UPDATE=true
      - WEBHOOK_EVENTS_SEND_MESSAGE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      - WEBHOOK_EVENTS_ERRORS=true
      - QRCODE_LIMIT=30
      - DEL_INSTANCE=false
      - DEL_TEMP_INSTANCES=true
      - LOG_LEVEL=WARN
      - LOG_BAILEYS=error
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - evolution-network

  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    restart: always
    environment:
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolution -d evolution"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - evolution-network

  redis:
    image: redis:7-alpine
    container_name: evolution-redis
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - evolution-network

volumes:
  evolution_instances:
  evolution_store:
  postgres_data:
  redis_data:

networks:
  evolution-network:
    driver: bridge
DOCKER_COMPOSE

docker-compose up -d

echo ""
echo "============================================"
echo "  ✅ EVOLUTION API INSTALADA COM SUCESSO!"
echo "============================================"
echo ""
echo "  URL:     https://$DOMAIN"
echo "  API Key: $API_KEY"
echo ""
echo "  ⚠️  SALVE A API KEY ACIMA! Ela não será mostrada novamente."
echo ""
echo "  Próximos passos:"
echo "  1. Configure a API Key no Supabase Secrets:"
echo "     EVOLUTION_API_URL=https://$DOMAIN"
echo "     EVOLUTION_API_KEY=$API_KEY"
echo ""
echo "  2. Teste a API:"
echo "     curl -s https://$DOMAIN/instance/fetchInstances \\"
echo "       -H 'apikey: $API_KEY' | jq ."
echo ""
echo "  3. Crie uma instância pelo painel do Jurify"
echo "============================================"
