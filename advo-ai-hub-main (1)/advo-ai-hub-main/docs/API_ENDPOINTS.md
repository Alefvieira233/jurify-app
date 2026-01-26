
# API Endpoints - Jurify SaaS

## 🔗 Edge Functions

### 1. Agentes IA API
**Base URL**: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/agentes-ia-api`

#### Listar Agentes
```http
GET /agentes/listar
Headers:
  x-api-key: {sua_api_key}
```

**Resposta**:
```json
{
  "agentes": [
    {
      "id": "uuid",
      "nome": "Agente Direito Civil",
      "tipo_agente": "whatsapp",
      "status": "ativo"
    }
  ]
}
```

#### Executar Agente
```http
POST /agentes/executar
Headers:
  x-api-key: {sua_api_key}
Content-Type: application/json

Body:
{
  "agente_id": "uuid",
  "input": "Texto de entrada para o agente"
}
```

**Resposta**:
```json
{
  "resposta": "Resposta gerada pela IA",
  "tempo_execucao": 1250,
  "status": "success"
}
```

### 2. WhatsApp Contract
**Base URL**: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-contract`

```http
POST /
Headers:
  Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "contratoId": "uuid",
  "telefone": "+5511999999999",
  "nomeCliente": "Nome do Cliente",
  "linkAssinatura": "https://app.zapsign.com.br/..."
}
```

### 3. ZapSign Integration
**Base URL**: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/zapsign-integration`

#### Criar Documento
```http
POST /
Headers:
  Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "action": "create_document",
  "contratoId": "uuid",
  "contractData": {
    "nome_cliente": "Nome",
    "texto_contrato": "Conteúdo..."
  }
}
```

#### Verificar Status
```http
POST /
Headers:
  Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "action": "check_status",
  "contratoId": "uuid"
}
```

## 🔐 Autenticação

### API Key
Para endpoints públicos dos agentes IA:
```javascript
const response = await fetch(endpoint, {
  headers: {
    'x-api-key': 'jf_xxxxxxxxxxxxx'
  }
});
```

### JWT Token
Para endpoints protegidos:
```javascript
const response = await supabase.functions.invoke('function-name', {
  body: data
});
```

## ⚠️ Rate Limiting

- **Limite padrão**: 1000 requests/dia por API key
- **Reset**: Diário às 00:00 UTC
- **Header de resposta**: `X-RateLimit-Remaining`

## 🚨 Códigos de Erro

- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (API key inválida)
- `403` - Forbidden (sem permissão)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## 📝 Exemplos de Uso

### JavaScript/TypeScript
```typescript
import { supabase } from '@/integrations/supabase/client';

// Executar agente via API Key
const executarAgente = async (agenteId: string, input: string) => {
  const response = await fetch(
    'https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/agentes-ia-api/agentes/executar',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'sua_api_key'
      },
      body: JSON.stringify({ agente_id: agenteId, input })
    }
  );
  return response.json();
};

// Enviar contrato via WhatsApp
const enviarContrato = async (dados) => {
  const { data, error } = await supabase.functions.invoke('whatsapp-contract', {
    body: dados
  });
  return { data, error };
};
```

### cURL
```bash
# Executar agente
curl -X POST \
  https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/agentes-ia-api/agentes/executar \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{"agente_id": "uuid", "input": "texto"}'

# Criar documento ZapSign
curl -X POST \
  https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/zapsign-integration \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "create_document", "contratoId": "uuid"}'
```
