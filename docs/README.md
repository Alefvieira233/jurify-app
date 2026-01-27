
# Jurify SaaS - Documentação Técnica

## 📋 Visão Geral

O Jurify SaaS é uma plataforma completa para gestão de escritórios de advocacia, desenvolvida com React, Supabase e Edge Functions.

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth com RLS
- **Estado**: React Query (@tanstack/react-query)
- **Roteamento**: React Router DOM

### Estrutura de Pastas
```
src/
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── pages/              # Páginas principais
├── contexts/           # Context providers
├── integrations/       # Configurações do Supabase
└── lib/               # Utilitários

supabase/
├── functions/         # Edge Functions
└── migrations/        # Migrações SQL
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### Autenticação e Usuários
- `profiles` - Perfis dos usuários
- `user_roles` - Roles dos usuários (RBAC)
- `role_permissions` - Permissões por role

#### Core Business
- `leads` - Cadastro de leads
- `contratos` - Contratos gerados
- `agendamentos` - Agendamentos e reuniões

#### IA e Automação
- `agentes_ia` - Configuração dos agentes de IA
- `logs_execucao_agentes` - Logs de execução
- `api_keys` - Chaves de API

#### Configurações
- `system_settings` - Configurações do sistema
- `notification_templates` - Templates de notificação
- `configuracoes_integracoes` - Integrações externas

#### Integrações
- `google_calendar_tokens` - Tokens do Google Calendar
- `google_calendar_settings` - Configurações do Calendar
- `zapsign_logs` - Logs do ZapSign

### Relacionamentos Principais
```sql
leads (1:N) -> contratos
leads (1:N) -> agendamentos
profiles (1:N) -> user_roles
agentes_ia (1:N) -> logs_execucao_agentes
```

## 🔑 Sistema de Permissões (RBAC)

### Roles Disponíveis
- `administrador` - Acesso total
- `advogado` - Acesso a leads, contratos, agendamentos
- `comercial` - Foco em leads e pipeline
- `pos_venda` - Contratos e atendimento
- `suporte` - Acesso limitado

### Módulos e Permissões
- `leads` - read, write, manage
- `contratos` - read, write, manage
- `agendamentos` - read, write, manage
- `usuarios` - read, write, manage
- `whatsapp_ia` - read, write, manage
- `relatorios` - read, write, manage

## 🔗 APIs e Edge Functions

### Edge Functions Disponíveis

#### 1. `agentes-ia-api`
- **Endpoint**: `/functions/v1/agentes-ia-api`
- **Métodos**: 
  - `GET /agentes/listar` - Lista agentes
  - `POST /agentes/executar` - Executa agente
- **Autenticação**: API Key via header `x-api-key`

#### 2. `whatsapp-contract`
- **Endpoint**: `/functions/v1/whatsapp-contract`
- **Método**: `POST`
- **Funcionalidade**: Envio de contratos via WhatsApp

#### 3. `zapsign-integration`
- **Endpoint**: `/functions/v1/zapsign-integration`
- **Métodos**: 
  - `create_document` - Criar documento
  - `check_status` - Verificar status

### Autenticação das APIs

#### Por API Key
```typescript
headers: {
  'x-api-key': 'jf_xxxxxxxxxxxxx'
}
```

#### Por JWT (Supabase Auth)
```typescript
headers: {
  'Authorization': `Bearer ${session.access_token}`
}
```

## 🚀 Deploy e Configuração

### Variáveis de Ambiente (Supabase Secrets)
- `OPENAI_API_KEY` - API do OpenAI
- `GOOGLE_CLIENT_ID` - Google Calendar
- `GOOGLE_CLIENT_SECRET` - Google Calendar
- `ZAPSIGN_TOKEN` - ZapSign API
- `WHATSAPP_TOKEN` - WhatsApp API

### Setup Local
1. Clone o repositório
2. Configure as variáveis no Supabase
3. Execute as migrações SQL
4. `npm install && npm run dev`

### Deploy no Lovable
1. Push para o repositório conectado
2. Deploy automático via Lovable
3. Configure os secrets no Supabase Dashboard

## 🔐 Segurança

### Row Level Security (RLS)
Todas as tabelas possuem políticas RLS baseadas em:
- `auth.uid()` para dados do usuário
- Roles para permissões administrativas
- Status ativo para soft deletes

### Validações
- Sanitização de inputs
- Validação de tipos TypeScript
- Verificação de permissões em todas as operações

## 📊 Monitoramento

### Logs Disponíveis
- `logs_atividades` - Ações dos usuários
- `logs_execucao_agentes` - Execuções de IA
- `google_calendar_sync_logs` - Sincronização Calendar
- `zapsign_logs` - Eventos ZapSign

### Métricas Principais
- Total de leads
- Taxa de conversão
- Execuções de IA
- Performance das integrações

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024
