
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, Users, Bell, Server, TestTube, ShieldAlert, Settings } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
import IntegracoesSection from '@/components/configuracoes/IntegracoesSection';
import UsuariosPermissoesSection from '@/components/configuracoes/UsuariosPermissoesSection';
import NotificacoesSection from '@/components/configuracoes/NotificacoesSection';
import SistemaSection from '@/components/configuracoes/SistemaSection';

const ConfiguracoesGerais = () => {
  // ✅ RBAC: Verificação de permissões
  const { can, userRole } = useRBAC();

  // Se não pode acessar configurações, mostrar mensagem
  if (!can('configuracoes', 'read')) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Configurações</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Integrações, usuários, notificações e sistema
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
    <div className="flex flex-col h-screen bg-background">

      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">Configurações</h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              Integrações, usuários, notificações e sistema
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <Tabs defaultValue="integracoes" className="space-y-5">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="integracoes" className="flex items-center gap-1.5 text-xs">
              <Plug className="h-3.5 w-3.5" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-1.5 text-xs">
              <Server className="h-3.5 w-3.5" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="teste-n8n" className="flex items-center gap-1.5 text-xs">
              <TestTube className="h-3.5 w-3.5" />
              Teste N8N
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integracoes">
            <IntegracoesSection />
          </TabsContent>

          <TabsContent value="usuarios">
            <UsuariosPermissoesSection />
          </TabsContent>

          <TabsContent value="notificacoes">
            <NotificacoesSection />
          </TabsContent>

          <TabsContent value="sistema">
            <SistemaSection />
          </TabsContent>

          <TabsContent value="teste-n8n">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Teste N8N</CardTitle>
                <CardDescription>Funcionalidade em construção</CardDescription>
              </CardHeader>
            </Card>
            {/* <TesteN8N /> */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConfiguracoesGerais;
