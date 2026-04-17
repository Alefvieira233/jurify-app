/**
 * AGENTS PLAYGROUND - TESTE DE AGENTES EM TEMPO REAL
 *
 * Interface para testar o sistema multiagentes com mensagens customizadas.
 * Permite validar a inteligencia dos agentes antes de liberar para producao.
 *
 * @version 1.1.0
 */

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { multiAgentSystem } from '@/lib/multiagents';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PlaygroundExamples, PlaygroundInput, PlaygroundResults } from '@/features/agents';
import type { ExecutionResult } from '@/features/agents/components/PlaygroundResults';

export default function AgentsPlayground() {
  usePageTitle('Playground');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLoadExample = (exampleText: string) => {
    setMessage(exampleText);
    setResult(null);
  };

  const handleProcessMessage = async () => {
    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite uma mensagem para processar.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Nao autenticado',
        description: 'Voce precisa estar logado para testar os agentes.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const startTime = Date.now();

    try {
      // Inicializar o sistema se necessario
      if (!(multiAgentSystem as unknown as Record<string, unknown>)['initialized']) {
        multiAgentSystem.initialize();
      }

      // Criar lead de teste
      const testLead = {
        id: `test_${Date.now()}`,
        name: 'Lead de Teste - Playground',
        email: 'teste@playground.jurify.com',
        phone: '(00) 00000-0000',
        message: message,
        source: 'playground' as const,
        tenantId: user.id
      };

      // Processar com o sistema multiagentes
      const agentResult = await multiAgentSystem.processLead(
        testLead,
        message,
        'playground'
      );

      const executionTime = Date.now() - startTime;

      // Verificar se agentResult existe
      if (!agentResult) {
        throw new Error(
          'Sistema multiagentes nao retornou resultado. ' +
          'Possivel problema: o metodo processLead() retorna Promise<void> em vez de um objeto com dados.'
        );
      }

      setResult({
        success: true,
        executionId: agentResult.executionId || `exec_${Date.now()}`,
        qualificationResult: agentResult.qualificationResult || undefined,
        legalValidation: agentResult.legalValidation || undefined,
        proposal: agentResult.proposal || undefined,
        formattedMessages: agentResult.formattedMessages || null,
        finalResult: agentResult.finalResult || null,
        executionTime,
        totalTokens: agentResult.totalTokens || 0,
        estimatedCost: agentResult.estimatedCost || 0
      });

      toast({
        title: 'Processamento concluido!',
        description: `Executado em ${(executionTime / 1000).toFixed(2)}s`,
      });

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

      setResult({
        success: false,
        error: errorMsg,
        executionTime
      });

      toast({
        title: 'Erro no processamento',
        description: toUserMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          Playground de Agentes IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Teste o sistema multiagentes com mensagens customizadas em tempo real
        </p>
      </div>

      <PlaygroundExamples onLoadExample={handleLoadExample} loading={loading} />

      <PlaygroundInput
        message={message}
        onMessageChange={setMessage}
        loading={loading}
        onProcess={() => void handleProcessMessage()}
        hasResult={!!result}
        showRawJson={showRawJson}
        onToggleJson={() => setShowRawJson(!showRawJson)}
      />

      {result && (
        <PlaygroundResults result={result} showRawJson={showRawJson} />
      )}
    </div>
  );
}
