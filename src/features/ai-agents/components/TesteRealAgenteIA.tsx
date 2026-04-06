
import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLogActivity } from '@/hooks/useLogActivity';
import { useAgentesIA } from '@/hooks/useAgentesIA';
import { supabase } from '@/integrations/supabase/client';
import { AgentTestConfig } from './AgentTestConfig';
import { TestConversation } from './TestConversation';
import { TestResultsSummary } from './TestResultsSummary';

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
  const [userInput, setUserInput] = useState('Como elaborar um contrato de prestacao de servicos advocaticios?');
  const { toast } = useToast();
  const { logAgenteExecution, logError } = useLogActivity();
  const { agentes, loading: agentesLoading } = useAgentesIA();

  const addLog = (level: ExecutionLog['level'], message: string) => {
    const newLog: ExecutionLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      message,
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
        title: "Dados Incompletos",
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

    addLog('info', 'Iniciando execucao REAL do Agente IA via N8N...');
    addLog('info', `Agente: ${selectedAgent?.nome || 'Desconhecido'}`);
    addLog('info', `Input: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`);
    addLog('info', 'Chamando edge function n8n-webhook-forwarder...');

    const payload = {
      agentId: selectedAgentId,
      prompt: userInput,
      parameters: { temperature: 0.7, top_p: 1, frequency_penalty: 0, presence_penalty: 0 },
    };

    addLog('info', `Payload preparado com ${Object.keys(payload).length} propriedades`);

    try {
      addLog('info', 'Enviando via Supabase Edge Function...');

      const { data, error } = await supabase.functions.invoke('n8n-webhook-forwarder', { body: payload });

      const duration = Date.now() - startTime;
      addLog('info', `Tempo total: ${duration}ms`);

      if (error) throw new Error(`Edge Function Error: ${error.message}`);
      if (!data) throw new Error('Resposta vazia da edge function');

      addLog('info', 'Resposta recebida');
      addLog('info', `Status: ${data.success ? 'Sucesso' : 'Erro'}`);
      if (data.status) addLog('info', `HTTP Status N8N: ${data.status}`);
      if (data.log_id) addLog('info', `Log ID: ${data.log_id}`);

      if (data.success && data.response) {
        addLog('success', 'Resposta do agente IA recebida com sucesso!');

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
          webhook_url: data.webhook_url,
        });

        if (selectedAgent) logAgenteExecution(selectedAgent.nome, 'sucesso', duration);
        toast({ title: "Teste Executado!", description: `Agente IA respondeu em ${duration}ms via N8N` });
      } else {
        const errorMessage = data.error || 'Erro desconhecido na execucao';
        addLog('error', `Erro: ${errorMessage}`);

        setResult({
          success: false,
          error: errorMessage,
          executionTime: duration,
          source: 'n8n_edge_function',
          log_id: data.log_id,
          agente_nome: selectedAgent?.nome,
          status: data.status,
          webhook_url: data.webhook_url,
        });

        if (selectedAgent) logAgenteExecution(selectedAgent.nome, 'erro', duration);
        toast({ title: "Erro na Execucao", description: errorMessage, variant: "destructive" });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      const duration = Date.now() - startTime;

      addLog('error', `ERRO CRITICO: ${message}`);

      setResult({
        success: false,
        error: message,
        executionTime: duration,
        source: 'n8n_edge_function',
        agente_nome: selectedAgent?.nome,
      });

      logError('Agentes IA', 'Falha critica na execucao via N8N', {
        agenteId: selectedAgentId,
        agenteName: selectedAgent?.nome,
        error: message,
        input: userInput.substring(0, 100),
        executionTime: duration,
      });

      toast({
        title: "Erro Critico",
        description: `Falha na comunicacao: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
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
      <AgentTestConfig
        agentes={agentes}
        selectedAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
        userInput={userInput}
        onChangeInput={setUserInput}
        isExecuting={isExecuting}
        onExecute={() => { void executeRealTest(); }}
        onClear={clearLogs}
      />

      <TestConversation logs={executionLogs} isExecuting={isExecuting} />

      {result && <TestResultsSummary result={result} />}

      {/* Execution Flow Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Fluxo de Execucao</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm space-y-2">
          <p>&bull; <strong>1. Frontend:</strong> Envia payload com agentId, prompt e parametros</p>
          <p>&bull; <strong>2. Edge Function:</strong> n8n-webhook-forwarder processa e valida dados</p>
          <p>&bull; <strong>3. N8N Webhook:</strong> Recebe POST no endpoint de producao</p>
          <p>&bull; <strong>4. OpenAI API:</strong> N8N processa via ChatGPT</p>
          <p>&bull; <strong>5. Resposta:</strong> JSON retorna com conteudo da IA</p>
          <p>&bull; <strong>6. Logs:</strong> Tudo registrado na tabela logs_execucao_agentes</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteRealAgenteIA;
