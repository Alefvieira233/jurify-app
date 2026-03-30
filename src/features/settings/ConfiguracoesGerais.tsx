
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plug, Users, Bell, Server, ShieldAlert, Settings,
  UserCircle, Building2, CreditCard, Shield,
} from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
import IntegracoesSection from '@/components/configuracoes/IntegracoesSection';
import UsuariosPermissoesSection from '@/components/configuracoes/UsuariosPermissoesSection';
import NotificacoesSection from '@/components/configuracoes/NotificacoesSection';
import SistemaSection from '@/components/configuracoes/SistemaSection';
import PerfilSection from '@/components/configuracoes/PerfilSection';
import EscritorioSection from '@/components/configuracoes/EscritorioSection';
import AssinaturaSection from '@/components/configuracoes/AssinaturaSection';
import LGPDPrivacySection from '@/components/configuracoes/LGPDPrivacySection';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParams } from 'react-router-dom';

const VALID_TABS = [
  'perfil', 'escritorio', 'integracoes', 'equipe', 'assinatura', 'notificacoes', 'sistema', 'privacidade',
] as const;

type Tab = typeof VALID_TABS[number];

const ConfiguracoesGerais = () => {
  usePageTitle('Configurações');
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') ?? '';
  const activeTab: Tab = (VALID_TABS as readonly string[]).includes(tabParam)
    ? (tabParam as Tab)
    : 'perfil';

  const { can, userRole } = useRBAC();

  if (!can('configuracoes', 'read')) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">
        <header className="flex-shrink-0 px-8 py-6 pb-4 border-b border-border/5 bg-background">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                <Settings className="w-3.5 h-3.5" />
                Root Setup
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Configurações
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Acesso negado. Role e escopo insuficientes.
              </p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-sm">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar as configurações.
              <br />
              <span className="text-sm text-muted-foreground/70">Role atual: {userRole}</span>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">

      {/* Header Lex Obsidian */}
      <header className="flex-shrink-0 px-8 py-6 pb-4 border-b border-border/5 bg-background fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
              <Settings className="w-3.5 h-3.5" />
              Root Setup
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Gerencie a operação central do espaço, controle suas integrações e defina as premissas do seu negócio.
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <Tabs defaultValue={activeTab} className="space-y-5">
          {/* Flex scrollável — suporta n tabs sem overflow */}
          <TabsList className="flex w-full overflow-x-auto h-11 justify-start gap-1 bg-muted/30 p-1 border border-border/10 rounded-[14px]">
            <TabsTrigger value="perfil" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <UserCircle className="h-4 w-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="escritorio" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Building2 className="h-4 w-4" /> Escritório
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Plug className="h-4 w-4" /> Integrações
            </TabsTrigger>
            <TabsTrigger value="equipe" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Users className="h-4 w-4" /> Equipe
            </TabsTrigger>
            <TabsTrigger value="assinatura" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <CreditCard className="h-4 w-4" /> Assinatura
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Bell className="h-4 w-4" /> Notificações
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Server className="h-4 w-4" /> Sistema
            </TabsTrigger>
            <TabsTrigger value="privacidade" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-full rounded-[10px] px-4 shrink-0">
              <Shield className="h-4 w-4" /> Privacidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <PerfilSection />
          </TabsContent>

          <TabsContent value="escritorio">
            <EscritorioSection />
          </TabsContent>

          <TabsContent value="integracoes">
            <IntegracoesSection />
          </TabsContent>

          <TabsContent value="equipe">
            <UsuariosPermissoesSection />
          </TabsContent>

          <TabsContent value="assinatura">
            <AssinaturaSection />
          </TabsContent>

          <TabsContent value="notificacoes">
            <NotificacoesSection />
          </TabsContent>

          <TabsContent value="sistema">
            <SistemaSection />
          </TabsContent>

          <TabsContent value="privacidade">
            <LGPDPrivacySection />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default ConfiguracoesGerais;
