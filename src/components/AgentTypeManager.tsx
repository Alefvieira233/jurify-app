/**
 * 🚀 JURIFY AGENT TYPE MANAGER - SPACEX GRADE
 * 
 * Interface para criação e gerenciamento dos 3 tipos de agentes:
 * SDR, Closer e Customer Success
 * 
 * @author SpaceX Dev Team
 * @version 1.0.0
 */

import { useState } from 'react';
import {
  Bot,
  Target,
  Handshake,
  Users,
  Plus,
  Settings,
  CheckCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentEngine } from '@/hooks/useAgentEngine';
import { AgentType } from '@/lib/agents/AgentEngine';
import NovoAgenteForm from './NovoAgenteForm';

// 🎯 CONFIGURAÇÕES DOS TIPOS DE AGENTES
const AGENT_TYPES = {
  [AgentType.SDR]: {
    icon: Target,
    name: 'SDR Agent',
    title: 'Sales Development Representative',
    description: 'Especialista em qualificação de leads e identificação de oportunidades',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    features: [
      'Qualificação automática de leads',
      'Perguntas inteligentes por área jurídica',
      'Identificação de urgência e valor',
      'Escalação automática para Closer',
      'Análise de potencial de conversão'
    ],
    defaultPrompt: `Você é um especialista em qualificação de leads jurídicos. Seu objetivo é:

1. Identificar a necessidade jurídica específica
2. Avaliar a urgência da situação
3. Determinar o orçamento disponível
4. Qualificar se é uma oportunidade real
5. Encaminhar leads qualificados para o Closer

Seja profissional, empático e faça perguntas estratégicas para entender completamente a situação do cliente.`,
    keywords: ['interessado', 'orçamento', 'proposta', 'contratar', 'urgente', 'preciso']
  },

  [AgentType.CLOSER]: {
    icon: Handshake,
    name: 'Closer Agent',
    title: 'Especialista em Fechamento',
    description: 'Focado em converter leads qualificados em clientes pagantes',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    features: [
      'Apresentação de propostas personalizadas',
      'Negociação de valores e condições',
      'Superação de objeções',
      'Fechamento de contratos',
      'Criação de urgência apropriada'
    ],
    defaultPrompt: `Você é um especialista em fechamento de negócios jurídicos. Seu objetivo é:

1. Apresentar propostas personalizadas e atrativas
2. Negociar valores e condições de pagamento
3. Superar objeções com argumentos sólidos
4. Criar urgência apropriada para decisão
5. Fechar contratos e encaminhar para CS

Use técnicas de vendas consultivas, mostre valor e ROI, e facilite o processo de contratação.`,
    keywords: ['assinado', 'contrato', 'aceito', 'fechado', 'aprovado', 'vamos']
  },

  [AgentType.CS]: {
    icon: Users,
    name: 'Customer Success',
    title: 'Especialista em Sucesso do Cliente',
    description: 'Garante satisfação e identifica oportunidades de expansão',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    features: [
      'Onboarding eficiente de novos clientes',
      'Acompanhamento de casos em andamento',
      'Identificação de oportunidades de upsell',
      'Garantia de satisfação e retenção',
      'Suporte proativo e resolução de problemas'
    ],
    defaultPrompt: `Você é um especialista em sucesso do cliente jurídico. Seu objetivo é:

1. Realizar onboarding eficiente de novos clientes
2. Acompanhar o progresso dos casos
3. Antecipar necessidades e resolver problemas
4. Identificar oportunidades de novos serviços
5. Garantir satisfação e renovação

Seja proativo, atencioso e focado no sucesso do cliente a longo prazo.`,
    keywords: ['satisfeito', 'renovar', 'novo serviço', 'recomendação', 'feedback']
  }
};

const AgentTypeManager = () => {
  const [selectedType, setSelectedType] = useState<AgentType>(AgentType.SDR);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { getAgentsByType } = useAgentEngine();

  type AgentTypeConfig = (typeof AGENT_TYPES)[AgentType];
  const agentEntries = Object.entries(AGENT_TYPES) as Array<[AgentType, AgentTypeConfig]>;

  const agentTypeConfig = AGENT_TYPES[selectedType];
  const agentsOfType = getAgentsByType(selectedType);

  const handleCreateAgent = () => {
    setShowCreateForm(true);
  };

  const getAgentTypeStats = (type: AgentType) => {
    const typeAgents = getAgentsByType(type);
    return {
      total: typeAgents.length,
      active: typeAgents.filter(a => a.active).length,
      inactive: typeAgents.filter(a => !a.active).length
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipos de Agentes IA</h1>
          <p className="text-gray-600">Gerencie seus agentes especializados: SDR, Closer e Customer Success</p>
        </div>
        <Button onClick={handleCreateAgent} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Criar Agente
        </Button>
      </div>

      {/* Cards de Tipos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agentEntries.map(([type, config]) => {
          const stats = getAgentTypeStats(type);
          const IconComponent = config.icon;

          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedType === type ? `ring-2 ring-blue-500 ${config.bgColor}` : ''
                }`}
              onClick={() => setSelectedType(type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${config.color} text-white`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className={config.textColor}>
                    {stats.active}/{stats.total} Ativos
                  </Badge>
                </div>
                <CardTitle className="text-lg">{config.name}</CardTitle>
                <p className="text-sm text-gray-600">{config.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total de Agentes:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Agentes Ativos:</span>
                    <span className="font-medium text-green-600">{stats.active}</span>
                  </div>
                  {stats.inactive > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Inativos:</span>
                      <span className="font-medium text-gray-500">{stats.inactive}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detalhes do Tipo Selecionado */}
      <Card className={`${agentTypeConfig.borderColor} border-2`}>
        <CardHeader className={agentTypeConfig.bgColor}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${agentTypeConfig.color} text-white`}>
              <agentTypeConfig.icon className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl">{agentTypeConfig.title}</CardTitle>
              <p className="text-gray-600">{agentTypeConfig.description}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="features">Funcionalidades</TabsTrigger>
              <TabsTrigger value="agents">Agentes ({agentsOfType.length})</TabsTrigger>
              <TabsTrigger value="config">Configuração</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Objetivo Principal</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {agentTypeConfig.description}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Estatísticas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Agentes Criados:</span>
                      <Badge variant="outline">{agentsOfType.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Agentes Ativos:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {agentsOfType.filter(a => a.active).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Ativação:</span>
                      <span className="font-medium">
                        {agentsOfType.length > 0
                          ? Math.round((agentsOfType.filter(a => a.active).length / agentsOfType.length) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <h3 className="text-lg font-semibold">Funcionalidades Principais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentTypeConfig.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-2">Palavras-chave de Escalação</h4>
                <div className="flex flex-wrap gap-2">
                  {agentTypeConfig.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Agentes {agentTypeConfig.name} ({agentsOfType.length})
                </h3>
                <Button
                  onClick={handleCreateAgent}
                  size="sm"
                  className={agentTypeConfig.color}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo {agentTypeConfig.name}
                </Button>
              </div>

              {agentsOfType.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="p-8 text-center">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum agente {agentTypeConfig.name} criado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Crie seu primeiro agente {agentTypeConfig.name} para começar a automatizar {
                        selectedType === AgentType.SDR ? 'a qualificação de leads' :
                          selectedType === AgentType.CLOSER ? 'o fechamento de negócios' :
                            'o sucesso dos clientes'
                      }.
                    </p>
                    <Button onClick={handleCreateAgent} className={agentTypeConfig.color}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Agente
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentsOfType.map((agent) => (
                    <Card key={agent.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{agent.name}</h4>
                            <p className="text-sm text-gray-600">{agent.area_juridica}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge
                                variant={agent.active ? "default" : "secondary"}
                                className={agent.active ? "bg-green-100 text-green-800" : ""}
                              >
                                {agent.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {agent.specialization.join(', ')}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Prompt Base Recomendado</h3>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700">
                        {agentTypeConfig.defaultPrompt}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Configurações Recomendadas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Personalidade</h4>
                        <p className="text-sm text-gray-600">
                          {selectedType === AgentType.SDR && "Curioso, analítico e orientado a resultados"}
                          {selectedType === AgentType.CLOSER && "Persuasivo, confiante e focado em soluções"}
                          {selectedType === AgentType.CS && "Empático, proativo e orientado ao cliente"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Máximo de Interações</h4>
                        <p className="text-sm text-gray-600">
                          {selectedType === AgentType.SDR && "15-20 mensagens para qualificação completa"}
                          {selectedType === AgentType.CLOSER && "10-15 mensagens para apresentar proposta"}
                          {selectedType === AgentType.CS && "Ilimitado para suporte contínuo"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Dica de Configuração</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Para melhores resultados, personalize o prompt base com informações específicas
                        da sua área de atuação e estilo de atendimento preferido.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      {showCreateForm && (
        <NovoAgenteForm
          agente={null}
          defaultType={selectedType}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default AgentTypeManager;
