import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  home: 'Home',
  dashboard: 'Dashboard',
  whatsapp: 'Conversas',
  crm: 'Contatos',
  pipeline: 'Kanban',
  agentes: 'Agentes',
  agendamentos: 'Tarefas',
  tarefas: 'Tarefas',
  contratos: 'Contratos',
  configuracoes: 'Configurações',
  conexoes: 'Conexões',
  processos: 'Processos',
  prazos: 'Prazos',
  honorarios: 'Honorários',
  documentos: 'Documentos',
  suporte: 'Suporte',
  'base-conhecimento': 'Base de Conhecimento',
  notificacoes: 'Notificações',
  equipe: 'Equipe',
  departamentos: 'Departamentos',
  fluxos: 'Fluxos',
  regras: 'Regras',
  metricas: 'Métricas',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  integracoes: 'Integrações',
  arquivados: 'Arquivados',
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on home/root
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'home')) {
    return null;
  }

  const crumbs = segments.map(seg => ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1));

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground px-6 pt-4 pb-1">
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
          <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}
