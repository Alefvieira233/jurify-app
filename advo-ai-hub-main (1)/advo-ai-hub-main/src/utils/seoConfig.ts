
interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  image?: string;
  url?: string;
  type?: string;
}

export const defaultSEO: SEOConfig = {
  title: 'Jurify - Automação Jurídica com IA | SaaS para Escritórios de Advocacia',
  description: 'Jurify é a plataforma de automação jurídica que utiliza Inteligência Artificial para otimizar processos, gerenciar leads, contratos e agendamentos. Ideal para escritórios de advocacia que buscam eficiência e crescimento.',
  keywords: [
    'automação jurídica',
    'software jurídico',
    'IA para advocacia',
    'gestão de escritório de advocacia',
    'SaaS jurídico',
    'CRM jurídico',
    'contratos digitais',
    'assinatura eletrônica',
    'agendamento advocacia',
    'leads jurídicos',
    'chatbot jurídico',
    'workflow jurídico',
    'compliance jurídico',
    'produtividade advocacia'
  ],
  image: '/og-image.jpg',
  type: 'website'
};

export const pageSEO = {
  dashboard: {
    title: 'Dashboard - Jurify | Visão Geral do Escritório',
    description: 'Acompanhe métricas em tempo real do seu escritório de advocacia: leads, contratos, agendamentos e performance dos agentes IA.',
    keywords: ['dashboard jurídico', 'métricas advocacia', 'KPIs jurídicos']
  },
  leads: {
    title: 'Gestão de Leads - Jurify | CRM Jurídico',
    description: 'Gerencie leads jurídicos com eficiência. Acompanhe o pipeline de vendas, qualifique clientes e converta mais prospects.',
    keywords: ['CRM jurídico', 'leads advocacia', 'gestão clientes', 'pipeline vendas']
  },
  pipeline: {
    title: 'Pipeline Jurídico - Jurify | Kanban de Processos',
    description: 'Visualize e gerencie o fluxo de trabalho do seu escritório com nosso pipeline Kanban intuitivo.',
    keywords: ['pipeline jurídico', 'kanban advocacia', 'workflow jurídico']
  },
  agentes: {
    title: 'Agentes IA - Jurify | Automação com Inteligência Artificial',
    description: 'Configure e execute agentes de IA especializados em diferentes áreas jurídicas para automatizar tarefas repetitivas.',
    keywords: ['IA jurídica', 'automação advocacia', 'chatbot jurídico', 'agentes inteligentes']
  },
  contratos: {
    title: 'Gestão de Contratos - Jurify | Assinatura Digital',
    description: 'Crie, gerencie e obtenha assinaturas digitais em contratos jurídicos de forma rápida e segura.',
    keywords: ['contratos digitais', 'assinatura eletrônica', 'gestão contratos', 'ZapSign']
  },
  agendamentos: {
    title: 'Agendamentos - Jurify | Calendário Jurídico',
    description: 'Gerencie agendamentos e sincronize com Google Calendar para uma agenda profissional organizada.',
    keywords: ['agendamento advocacia', 'calendário jurídico', 'Google Calendar']
  },
  relatorios: {
    title: 'Relatórios Gerenciais - Jurify | Analytics Jurídico',
    description: 'Analise performance, conversões e métricas detalhadas do seu escritório com relatórios inteligentes.',
    keywords: ['relatórios jurídicos', 'analytics advocacia', 'métricas escritório']
  }
};

export const structuredData = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Jurify",
    "description": "Plataforma de automação jurídica com IA",
    "url": "https://jurify.com.br",
    "logo": "https://jurify.com.br/logo.png",
    "foundingDate": "2024",
    "industry": "Legal Technology",
    "serviceArea": "Brasil",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "BR"
    }
  },
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Jurify",
    "applicationCategory": "Legal Software",
    "operatingSystem": "Web Browser",
    "description": "Software de automação jurídica com IA para escritórios de advocacia",
    "offers": {
      "@type": "Offer",
      "category": "SaaS",
      "businessFunction": "Legal Process Automation"
    },
    "featureList": [
      "Gestão de Leads",
      "Pipeline Kanban",
      "Agentes IA",
      "Contratos Digitais",
      "Assinatura Eletrônica",
      "Agendamentos",
      "Relatórios Gerenciais",
      "Integração WhatsApp",
      "Sincronização Google Calendar"
    ]
  }
};

export const generateMetaTags = (config: SEOConfig) => {
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords.join(', '),
    'og:title': config.title,
    'og:description': config.description,
    'og:type': config.type || 'website',
    'og:image': config.image,
    'og:url': config.url,
    'twitter:card': 'summary_large_image',
    'twitter:title': config.title,
    'twitter:description': config.description,
    'twitter:image': config.image,
    'robots': 'index, follow',
    'canonical': config.url
  };
};
