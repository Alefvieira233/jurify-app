import { useLocation, Link } from 'react-router-dom';
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

  const crumbs = segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: '/' + segments.slice(0, i + 1).join('/'),
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground px-6 pt-4 pb-1">
      <ol className="flex items-center gap-1 list-none p-0 m-0">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" aria-hidden="true" />}
              {isLast ? (
                <span className="text-foreground font-semibold" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
