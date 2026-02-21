
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, Users, Bell, Server, TestTube, ShieldAlert } from 'lucide-react';
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
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar as configurações.
            <br />
            <span className="text-sm text-muted-foreground/70">Role atual: {userRole}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações Gerais</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações avançadas do sistema Jurify para otimizar o funcionamento do seu escritório
        </p>
      </div>

      <Tabs defaultValue="integracoes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integracoes" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários & Permissões
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="teste-n8n" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
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
          <Card>
            <CardHeader>
              <CardTitle>Teste N8N</CardTitle>
              <CardDescription>Funcionalidade em construção</CardDescription>
            </CardHeader>
          </Card>
          {/* <TesteN8N /> */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesGerais;
