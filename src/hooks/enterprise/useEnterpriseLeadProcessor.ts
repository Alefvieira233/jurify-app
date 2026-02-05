import { useState, useCallback } from 'react';
import { multiAgentSystem } from '@/lib/multiagents';
import { LeadData, Priority } from '@/lib/multiagents/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EnterpriseLeadData extends LeadData {
  validation_status?: 'pending' | 'valid' | 'invalid';
  processing_stage?: string;
  assigned_agents?: string[];
  estimated_completion?: Date;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone: string): boolean => {
  return /^\+?[\d\s()-]{10,}$/.test(phone);
};

export const validateLeadData = (leadData: EnterpriseLeadData): ValidationResult => {
  const errors: string[] = [];

  if (!leadData.name || leadData.name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!leadData.message || leadData.message.trim().length < 10) {
    errors.push('Mensagem deve ter pelo menos 10 caracteres');
  }

  if (leadData.email && !isValidEmail(leadData.email)) {
    errors.push('Email invalido');
  }

  if (leadData.phone && !isValidPhone(leadData.phone)) {
    errors.push('Telefone invalido');
  }

  if (!leadData.source) {
    errors.push('Fonte obrigatoria');
  }

  return { isValid: errors.length === 0, errors };
};

export const useEnterpriseLeadProcessor = (
  tenantId: string | null,
  isInitialized: boolean,
  onSuccess?: () => void
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processLead = useCallback(
    async (leadData: EnterpriseLeadData): Promise<boolean> => {
      if (!isInitialized) {
        toast({
          title: 'Sistema nao inicializado',
          description: 'Aguarde a inicializacao do sistema.',
          variant: 'destructive',
        });
        return false;
      }

      if (!tenantId) return false;

      setIsProcessing(true);

      try {
        const validationResult = validateLeadData(leadData);
        if (!validationResult.isValid) {
          throw new Error(`Dados invalidos: ${validationResult.errors.join(', ')}`);
        }

        console.log('[enterprise] Processing lead:', leadData);

        const { data: savedLead, error } = await supabase
          .from('leads')
          .insert({
            nome: leadData.name,
            email: leadData.email,
            telefone: leadData.phone,
            descricao: leadData.message,
            area_juridica: leadData.legal_area,
            origem: leadData.source,
            status: 'novo_lead',
            metadata: {
              ...leadData.metadata,
              validation_status: 'valid',
              processing_started: new Date().toISOString(),
              enterprise_processed: true,
              urgency: leadData.urgency || Priority.MEDIUM,
            },
            created_at: new Date().toISOString(),
            tenant_id: tenantId,
          })
          .select()
          .single();

        if (error) throw error;

        await multiAgentSystem.processLead(savedLead, leadData.message);

        toast({
          title: 'Lead processado',
          description: `Lead ${leadData.name} processado pelo sistema enterprise.`,
        });

        onSuccess?.();

        return true;
      } catch (error: unknown) {
        console.error('Failed to process lead:', error);
        const message = error instanceof Error ? error.message : 'Falha ao processar lead.';
        toast({
          title: 'Erro no processamento',
          description: message,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [isInitialized, tenantId, toast, onSuccess]
  );

  const runSystemTest = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);

    try {
      const testLead: EnterpriseLeadData = {
        name: 'Joao Silva (TESTE ENTERPRISE)',
        email: 'teste.enterprise@jurify.com',
        phone: '+5511999999999',
        message:
          'Teste do sistema enterprise multiagentes. Preciso de ajuda com processo trabalhista - demissao sem justa causa.',
        legal_area: 'trabalhista',
        urgency: Priority.MEDIUM,
        source: 'test',
        metadata: {
          test: true,
          test_type: 'enterprise_system_test',
          timestamp: new Date().toISOString(),
        },
      };

      const success = await processLead(testLead);

      if (success) {
        toast({
          title: 'Teste enterprise concluido',
          description: 'Sistema multiagentes enterprise funcionando perfeitamente.',
        });
      }

      return success;
    } catch (error) {
      console.error('Enterprise test failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [processLead, toast]);

  return {
    isProcessing,
    processLead,
    runSystemTest,
    validateLeadData,
  };
};
