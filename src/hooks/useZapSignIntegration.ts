
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ðŸš€ RETRY LOGIC COM EXPONENTIAL BACKOFF - TESLA/SPACEX GRADE
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`ðŸ”„ Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

interface ContractData {
  titulo?: string;
  descricao?: string;
  signatarios?: Array<{ nome: string; email: string; cpf?: string }>;
  [key: string]: unknown;
}

interface UseZapSignIntegrationReturn {
  isLoading: boolean;
  gerarLinkAssinatura: (contratoId: string, contractData: ContractData) => Promise<boolean>;
  verificarStatusAssinatura: (contratoId: string) => Promise<void>;
  enviarViaWhatsApp: (contratoId: string, telefone: string, nomeCliente: string, linkAssinatura: string) => Promise<boolean>;
}

export const useZapSignIntegration = (): UseZapSignIntegrationReturn => {
  const [isLoading, setIsLoading] = useState(false);

  const gerarLinkAssinatura = async (contratoId: string, contractData: ContractData): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke('zapsign-integration', {
          body: {
            action: 'create_document',
            contratoId,
            contractData
          }
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Erro ao gerar link');
        }

        return data;
      }, 3, 1000);

      toast.success('Link de assinatura gerado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao gerar link ZapSign apÃ³s 3 tentativas:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Erro ao gerar link: ");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verificarStatusAssinatura = async (contratoId: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('zapsign-integration', {
        body: {
          action: 'check_status',
          contratoId
        }
      });

      if (error) throw error;

      if (data.success) {
        console.log('Status atualizado:', data.status);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Erro ao verificar status: ");
    }
  };

  const enviarViaWhatsApp = async (
    contratoId: string, 
    telefone: string, 
    nomeCliente: string, 
    linkAssinatura: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await retryWithBackoff(async () => {
        const messageText = `Ola ${nomeCliente}, segue o link para assinatura do contrato ${contratoId}: ${linkAssinatura}`;
        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            to: telefone,
            text: messageText
          }
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Erro ao enviar via WhatsApp');
        }

        return data;
      }, 3, 1000);

      toast.success('Link enviado via WhatsApp com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao enviar via WhatsApp apÃ³s 3 tentativas:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Erro ao enviar: ");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    gerarLinkAssinatura,
    verificarStatusAssinatura,
    enviarViaWhatsApp
  };
};


