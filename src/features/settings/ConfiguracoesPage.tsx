import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Reutilizar componentes existentes
import MinhaContaSection from './configuracoes/MinhaContaSection';
import SegurancaSection from './configuracoes/SegurancaSection';
import EscritorioSection from './configuracoes/EscritorioSection';
import IntegracoesSection from './configuracoes/IntegracoesSection';
import UsuariosPermissoesSection from './configuracoes/UsuariosPermissoesSection';
import NotificacoesSection from './configuracoes/NotificacoesSection';
import AssinaturaSection from './configuracoes/AssinaturaSection';
import HorarioComercialSection from './sections/HorarioComercialSection';
import StatusManager from './sections/StatusManager';
import UsoSection from './sections/UsoSection';
import TagsManager from '@/features/tags/TagsManager';
import DepartamentosManager from '@/features/departamentos/DepartamentosManager';

type SettingsSection = {
  id: string;
  label: string;
  subsections?: { id: string; label: string }[];
};

const SETTINGS_NAV: { group: string; sections: SettingsSection[] }[] = [
  {
    group: 'PERFIL',
    sections: [
      { id: 'minha-conta', label: 'Minha Conta' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'notificacoes', label: 'Notificações' },
    ],
  },
  {
    group: 'EMPRESA',
    sections: [
      { id: 'geral', label: 'Geral' },
      {
        id: 'classes',
        label: 'Classes',
        subsections: [
          { id: 'status', label: 'Status' },
          { id: 'etiquetas', label: 'Etiquetas' },
          { id: 'departamento', label: 'Departamento' },
        ],
      },
      { id: 'membros', label: 'Membros' },
      { id: 'integracoes', label: 'Integrações' },
      { id: 'horario-comercial', label: 'Horário Comercial' },
    ],
  },
  {
    group: 'COBRANÇA',
    sections: [
      { id: 'plano', label: 'Plano' },
      { id: 'uso', label: 'Uso' },
    ],
  },
];

function Breadcrumb({ path }: { path: string[] }) {
  return (
    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
      {path.map((p, i) => (
        <span key={p}>
          {i > 0 && <span className="mx-1 text-muted-foreground/40">&gt;</span>}
          {p}
        </span>
      ))}
    </div>
  );
}

function SettingsContent({ section, subsection }: { section: string; subsection?: string }) {
  switch (section) {
    case 'minha-conta':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Perfil', 'Minha Conta']} />
          <h1 className="text-lg font-semibold mb-1">Minha Conta</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie suas informações pessoais e preferências.</p>
          <MinhaContaSection />
        </div>
      );
    case 'seguranca':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Perfil', 'Segurança']} />
          <h1 className="text-lg font-semibold mb-1">Segurança</h1>
          <p className="text-sm text-muted-foreground mb-6">Altere sua senha e configure autenticação de dois fatores.</p>
          <SegurancaSection />
        </div>
      );
    case 'notificacoes':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Perfil', 'Notificações']} />
          <h1 className="text-lg font-semibold mb-1">Notificações</h1>
          <p className="text-sm text-muted-foreground mb-6">Configure como e quando deseja receber notificações.</p>
          <NotificacoesSection />
        </div>
      );
    case 'geral':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Empresa', 'Geral']} />
          <h1 className="text-lg font-semibold mb-1">Geral</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie as informações gerais da sua empresa.</p>
          <EscritorioSection />
        </div>
      );
    case 'classes': {
      const sub = subsection || 'status';
      const subLabel = sub.charAt(0).toUpperCase() + sub.slice(1);
      return (
        <div className="p-6 max-w-5xl">
          <Breadcrumb path={['Empresa', 'Classes', subLabel]} />
          {sub === 'status' && <StatusManager />}
          {sub === 'etiquetas' && <TagsManager />}
          {sub === 'departamento' && <DepartamentosManager />}
        </div>
      );
    }
    case 'membros':
      return (
        <div className="p-6 max-w-4xl">
          <Breadcrumb path={['Empresa', 'Membros']} />
          <h1 className="text-lg font-semibold mb-1">Membros</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie os membros e permissões da sua equipe.</p>
          <UsuariosPermissoesSection />
        </div>
      );
    case 'integracoes':
      return (
        <div className="p-6 max-w-4xl">
          <Breadcrumb path={['Empresa', 'Integrações']} />
          <h1 className="text-lg font-semibold mb-1">Integrações</h1>
          <p className="text-sm text-muted-foreground mb-6">Conecte ferramentas externas e expanda suas funcionalidades.</p>
          <IntegracoesSection />
        </div>
      );
    case 'horario-comercial':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Empresa', 'Horário Comercial']} />
          <HorarioComercialSection />
        </div>
      );
    case 'plano':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Cobrança', 'Plano']} />
          <h1 className="text-lg font-semibold mb-1">Plano</h1>
          <p className="text-sm text-muted-foreground mb-6">Visualize e gerencie seu plano de assinatura.</p>
          <AssinaturaSection />
        </div>
      );
    case 'uso':
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Cobrança', 'Uso']} />
          <UsoSection />
        </div>
      );
    default:
      return (
        <div className="p-6 max-w-3xl">
          <Breadcrumb path={['Perfil', 'Minha Conta']} />
          <h1 className="text-lg font-semibold mb-1">Minha Conta</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie suas informações pessoais e preferências.</p>
          <MinhaContaSection />
        </div>
      );
  }
}

const ConfiguracoesPage = () => {
  usePageTitle('Configurações');
  const { section = 'minha-conta', subsection } = useParams();
  const navigate = useNavigate();
  const [expandedClasses, setExpandedClasses] = useState(section === 'classes');

  const navigateTo = (sectionId: string, subsectionId?: string) => {
    const path = subsectionId
      ? `/configuracoes/${sectionId}/${subsectionId}`
      : `/configuracoes/${sectionId}`;
    navigate(path);
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h,4rem))] bg-background">
      {/* Settings sidebar */}
      <aside className="w-56 border-r border-border bg-background overflow-y-auto flex-shrink-0 hidden md:block">
        <nav className="py-4">
          {SETTINGS_NAV.map(group => (
            <div key={group.group} className="mb-4">
              <h3 className="px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                {group.group}
              </h3>
              <ul className="space-y-0.5">
                {group.sections.map(s => {
                  const isActive = section === s.id;
                  const hasSubsections = s.subsections && s.subsections.length > 0;

                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          if (hasSubsections) {
                            setExpandedClasses(!expandedClasses);
                            if (!isActive) {
                              navigateTo(s.id, s.subsections?.[0]?.id);
                            }
                          } else {
                            navigateTo(s.id);
                          }
                        }}
                        className={cn(
                          'w-full text-left px-4 py-1.5 text-sm transition-colors flex items-center',
                          isActive
                            ? 'text-primary font-medium bg-primary/5'
                            : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        <span className="flex-1">{s.label}</span>
                        {hasSubsections && (
                          <ChevronRight className={cn(
                            'h-3.5 w-3.5 text-muted-foreground/40 transition-transform',
                            (isActive || expandedClasses) && 'rotate-90'
                          )} />
                        )}
                      </button>
                      {hasSubsections && (isActive || expandedClasses) && (
                        <ul className="ml-4 space-y-0.5 mt-0.5">
                          {s.subsections!.map(sub => (
                            <li key={sub.id}>
                              <button
                                onClick={() => navigateTo(s.id, sub.id)}
                                className={cn(
                                  'w-full text-left px-3 py-1 text-xs transition-colors',
                                  subsection === sub.id
                                    ? 'text-primary font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {sub.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <SettingsContent section={section} subsection={subsection} />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default ConfiguracoesPage;
