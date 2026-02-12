import { useState, useCallback } from 'react';
import { Plus, Key, Eye, EyeOff, Power, PowerOff, Trash2, Copy, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ApiKey {
  id: string;
  nome: string;
  key_value: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  criado_por?: string;
  tenant_id?: string;
}

const ApiKeysManager = () => {
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { isAdmin } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api_keys', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenantId)
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
      if (!tenantId) throw new Error('Tenant nao encontrado');

      const keyValue = generateSecureKey();
      const keyHash = await hashKey(keyValue);

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          {
            nome,
            key_value: keyHash,
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
      void queryClient.invalidateQueries({ queryKey: ['api_keys', tenantId] });
      setCreatedKeyValue((data as { _plainKey: string })._plainKey);
      setShowNewKeyDialog(false);
      setNewKeyName('');
      toast({
        title: 'Sucesso',
        description: 'Nova API key criada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Failed to create API key:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a API key.',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      if (!tenantId) throw new Error('Tenant nao encontrado');

      const { error } = await supabase
        .from('api_keys')
        .update({ ativo: !ativo })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api_keys', tenantId] });
      toast({
        title: 'Sucesso',
        description: 'Status da API key atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Failed to update status:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel alterar o status da API key.',
        variant: 'destructive',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant nao encontrado');

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api_keys', tenantId] });
      toast({
        title: 'Sucesso',
        description: 'API key removida com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Failed to remove API key:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel remover a API key.',
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

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copiado',
          description: 'API key copiada para a area de transferencia.',
        });
      },
      () => {
        toast({
          title: 'Erro',
          description: 'Nao foi possivel copiar a API key.',
          variant: 'destructive',
        });
      }
    );
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de API Keys</CardTitle>
          <CardDescription>Voce nao tem permissao para acessar esta area.</CardDescription>
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
      {/* One-time key reveal dialog */}
      <Dialog open={!!createdKeyValue} onOpenChange={(open) => { if (!open) setCreatedKeyValue(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              Salve sua API Key
            </DialogTitle>
            <DialogDescription>
              Esta chave sera exibida apenas uma vez. Copie e guarde em local seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <code className="block bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-3 rounded text-sm font-mono break-all">
              {createdKeyValue}
            </code>
            <Button className="w-full" onClick={() => { if (createdKeyValue) copyToClipboard(createdKeyValue); }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Gerenciamento de API Keys</h2>
          <p className="text-[hsl(var(--muted-foreground))]">Gerencie as chaves de API para integracao com agentes IA</p>
        </div>

        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
              <Plus className="h-4 w-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova API Key</DialogTitle>
              <DialogDescription>
                Crie uma nova chave de API para integracao com agentes IA.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Nome da API Key</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: Agente WhatsApp, API Externa..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => setShowNewKeyDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey} disabled={createKeyMutation.isPending} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
                  {createKeyMutation.isPending ? 'Criando...' : 'Criar API Key'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Total de Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Keys Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-200">
              {apiKeys?.filter((key) => key.ativo).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Keys Inativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">
              {apiKeys?.filter((key) => !key.ativo).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {!apiKeys || apiKeys.length === 0 ? (
        <div className="text-center py-8">
          <Key className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">Nenhuma API key encontrada</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">Crie sua primeira API key para comecar a usar os agentes IA.</p>
          <Button onClick={() => setShowNewKeyDialog(true)} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira API key
          </Button>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4 text-blue-300" />
                      <span className="font-medium">{key.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] px-2 py-1 rounded text-sm font-mono">
                        {visibleKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => toggleKeyVisibility(key.id)}>
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(key.key_value)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={key.ativo ? 'default' : 'secondary'}
                      className={key.ativo ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30' : 'bg-slate-500/15 text-slate-200 border border-slate-400/30'}
                    >
                      {key.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {new Date(key.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatusMutation.mutate({ id: key.id, ativo: key.ativo })}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {key.ativo ? (
                          <PowerOff className="h-4 w-4 text-red-300" />
                        ) : (
                          <Power className="h-4 w-4 text-emerald-200" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKeyMutation.mutate(key.id)}
                        disabled={deleteKeyMutation.isPending}
                        className="hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4 text-red-300" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ApiKeysManager;






