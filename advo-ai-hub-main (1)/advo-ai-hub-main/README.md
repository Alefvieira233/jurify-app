# Jurify - Legal SaaS Platform

Sistema SaaS jurídico com inteligência artificial para gestão de escritórios de advocacia.

## Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth)
- **IA:** OpenAI GPT-4 via Edge Functions
- **Monitoramento:** Sentry

## Funcionalidades

- **Gestão de Leads:** Captura, qualificação e acompanhamento
- **Pipeline Jurídico:** Kanban para acompanhamento de casos
- **Contratos:** Gestão e assinatura digital (ZapSign)
- **Agendamentos:** Calendário com integração Google Calendar
- **WhatsApp IA:** Atendimento automatizado com IA
- **Sistema Multi-Agentes:** 7 agentes especializados para processamento inteligente
- **Relatórios:** Analytics e métricas de performance
- **Multi-tenant:** Isolamento de dados por escritório

## Requisitos

- Node.js >= 18.0.0
- npm >= 8.0.0
- Conta Supabase configurada
- API Key OpenAI (para funcionalidades de IA)

## Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd jurify

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor de desenvolvimento
npm run dev
```

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_SENTRY_DSN=seu-sentry-dsn (opcional)
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificação de lint |
| `npm run type-check` | Verificação de tipos |
| `npm run test` | Executar testes |
| `npm run test:coverage` | Testes com cobertura |

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis
│   ├── ui/          # Componentes shadcn/ui
│   └── ...
├── features/         # Módulos por funcionalidade
│   ├── leads/
│   ├── pipeline/
│   ├── whatsapp/
│   ├── ai-agents/
│   └── ...
├── hooks/            # Custom hooks
├── contexts/         # React contexts
├── lib/              # Bibliotecas e utilitários
│   └── multiagents/  # Sistema multi-agentes
├── integrations/     # Integrações externas
├── pages/            # Páginas da aplicação
└── utils/            # Funções utilitárias

supabase/
└── functions/        # Edge Functions
    ├── ai-agent-processor/
    ├── whatsapp-webhook/
    └── ...
```

## Sistema Multi-Agentes

O Jurify possui um sistema de 7 agentes de IA especializados:

| Agente | Função |
|--------|--------|
| Coordenador | Orquestra o fluxo entre agentes |
| Qualificador | Analisa e qualifica leads |
| Jurídico | Valida viabilidade jurídica |
| Comercial | Cria propostas personalizadas |
| Comunicador | Formata mensagens por canal |
| Analista | Gera insights e métricas |
| CustomerSuccess | Gerencia onboarding |

## Segurança

- API keys protegidas em Edge Functions (nunca expostas no frontend)
- Autenticação via Supabase Auth
- Row Level Security (RLS) no PostgreSQL
- Multi-tenancy com isolamento de dados
- Rate limiting nas APIs
- Sanitização de inputs (XSS protection)

## Deploy

### Vercel (Recomendado)

```bash
npm run build
vercel --prod
```

### Docker

```bash
docker build -t jurify .
docker run -p 3000:3000 jurify
```

## Documentação Adicional

- [API Endpoints](./docs/API_ENDPOINTS.md)
- [Setup Guide](./docs/SETUP_GUIDE.md)
- [Deployment](./docs/DEPLOYMENT.md)

## Licença

Proprietário - Todos os direitos reservados.
