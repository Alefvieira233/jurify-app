import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('useWhatsAppActions');

/**
 * Hook centralizado para ações WhatsApp avançadas:
 * - typing indicator
 * - send list (interactive)
 * - send interactive buttons
 * - reply quoted (via send-whatsapp-message já existente)
 */
export function useWhatsAppActions() {
  const { toast } = useToast();

  /** Mostra "digitando..." pro cliente. Fire-and-forget (não bloqueia UI). */
  const sendTyping = useCallback(async (conversationId: string) => {
    try {
      await supabase.functions.invoke('whatsapp-typing', { body: { conversationId } });
    } catch (err) {
      log.warn('typing failed (non-critical)', { error: String(err) });
    }
  }, []);

  const sendList = useMutation({
    mutationFn: async (payload: {
      to: string;
      body: string;
      buttonText: string;
      sections: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>;
      header?: string;
      footer?: string;
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-list', { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao enviar lista');
      return data as { messageId: string };
    },
    onSuccess: () => toast({ title: 'Lista enviada' }),
    onError: (err: unknown) => toast({
      title: 'Erro ao enviar lista',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });

  const sendInteractive = useMutation({
    mutationFn: async (payload: {
      to: string;
      body: string;
      buttons: Array<{ id: string; title: string }>;
      header?: { type: 'text'; text: string };
      footer?: string;
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-interactive', { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao enviar mensagem interativa');
      return data as { messageId: string };
    },
    onSuccess: () => toast({ title: 'Mensagem com botões enviada' }),
    onError: (err: unknown) => toast({
      title: 'Erro ao enviar botões',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });

  return { sendTyping, sendList, sendInteractive };
}

/**
 * Hook para gerenciar Business Profile (info pública do escritório no WhatsApp)
 */
export interface BusinessProfile {
  about: string;
  description: string;
  email: string;
  websites: string[];
  address: string;
  vertical: string;
  profile_picture_url: string;
}

export function useBusinessProfile() {
  const { toast } = useToast();

  const get = useMutation({
    mutationFn: async (): Promise<BusinessProfile> => {
      const { data, error } = await supabase.functions.invoke('whatsapp-business-profile', {
        body: { action: 'get' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao ler profile');
      return data.profile as BusinessProfile;
    },
  });

  const update = useMutation({
    mutationFn: async (profile: Partial<BusinessProfile>) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-business-profile', {
        body: { action: 'update', profile },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao atualizar profile');
      return data;
    },
    onSuccess: () => toast({ title: 'Perfil WhatsApp atualizado', description: 'As mudanças aparecem pro cliente em alguns minutos.' }),
    onError: (err: unknown) => toast({
      title: 'Erro ao atualizar',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });

  return { get, update };
}
