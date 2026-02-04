
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Brain, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLogActivity } from '@/hooks/useLogActivity';
import { useAgentesIA } from '@/hooks/useAgentesIA';
import { supabase } from '@/integrations/supabase/client';

interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface ExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  executionTime: number;
  source: 'n8n_edge_function';
  log_id?: string;
  agente_nome?: string;
  status?: number;
  webhook_url?: string;
}

const TesteRealAgenteIA = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('Como elaborar um contrato de prestação de serviços advocatícios?');
  const { toast } = useToast();
  const { logAgenteExecution, logError } = useLogActivity();
  const { agentes, loading: agentesLoading } = useAgentesIA();

  const addLog = (level: ExecutionLog['level'], message: string) => {
    const newLog: ExecutionLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      message
    };
    setExecutionLogs(prev => [...prev, newLog]);
  };

  const clearLogs = () => {
    setExecutionLogs([]);
    setResult(null);
  };

  const executeRealTest = async () => {
    if (!selectedAgentId || !userInput.trim()) {
      toast({
        title: "❌ Dados Incompletos",
        description: "Selecione um agente e insira um prompt para testar.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setResult(null);
    clearLogs();
    
    const startTime = Date.now();
    const selectedAgent = agentes.find(a => a.id === selectedAgentId);
    
    addLog('info', '🤖 Iniciando execução REAL do Agente IA via N8N...');
    addLog('info', `🎯 Agente: ${selectedAgent?.nome || 'Desconhecido'}`);
    addLog('info', `📝 Input: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`);
    addLog('info', '🔗 Chamando edge function n8n-webhook-forwarder...');

    const payload = {
      agentId: selectedAgentId,
      prompt: userInput,
      parameters: {
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
    };

    addLog('info', `📦 Payload preparado com ${Object.keys(payload).length} propriedades`);

    try {
      addLog('info', '🚀 Enviando via Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('n8n-webhook-forwarder', {
        body: payload
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      addLog('info', `⏱️ Tempo total: ${duration}ms`);

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      if (!data) {
        throw new Error('Resposta vazia da edge function');
      }

      addLog('info', `📥 Resposta recebida`);
      addLog('info', `✅ Status: ${data.success ? 'Sucesso' : 'Erro'}`);
      
      if (data.status) {
        addLog('info', `📊 HTTP Status N8N: ${data.status}`);
      }

      if (data.log_id) {
        addLog('info', `📋 Log ID: ${data.log_id}`);
      }

      if (data.success && data.response) {
        addLog('success', '🎉 Resposta do agente IA recebida com sucesso!');
        
        let aiResponse = '';
        if (typeof data.response === 'string') {
          aiResponse = data.response;
        } else if (data.response.message) {
          aiResponse = data.response.message;
        } else if (data.response.raw_response) {
          aiResponse = data.response.raw_response;
        } else {
          aiResponse = JSON.stringify(data.response, null, 2);
        }

        setResult({
          success: true,
          response: aiResponse,
          executionTime: duration,
          source: 'n8n_edge_function',
          log_id: data.log_id,
          agente_nome: selectedAgent?.nome,
          status: data.status,
          webhook_url: data.webhook_url
        });

        if (selectedAgent) {
          logAgenteExecution(selectedAgent.nome, 'sucesso', duration);
        }

        toast({
          title: "✅ Teste Executado!",
          description: `Agente IA respondeu em ${duration}ms via N8N`,
        });

      } else {
        const errorMessage = data.error || 'Erro desconhecido na execução';
        addLog('error', `❌ Erro: ${errorMessage}`);
        
        setResult({
          success: false,
          error: errorMessage,
          executionTime: duration,
          source: 'n8n_edge_function',
          log_id: data.log_id,
          agente_nome: selectedAgent?.nome,
          status: data.status,
          webhook_url: data.webhook_url
        });

        if (selectedAgent) {
          logAgenteExecution(selectedAgent.nome, 'erro', duration);
        }

        toast({
          title: "❌ Erro na Execução",
          description: errorMessage,
          variant: "destructive",
        });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      const endTime = Date.now();
      const duration = endTime - startTime;

      addLog('error', `❌ ERRO CRÍTICO: \${message}`);
      
      setResult({
        success: false,
        error: message,
        executionTime: duration,
        source: 'n8n_edge_function',
        agente_nome: selectedAgent?.nome
      });

      logError('Agentes IA', 'Falha crítica na execução via N8N', {
        agenteId: selectedAgentId,
        agenteName: selectedAgent?.nome,
        error: message,
        input: userInput.substring(0, 100),
        executionTime: duration
      });

      toast({
        title: "❌ Erro Crítico",
        description: `Falha na comunicação: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getLogIcon = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  if (agentesLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-8">
            <div className="text-center">
              <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-purple-900 mb-2">Carregando Agentes IA</h3>
              <p className="text-purple-700">Aguarde, carregando lista de agentes...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-purple-900">🚀 Teste Real - Agente IA + N8N</CardTitle>
                <CardDescription className="text-purple-700">
                  Execução completa via edge function → N8N → OpenAI → resposta
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                disabled={isExecuting}
              >
                Limpar
              </Button>
              <Button
                onClick={() => { void executeRealTest(); }}
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
                    🚀 EXECUTAR TESTE REAL
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Seleção do Agente */}
            <div>
              <label className="block text-sm font-medium mb-2">Agente IA:</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder={agentes.length === 0 ? "Nenhum agente disponível" : "Selecione um agente..."} />
                </SelectTrigger>
                <SelectContent>
                  {agentes.map((agente) => (
                    <SelectItem key={agente.id} value={agente.id}>
                      <div className="flex items-center space-x-2">
                        <Badge className={agente.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {agente.status === 'ativo' ? 'ativo' : 'inativo'}
                        </Badge>
                        <span>{agente.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detalhes do Agente */}
            {selectedAgentId && (
              <div className="bg-white p-3 rounded border">
                {(() => {
                  const agente = agentes.find(a => a.id === selectedAgentId);
                  return agente ? (
                    <div className="text-sm">
                      <div className="font-semibold text-purple-900 mb-1">📋 {agente.nome}</div>
                      <div className="text-gray-600">{agente.area_juridica}</div>
                      <div className="text-xs text-gray-500 mt-1">{agente.descricao_funcao}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Agente não encontrado</div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Input do Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">Prompt para o Agente:</label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              rows={3}
              className="w-full"
            />
          </div>

          {/* Informação do Sistema */}
          <div className="mt-4 p-3 bg-blue-50 rounded border">
            <div className="text-sm">
              <div className="font-medium text-blue-900">🎯 Sistema de Produção:</div>
              <div className="text-blue-700">Edge Function → N8N Webhook → OpenAI API → Resposta</div>
              <div className="text-xs text-blue-600 mt-1">
                {agentes.length === 0 
                  ? "⚠️ Nenhum agente cadastrado. Crie um agente primeiro." 
                  : `✅ ${agentes.length} agente(s) disponível(is)`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs de Execução */}
      {executionLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Logs de Execução em Tempo Real</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
              {executionLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-2 mb-1">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={getLogColor(log.level)}>
                    {getLogIcon(log.level)} {log.message}
                  </span>
                </div>
              ))}
              {isExecuting && (
                <div className="flex items-center space-x-2 animate-pulse">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString('pt-BR')}]</span>
                  <span className="text-yellow-400">⏳ Aguardando resposta do N8N...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span>Resultado da Execução</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.executionTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Tempo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.status || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">HTTP Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    N8N
                  </div>
                  <div className="text-sm text-gray-600">Fonte</div>
                </div>
              </div>

              {/* Resposta da IA */}
              {result.success && result.response && (
                <div>
                  <h4 className="font-semibold mb-2 text-green-900">🤖 Resposta do Agente IA:</h4>
                  <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{result.response}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detalhes do Erro */}
              {!result.success && result.error && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-900">❌ Erro Detalhado:</h4>
                  <div className="bg-red-100 p-4 rounded border border-red-200">
                    <p className="text-red-800 font-mono text-sm">{result.error}</p>
                  </div>
                </div>
              )}

              {/* Informações Técnicas */}
              <div className="text-xs text-gray-500 space-y-1">
                {result.log_id && <div>Log ID: {result.log_id}</div>}
                {result.webhook_url && <div>Webhook: {result.webhook_url}</div>}
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Fluxo de Execução</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm space-y-2">
          <p>• <strong>1. Frontend:</strong> Envia payload com agentId, prompt e parâmetros</p>
          <p>• <strong>2. Edge Function:</strong> n8n-webhook-forwarder processa e valida dados</p>
          <p>• <strong>3. N8N Webhook:</strong> Recebe POST no endpoint de produção</p>
          <p>• <strong>4. OpenAI API:</strong> N8N processa via ChatGPT</p>
          <p>• <strong>5. Resposta:</strong> JSON retorna com conteúdo da IA</p>
          <p>• <strong>6. Logs:</strong> Tudo registrado na tabela logs_execucao_agentes</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteRealAgenteIA;

