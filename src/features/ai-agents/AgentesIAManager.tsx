import { useState } from 'react';
import { Plus, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Componentes refatorados
import { AgentesIAFilters } from './AgentesIAFilters';
import { AgentesIACard } from './AgentesIACard';
import { useAgentesIAFilters } from './hooks/useAgentesIAFilters';
import type { AgenteIA } from '@/hooks/useAgentesIA';

// Componentes existentes
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAgentesIA } from '@/hooks/useAgentesIA';
import { useAgentesMetrics } from '@/hooks/useAgentesMetrics';
import NovoAgenteForm from '@/components/NovoAgenteForm';
import DetalhesAgente from '@/components/DetalhesAgente';
import ApiKeysManager from '@/components/ApiKeysManager';
import LogsMonitoramento from '@/components/LogsMonitoramento';
import KnowledgeBaseSection from './KnowledgeBaseSection';

// Monitoring
import { trackUserAction } from '@/utils/monitoring';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';

const log = createLogger('AgentesIAManager');

const AgentesIAManager = () => {
  usePageTitle('Agentes IA');
  const [showNovoAgente, setShowNovoAgente] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState<AgenteIA | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: '', nome: '' });
  const { agentes, loading, error, isEmpty, updateAgente, deleteAgente, fetchAgentes } = useAgentesIA();
  const { metrics, loading: metricsLoading } = useAgentesMetrics();

  // Hook de filtros otimizado
  const {
    filters,
    filteredAgentes,
    agentesAtivos,
    updateFilter,
    clearFilters,
    totalAgentes,
    totalFiltrados
  } = useAgentesIAFilters(agentes);

  const toggleStatus = async (agente: AgenteIA) => {
    const statusLabel = agente.status === 'ativo' ? 'inativo' : 'ativo';
    log.info(`Alterando status do agente ${agente.nome} para ${statusLabel}`);

    // Track user action
    trackUserAction('toggle_agent_status', 'agentes_ia', user?.id, profile?.tenant_id, {
      agentId: agente.id,
      agentName: agente.nome,
      fromStatus: agente.status ?? 'inativo',
      toStatus: statusLabel
    });

    const success = await updateAgente(agente.id, { status: statusLabel });

    if (success) {
      toast({
        title: "Status Atualizado",
        description: `Agente ${statusLabel === 'ativo' ? 'ativado' : 'desativado'} com sucesso`,
      });
    }
  };

  const handleEdit = (agente: AgenteIA) => {
    setSelectedAgente(agente);
    setShowNovoAgente(true);

    trackUserAction('edit_agent', 'agentes_ia', user?.id, profile?.tenant_id, {
      agentId: agente.id,
      agentName: agente.nome
    });
  };

  const handleToggleStatus = (agente: AgenteIA) => {
    void toggleStatus(agente);
  };

  const handleViewDetails = (agente: AgenteIA) => {
    setSelectedAgente(agente);
    setShowDetalhes(true);

    trackUserAction('view_agent_details', 'agentes_ia', user?.id, profile?.tenant_id, {
      agentId: agente.id,
      agentName: agente.nome
    });
  };

  const handleDelete = (agente: AgenteIA) => {
    setConfirmDelete({ open: true, id: agente.id, nome: agente.nome });
    trackUserAction('delete_agent', 'agentes_ia', user?.id, profile?.tenant_id, {
      agentId: agente.id,
      agentName: agente.nome
    });
  };

  const handleCloseModal = () => {
    setShowNovoAgente(false);
    setShowDetalhes(false);
    setSelectedAgente(null);
  };

  const handleRetry = () => {
    fetchAgentes();
    trackUserAction('retry_load_agents', 'agentes_ia', user?.id, profile?.tenant_id);
  };

  const handleCreateNew = () => {
    setSelectedAgente(null);
    setShowNovoAgente(true);

    trackUserAction('create_new_agent', 'agentes_ia', user?.id, profile?.tenant_id);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Agentes de IA</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Agentes de IA</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Bot className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Erro ao carregar agentes</h3>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={handleRetry} variant="outline" className="border-red-300 text-red-700">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Lex Obsidian */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Bot className="w-3.5 h-3.5" />
            Automação SaaS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Agentes de IA
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Configure atendentes autônomos para triar, qualificar e responder em segundos, integrados a todos os canais.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRetry} size="icon" className="h-11 w-11 rounded-[12px] border-border/20 shadow-sm">
            <Bot className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button onClick={handleCreateNew} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
            <Plus className="h-4 w-4" />
            Novo Agente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden flex items-center shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="h-12 w-12 rounded-[14px] bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner z-10 shrink-0">
             <Bot className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-4 z-10">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-foreground leading-none">{totalAgentes}</p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden flex items-center shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="h-12 w-12 rounded-[14px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner z-10 shrink-0">
             <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          </div>
          <div className="ml-4 z-10">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Ativos</p>
            <p className="text-2xl font-black text-emerald-500 leading-none">{agentesAtivos}</p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden flex items-center shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="h-12 w-12 rounded-[14px] bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner z-10 shrink-0 text-xl">
             📊
          </div>
          <div className="ml-4 z-10">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Execuções / Mês</p>
            <p className="text-2xl font-black text-purple-400 leading-none">
              {metricsLoading ? '...' : metrics.execucoesMes > 0 ? metrics.execucoesMes : metrics.execucoesHoje}
            </p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden flex items-center shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="h-12 w-12 rounded-[14px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner z-10 shrink-0 text-xl">
             🏆
          </div>
          <div className="ml-4 min-w-0 z-10">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Sucesso / Campeão</p>
            <p className="text-sm font-black text-amber-500 leading-tight truncate" title={metrics.agenteMaisAtivo || '—'}>
              {metricsLoading ? '...' : metrics.agenteMaisAtivo ? `${metrics.sucessoRate}% - ${metrics.agenteMaisAtivo}` : 'Sem dados'}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="agentes" className="space-y-6">
        <TabsList className="bg-muted/30 p-1 border border-border/10 rounded-[14px]">
          <TabsTrigger value="agentes" className="rounded-[10px] text-xs h-9 px-4">Workspace</TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-[10px] text-xs h-9 px-4">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="api-keys" className="rounded-[10px] text-xs h-9 px-4">Integrações (API)</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-[10px] text-xs h-9 px-4">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="agentes" className="space-y-6">
          {/* Filtros */}
          <AgentesIAFilters
            filters={filters}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            totalAgentes={totalAgentes}
            totalFiltrados={totalFiltrados}
            agentesAtivos={agentesAtivos}
          />

          {/* Lista de Agentes */}
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/20 rounded-[24px] bg-muted/5 mt-6">
              <div className="w-20 h-20 rounded-[20px] bg-primary/10 flex items-center justify-center mb-6 shadow-inner border border-primary/20">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Sem Agentes Ativos</h3>
              <p className="text-base text-muted-foreground mb-8 max-w-md">
                Configure equipes de inteligência artificial para ler documentos, qualificar leads ou disparar mensagens de acompanhamento.
              </p>
              <Button onClick={handleCreateNew} size="lg" className="rounded-[12px] shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" /> Instanciar IA
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgentes.map((agente) => (
                <AgentesIACard
                  key={agente.id}
                  agente={agente}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeBaseSection />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysManager />
        </TabsContent>

        <TabsContent value="logs">
          <LogsMonitoramento />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {showNovoAgente && (
        <NovoAgenteForm
          agente={selectedAgente}
          onClose={handleCloseModal}
        />
      )}

      {showDetalhes && selectedAgente && (
        <DetalhesAgente
          agente={selectedAgente}
          onClose={handleCloseModal}
          onEdit={() => {
            setShowDetalhes(false);
            setShowNovoAgente(true);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => setConfirmDelete(prev => ({ ...prev, open: v }))}
        title="Excluir agente?"
        description={`Esta ação não pode ser desfeita. O agente "${confirmDelete.nome}" será removido permanentemente.`}
        onConfirm={() => {
          void deleteAgente(confirmDelete.id);
          setConfirmDelete({ open: false, id: '', nome: '' });
        }}
        destructive
      />
    </div>
  );
};

export default AgentesIAManager;





