import { useState, useCallback } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';
import { ApiKeyRevealDialog } from './api-keys/ApiKeyRevealDialog';
import { NewApiKeyDialog } from './api-keys/NewApiKeyDialog';
import { ApiKeysStats } from './api-keys/ApiKeysStats';
import { ApiKeysTable } from './api-keys/ApiKeysTable';
import type { ApiKey } from './api-keys/types';

const log = createLogger('ApiKeysManager');

const ApiKeysManager = () => {
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { isAdmin } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: queryKeys.apiKeys.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, nome, key_prefix, key_hash, ativo, created_at, updated_at, criado_por, tenant_id')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
  });

  // Generate cryptographically secure API key
  const generateSecureKey = useCallback((): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `jf_${hex}`;
  }, []);

  // SHA-256 hash for storage (never store plaintext)
  const hashKey = useCallback(async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const createKeyMutation = useMutation({
    mutationFn: async (nome: string) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const keyValue = generateSecureKey();
      const keyHash = await hashKey(keyValue);

      const keyPrefix = keyValue.substring(0, 7);

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          {
            nome,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            criado_por: user?.id,
            ativo: true,
            tenant_id: tenantId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { ...data, _plainKey: keyValue };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      setCreatedKeyValue((data as { _plainKey: string })._plainKey);
      setShowNewKeyDialog(false);
      setNewKeyName('');
      toast({
        title: 'Sucesso',
        description: 'Nova API key criada com sucesso.',
      });
    },
    onError: (error) => {
      log.error('Failed to create API key', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a API key.',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { error } = await supabase
        .from('api_keys')
        .update({ ativo: !ativo })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      toast({
        title: 'Sucesso',
        description: 'Status da API key atualizado com sucesso.',
      });
    },
    onError: (error) => {
      log.error('Failed to update status', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da API key.',
        variant: 'destructive',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      toast({
        title: 'Sucesso',
        description: 'API key removida com sucesso.',
      });
    },
    onError: (error) => {
      log.error('Failed to remove API key', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a API key.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um nome para a API key.',
        variant: 'destructive',
      });
      return;
    }
    createKeyMutation.mutate(newKeyName.trim());
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copiado',
          description: 'API key copiada para a área de transferência.',
        });
      },
      () => {
        toast({
          title: 'Erro',
          description: 'Não foi possível copiar a API key.',
          variant: 'destructive',
        });
      }
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de API Keys</CardTitle>
          <CardDescription>Você não tem permissão para acessar esta área.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted-foreground))]">Carregando API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApiKeyRevealDialog
        createdKeyValue={createdKeyValue}
        onClose={() => setCreatedKeyValue(null)}
        onCopy={copyToClipboard}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Gerenciamento de API Keys</h2>
          <p className="text-[hsl(var(--muted-foreground))]">Gerencie as chaves de API para integração com agentes IA</p>
        </div>

        <NewApiKeyDialog
          open={showNewKeyDialog}
          onOpenChange={setShowNewKeyDialog}
          newKeyName={newKeyName}
          onNewKeyNameChange={setNewKeyName}
          onCreate={handleCreateKey}
          isPending={createKeyMutation.isPending}
        />
      </div>

      <ApiKeysStats apiKeys={apiKeys} />

      <ApiKeysTable
        apiKeys={apiKeys}
        onToggleStatus={(id, ativo) => toggleStatusMutation.mutate({ id, ativo })}
        onDelete={(id) => deleteKeyMutation.mutate(id)}
        onCreateFirst={() => setShowNewKeyDialog(true)}
        isToggling={toggleStatusMutation.isPending}
        isDeleting={deleteKeyMutation.isPending}
      />
    </div>
  );
};

export default ApiKeysManager;
