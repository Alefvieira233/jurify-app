import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
  is_sensitive: boolean;
  tenant_id?: string;
}

export const useSystemSettings = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category', { ascending: true });

      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { data, error } = await supabase.rpc('update_system_setting', {
        _key: key,
        _value: value,
        _user_id: user?.id,
        _tenant_id: tenantId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system-settings', tenantId] });
      toast({
        title: 'Configuracao atualizada',
        description: 'A configuração foi salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração.',
        variant: 'destructive',
      });
      console.error('Failed to update system setting:', error);
    },
  });

  const getSettingsByCategory = (category: string) => {
    return settings.filter((setting) => setting.category === category);
  };

  const getSettingValue = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || '';
  };

  return {
    settings,
    isLoading,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
    getSettingsByCategory,
    getSettingValue,
  };
};
