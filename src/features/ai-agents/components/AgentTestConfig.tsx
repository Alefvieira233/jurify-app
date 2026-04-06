import React from 'react';
import { Brain, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Agente {
  id: string;
  nome: string;
  status: string | null;
  area_juridica: string | null;
  descricao_funcao: string | null;
}

interface AgentTestConfigProps {
  agentes: Agente[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  userInput: string;
  onChangeInput: (value: string) => void;
  isExecuting: boolean;
  onExecute: () => void;
  onClear: () => void;
}

export const AgentTestConfig: React.FC<AgentTestConfigProps> = ({
  agentes,
  selectedAgentId,
  onSelectAgent,
  userInput,
  onChangeInput,
  isExecuting,
  onExecute,
  onClear,
}) => {
  return (
    <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-purple-900 dark:text-purple-300">Teste Real - Agente IA + N8N</CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-400">
                Execucao completa via edge function &rarr; N8N &rarr; OpenAI &rarr; resposta
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={onClear} variant="outline" size="sm" disabled={isExecuting}>
              Limpar
            </Button>
            <Button
              onClick={onExecute}
              disabled={isExecuting || !selectedAgentId || !userInput.trim() || agentes.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isExecuting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  EXECUTAR TESTE REAL
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Agente IA:</label>
            <Select value={selectedAgentId} onValueChange={onSelectAgent}>
              <SelectTrigger>
                <SelectValue placeholder={agentes.length === 0 ? "Nenhum agente disponivel" : "Selecione um agente..."} />
              </SelectTrigger>
              <SelectContent>
                {agentes.map((agente) => (
                  <SelectItem key={agente.id} value={agente.id}>
                    <div className="flex items-center space-x-2">
                      <Badge className={agente.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'}>
                        {agente.status === 'ativo' ? 'ativo' : 'inativo'}
                      </Badge>
                      <span>{agente.nome}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgentId && (() => {
            const agente = agentes.find(a => a.id === selectedAgentId);
            return agente ? (
              <div className="bg-card p-3 rounded border">
                <div className="text-sm">
                  <div className="font-semibold text-purple-900 dark:text-purple-300 mb-1">{agente.nome}</div>
                  <div className="text-muted-foreground">{agente.area_juridica}</div>
                  <div className="text-xs text-muted-foreground mt-1">{agente.descricao_funcao}</div>
                </div>
              </div>
            ) : (
              <div className="bg-card p-3 rounded border">
                <div className="text-sm text-muted-foreground">Agente nao encontrado</div>
              </div>
            );
          })()}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Prompt para o Agente:</label>
          <Textarea
            value={userInput}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            rows={3}
            className="w-full"
          />
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border dark:border-blue-800">
          <div className="text-sm">
            <div className="font-medium text-blue-900 dark:text-blue-300">Sistema de Producao:</div>
            <div className="text-blue-700 dark:text-blue-400">Edge Function &rarr; N8N Webhook &rarr; OpenAI API &rarr; Resposta</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {agentes.length === 0
                ? "Nenhum agente cadastrado. Crie um agente primeiro."
                : `${agentes.length} agente(s) disponivel(is)`
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
