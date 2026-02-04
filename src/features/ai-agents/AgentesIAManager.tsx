import React, { useState } from 'react';
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
import { useAgentesIA } from '@/hooks/useAgentesIA';
import { useAgentesMetrics } from '@/hooks/useAgentesMetrics';
import NovoAgenteForm from '@/components/NovoAgenteForm';
import DetalhesAgente from '@/components/DetalhesAgente';
import ApiKeysManager from '@/components/ApiKeysManager';
import LogsMonitoramento from '@/components/LogsMonitoramento';

// Monitoring
import { trackUserAction } from '@/utils/monitoring';
import { useAuth } from '@/contexts/AuthContext';

const AgentesIAManager = () => {
  const [showNovoAgente, setShowNovoAgente] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState<AgenteIA | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const { agentes, loading, error, isEmpty, updateAgente, fetchAgentes } = useAgentesIA();
  const { metrics, loading: metricsLoading, ultimaExecucaoFormatada } = useAgentesMetrics();

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
    console.log(`Alterando status do agente ${agente.nome} para ${statusLabel}`);

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
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Agentes de IA</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Gerencie seus assistentes inteligentes</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-300" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Total</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{totalAgentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-emerald-500/15 border border-emerald-400/30 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Ativos</p>
                <p className="text-2xl font-bold text-emerald-200">{agentesAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-500/15 border border-blue-400/30 rounded-full flex items-center justify-center">
                📊
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Execuções Hoje</p>
                <p className="text-2xl font-bold text-blue-300">
                  {metricsLoading ? '...' : metrics.execucoesHoje}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-500/15 border border-orange-400/30 rounded-full flex items-center justify-center">
                ⏰
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Última Execução</p>
                <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                  {metricsLoading ? '...' : ultimaExecucaoFormatada}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      {!metricsLoading && metrics.execucoesMes > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Execuções do Mês</p>
                  <p className="text-2xl font-bold text-purple-200">{metrics.execucoesMes}</p>
                </div>
                <div className="h-8 w-8 bg-purple-500/15 border border-purple-400/30 rounded-full flex items-center justify-center">
                  📈
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-emerald-200">{metrics.sucessoRate}%</p>
                </div>
                <div className="h-8 w-8 bg-emerald-500/15 border border-emerald-400/30 rounded-full flex items-center justify-center">
                  ✅
                </div>
              </div>
            </CardContent>
          </Card>

          {metrics.agenteMaisAtivo && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Mais Ativo</p>
                    <p className="text-lg font-bold text-amber-200 truncate">
                      {metrics.agenteMaisAtivo}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-amber-500/15 border border-amber-400/30 rounded-full flex items-center justify-center">
                    🏆
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="agentes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
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
            <Card>
              <CardContent className="p-12 text-center">
                <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                  Nenhum agente encontrado
                </h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                  Crie seu primeiro agente de IA para comecar a automatizar processos juridicos.
                </p>
                <Button onClick={handleCreateNew} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Agente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgentes.map((agente) => (
                <AgentesIACard
                  key={agente.id}
                  agente={agente}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}
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
    </div>
  );
};

export default AgentesIAManager;





