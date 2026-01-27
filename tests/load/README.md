# 🚀 Jurify Load Testing Suite

Suite completa de testes de carga usando **k6** para validar performance e escalabilidade do Jurify.

## 📋 Pré-requisitos

### Instalar k6

**Windows:**
```bash
choco install k6
```

**Mac:**
```bash
brew install k6
```

**Linux:**
```bash
sudo apt-get install k6
```

**Ou via binário:**
https://k6.io/docs/get-started/installation/

### Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
BASE_URL=http://localhost:8080
```

## 🧪 Testes Disponíveis

### 1. Health Check (`01-health-check.js`)
**Objetivo:** Verificar disponibilidade básica da aplicação
**Carga:** 100 VUs por 30 segundos
**Duração:** ~50 segundos total
**Custo:** Grátis

```bash
k6 run 01-health-check.js
```

**Thresholds:**
- 95% das requests < 500ms
- Taxa de erro < 1%

---

### 2. Authentication Stress (`02-auth-stress.js`)
**Objetivo:** Testar sistema de autenticação sob carga
**Carga:** 50 logins concorrentes
**Duração:** 2 minutos
**Custo:** Grátis

⚠️ **Pré-requisito:** Criar usuários de teste no Supabase:
- `loadtest1@jurify.com` | Senha: `LoadTest@2024`
- `loadtest2@jurify.com` | Senha: `LoadTest@2024`
- `loadtest3@jurify.com` | Senha: `LoadTest@2024`

```bash
k6 run 02-auth-stress.js
```

**Thresholds:**
- 95% dos logins < 2s
- Taxa de falha < 5%

---

### 3. AI Agents Performance (`03-ai-agents-performance.js`)
**Objetivo:** Testar agentes IA sob carga
**Carga:** 20 execuções concorrentes
**Duração:** 3 minutos
**Custo:** 💰 ~$0.50-$2.00 (consome tokens OpenAI)

```bash
k6 run 03-ai-agents-performance.js
```

**Thresholds:**
- 90% das execuções < 10s
- Taxa de falha < 10%

**Estimativa de custos:**
- ~300-500 execuções de agentes
- ~150k tokens utilizados
- Custo: $0.005 por 1k tokens (GPT-4)
- Total: ~$0.75

---

## 🎯 Executar Todos os Testes

```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

O script executará todos os testes sequencialmente e perguntará antes de rodar o teste de AI (que custa dinheiro).

## 📊 Visualizar Resultados

### Opção 1: CLI (padrão)
Os resultados são exibidos diretamente no terminal com métricas coloridas.

### Opção 2: HTML Reports
Alguns testes geram relatórios HTML automaticamente:
```bash
# Abrir relatório no navegador
open load-test-health-check-summary.html
```

### Opção 3: k6 Cloud (avançado)
```bash
k6 cloud 01-health-check.js
```

### Opção 4: Grafana + InfluxDB (enterprise)
1. Instalar InfluxDB:
   ```bash
   docker run -d -p 8086:8086 influxdb:1.8
   ```

2. Rodar teste com output para InfluxDB:
   ```bash
   k6 run --out influxdb=http://localhost:8086/k6 01-health-check.js
   ```

3. Configurar Grafana para visualizar métricas

## 🎓 Interpretando Resultados

### Métricas Principais

| Métrica | Boa | Aceitável | Ruim |
|---------|-----|-----------|------|
| **http_req_duration (p95)** | <500ms | 500-1000ms | >1000ms |
| **http_req_failed** | <1% | 1-5% | >5% |
| **AI execution (p90)** | <8s | 8-12s | >12s |
| **Login duration (p95)** | <1.5s | 1.5-2.5s | >2.5s |

### Thresholds

Thresholds são critérios de sucesso/falha. Se um threshold falha, o k6 retorna exit code 1.

Exemplo:
```javascript
thresholds: {
  'http_req_duration': ['p(95)<500'], // FAIL se P95 > 500ms
}
```

## 🔍 Debugging

### Ver requests detalhadas
```bash
k6 run --http-debug 01-health-check.js
```

### Aumentar verbosidade
```bash
k6 run --verbose 01-health-check.js
```

### Rodar teste com menos VUs (debug)
```bash
k6 run --vus 5 --duration 10s 01-health-check.js
```

## 📈 Tipos de Testes de Carga

### 1. Load Test (Teste de Carga)
Carga constante durante período prolongado.
- **Quando usar:** Validar performance normal
- **Exemplo:** 01-health-check.js

### 2. Stress Test (Teste de Estresse)
Carga crescente até sistema quebrar.
- **Quando usar:** Descobrir limite de carga
- **Exemplo:** 02-auth-stress.js

### 3. Spike Test (Teste de Pico)
Pico repentino de carga.
```javascript
stages: [
  { duration: '10s', target: 10 },   // Normal
  { duration: '30s', target: 500 },  // SPIKE!
  { duration: '10s', target: 10 },   // Volta ao normal
]
```

### 4. Soak Test (Teste de Imersão)
Carga moderada durante muito tempo (horas).
- **Quando usar:** Detectar memory leaks
```javascript
stages: [
  { duration: '2h', target: 50 },
]
```

## 🚨 Alertas e Monitoramento

Integre com Sentry/Grafana para receber alertas quando:
- Taxa de erro > 5%
- Latência P95 > threshold
- CPU > 80%
- Memory > 90%

## 📝 Boas Práticas

1. **Sempre rodar em ambiente de staging primeiro**
2. **Nunca rodar load tests em produção sem aviso**
3. **Começar com carga baixa e aumentar gradualmente**
4. **Monitorar custos (principalmente AI tests)**
5. **Documentar resultados e criar histórico**
6. **Rodar load tests antes de deploy de features críticas**

## 🛠️ Troubleshooting

### Erro: "Connection refused"
- Verificar se servidor está rodando
- Verificar URL do `.env`

### Erro: "Too many open files"
**Linux/Mac:**
```bash
ulimit -n 65536
```

### Erro: "Rate limited"
- Aumentar `sleep()` entre requests
- Reduzir número de VUs

## 📚 Recursos

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/api-load-testing/)

---

**Criado com 💪 pelo time Jurify**
