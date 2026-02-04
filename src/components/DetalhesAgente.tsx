import type { FC } from 'react';
import {
  Edit,
  Bot,
  Clock,
  Tag,
  FileText,
  Settings,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import EnhancedAIChat from '@/features/ai-agents/EnhancedAIChat';
import type { AgenteIA } from '@/hooks/useAgentesIA';

interface DetalhesAgenteProps {
  agente: AgenteIA;
  onClose: () => void;
  onEdit: () => void;
}

type ParametrosAvancados = {
  temperatura?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
};

const DetalhesAgente: FC<DetalhesAgenteProps> = ({ agente, onClose, onEdit }) => {

  const tiposAgente = [
    { value: 'chat_interno', label: 'Chat Interno', icon: Bot },
    { value: 'analise_dados', label: 'Analise de Dados', icon: Eye },
    { value: 'api_externa', label: 'API Externa', icon: Settings }
  ];

  const defaultTipo = tiposAgente[0];

  const getTipoAgenteInfo = (tipo: string) => {
    return tiposAgente.find(t => t.value === tipo) ?? defaultTipo;
  };

  const tipoInfo = getTipoAgenteInfo(agente.tipo_agente ?? defaultTipo.value);
  const rawParametros = agente.parametros_avancados ?? {};
  const parametros: ParametrosAvancados = {
    temperatura: typeof rawParametros.temperatura === 'number' ? rawParametros.temperatura : undefined,
    top_p: typeof rawParametros.top_p === 'number' ? rawParametros.top_p : undefined,
    frequency_penalty: typeof rawParametros.frequency_penalty === 'number' ? rawParametros.frequency_penalty : undefined,
    presence_penalty: typeof rawParametros.presence_penalty === 'number' ? rawParametros.presence_penalty : undefined,
  };
  const agenteAtivo = agente.status === 'ativo';
  const perguntas = agente.perguntas_qualificacao ?? [];
  const TipoIcon = tipoInfo.icon;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${agenteAtivo ? 'bg-emerald-500/15 border border-emerald-400/30' : 'bg-[hsl(var(--muted))]'}`}>
                <Bot className={`h-5 w-5 ${agenteAtivo ? 'text-emerald-200' : 'text-gray-400'}`} />
              </div>
              <div>
                <DialogTitle className="text-xl">{agente.nome}</DialogTitle>
                <DialogDescription className="flex items-center space-x-2">
                  <TipoIcon className="h-4 w-4" />
                  <span>{tipoInfo.label}</span>
                  <span>•</span>
                  <span>{agente.area_juridica}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={agenteAtivo ? 'default' : 'secondary'}
                className={agenteAtivo ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}
              >
                {agenteAtivo ? 'Ativo' : 'Inativo'}
              </Badge>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
            <TabsTrigger value="prompts">Prompts & IA</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
            <TabsTrigger value="teste">Teste</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            {/* General Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Descrição da Função
                  </h4>
                  <p className="text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-1))] p-3 rounded border border-[hsl(var(--border))]">
                    {agente.descricao_funcao || 'Não informado'}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Área Jurídica
                  </h4>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-400/30">
                    {agente.area_juridica}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Configurações
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Delay de Resposta:</span>
                      <span className="font-medium">{agente.delay_resposta}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Tipo:</span>
                      <span className="font-medium">{tipoInfo.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
                      <Badge
                        variant={agenteAtivo ? 'default' : 'secondary'}
                        className={agenteAtivo ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}
                      >
                        {agenteAtivo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">Objetivo</h4>
                  <div className="text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-1))] p-3 rounded border border-[hsl(var(--border))] text-sm">
                    {agente.objetivo || 'Não configurado'}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">Script de Saudação</h4>
                  <div className="text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-1))] p-3 rounded border border-[hsl(var(--border))] text-sm">
                    {agente.script_saudacao || 'Não configurado'}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

                    <TabsContent value="prompts" className="space-y-6">
            {/* Prompts & IA */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">Prompt Base</h4>
                <div className="text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-1))] p-4 rounded border border-[hsl(var(--border))] text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {agente.prompt_base || 'Nao configurado'}
                </div>
              </div>

              {perguntas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">Perguntas de Qualificacao</h4>
                  <div className="space-y-2">
                    {perguntas.map((pergunta: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-300 font-semibold">{index + 1}.</span>
                        <span className="text-[hsl(var(--muted-foreground))]">{pergunta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agente.keywords_acao && agente.keywords_acao.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">Keywords de Acao</h4>
                  <div className="flex flex-wrap gap-2">
                    {agente.keywords_acao.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-400/30">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="parametros" className="space-y-6">
            {/* Parameters */}
            <div className="bg-[hsl(var(--surface-1))] p-4 rounded-lg">
              <h4 className="font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Parâmetros Avançados da IA
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Temperatura</label>
                  <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {parametros.temperatura || 0.7}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Controla a criatividade das respostas</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Top P</label>
                  <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {parametros.top_p || 0.9}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Diversidade do vocabulário</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Frequency Penalty</label>
                  <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {parametros.frequency_penalty || 0}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Penaliza repetições frequentes</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Presence Penalty</label>
                  <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {parametros.presence_penalty || 0}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Encoraja novos tópicos</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teste" className="space-y-6">
            <EnhancedAIChat
              agentId={agente.id}
              agentName={agente.nome}
              agentArea={agente.area_juridica}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DetalhesAgente;









