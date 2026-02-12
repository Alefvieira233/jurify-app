import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  template: string;
  event_type: string;
  is_active: boolean;
  roles_enabled: string[];
  tenant_id?: string;
}

export const useNotificationTemplates = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('event_type');

      if (error) throw error;
      return data as NotificationTemplate[];
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<NotificationTemplate> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant nao encontrado');

      const { error } = await supabase
        .from('notification_templates')
        .update(template)
        .eq('id', template.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-templates', tenantId] });
      toast({
        title: 'Template atualizado',
        description: 'O template foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar template.',
        variant: 'destructive',
      });
      console.error('Failed to update template:', error);
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<NotificationTemplate, 'id'>) => {
      if (!tenantId) throw new Error('Tenant nao encontrado');

      const { error } = await supabase
        .from('notification_templates')
        .insert({ ...template, created_by: user?.id, tenant_id: tenantId });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-templates', tenantId] });
      toast({
        title: 'Template criado',
        description: 'O template foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar template.',
        variant: 'destructive',
      });
      console.error('Failed to create template:', error);
    }
  });

  return {
    templates,
    isLoading,
    updateTemplate: updateTemplateMutation.mutate,
    createTemplate: createTemplateMutation.mutate,
    isUpdating: updateTemplateMutation.isPending || createTemplateMutation.isPending
  };
};
