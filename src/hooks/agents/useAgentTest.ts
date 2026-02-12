import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { multiAgentSystem } from '@/lib/multiagents';

export const useAgentTest = (tenantId: string | null) => {
  const { toast } = useToast();

  const testAgent = useCallback(async (_agentId: string, testMessage: string): Promise<string> => {
    try {
      const testLeadId = `test_${Date.now()}`;
      
      const testLead = {
        id: testLeadId,
        name: 'Lead de Teste',
        message: testMessage,
        source: 'chat' as const,
        tenantId: tenantId || undefined,
      };
      
      const result = await multiAgentSystem.processLead(testLead, testMessage, 'chat');
      
      return result?.finalResult?.toString() || 'Teste processado com sucesso pelo sistema multiagentes.';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao testar agente';
      toast({
        title: 'Erro no teste',
        description: errorMessage,
        variant: 'destructive',
      });
      return 'Erro ao processar teste';
    }
  }, [tenantId, toast]);

  return { testAgent };
};
