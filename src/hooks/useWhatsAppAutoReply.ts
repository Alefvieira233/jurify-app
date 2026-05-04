import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type AutoReplyType = 'greeting' | 'away';

export interface BusinessHourRule {
  day: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  start: string;
  end: string;
}

export interface AutoReply {
  id: string;
  type: AutoReplyType;
  message: string;
  enabled: boolean;
  business_hours: BusinessHourRule[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHourRule[] = [
  { day: 'mon', start: '09:00', end: '18:00' },
  { day: 'tue', start: '09:00', end: '18:00' },
  { day: 'wed', start: '09:00', end: '18:00' },
  { day: 'thu', start: '09:00', end: '18:00' },
  { day: 'fri', start: '09:00', end: '18:00' },
];

export function useWhatsAppAutoReplies() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;

  const list = useQuery<AutoReply[]>({
    queryKey: ['whatsapp', 'auto-replies', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_auto_replies')
        .select('id, type, message, enabled, business_hours, created_at, updated_at');
      if (error) throw error;
      return (data ?? []) as AutoReply[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const upsert = useMutation({
    mutationFn: async (input: { type: AutoReplyType; message: string; enabled: boolean; business_hours?: BusinessHourRule[] }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        type: input.type,
        message: input.message,
        enabled: input.enabled,
        updated_at: new Date().toISOString(),
      };
      if (input.business_hours) payload.business_hours = input.business_hours;
      const { data, error } = await supabase
        .from('whatsapp_auto_replies')
        .upsert(payload, { onConflict: 'tenant_id,type' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'auto-replies'] });
      toast({ title: 'Resposta automática salva' });
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao salvar',
      description: err instanceof Error ? err.message : 'Erro',
      variant: 'destructive',
    }),
  });

  const greeting = list.data?.find(r => r.type === 'greeting');
  const away = list.data?.find(r => r.type === 'away');

  return {
    greeting, away,
    items: list.data ?? [],
    isLoading: list.isLoading,
    upsert,
  };
}
