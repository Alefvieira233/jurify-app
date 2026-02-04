import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntegracoesConfig, IntegracaoConfig, CreateIntegracaoData } from '@/hooks/useIntegracoesConfig';
import { Eye, EyeOff, Plus, Settings, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRBAC } from '@/hooks/useRBAC';

const IntegracoesConfig = () => {
  const {
    integracoes,
    loading,
    createIntegracao,
    updateIntegracao,
    toggleStatus,
    updateSincronizacao,
    deleteIntegracao,
  } = useIntegracoesConfig();
  const { canManageIntegrations } = useRBAC();
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIntegracao, setEditingIntegracao] = useState<IntegracaoConfig | null>(null);
  const [formData, setFormData] = useState<CreateIntegracaoData>({
    nome_integracao: '',
    status: 'inativa',
    api_key: '',
    endpoint_url: '',
    observacoes: '',
  });

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStatusColor = (status: IntegracaoConfig['status']) => {
    switch (status) {
      case 'ativa':
        return 'bg-green-100 text-green-800';
      case 'inativa':
        return 'bg-gray-100 text-gray-800';
      case 'erro':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: IntegracaoConfig['status']) => {
    switch (status) {
      case 'ativa':
        return 'Ativa';
      case 'inativa':
        return 'Inativa';
      case 'erro':
        return 'Erro';
      default:
        return 'Indefinido';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingIntegracao) {
      const success = await updateIntegracao(editingIntegracao.id, formData);
      if (success) {
        setEditingIntegracao(null);
        resetForm();
      }
    } else {
      const success = await createIntegracao(formData);
      if (success) {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome_integracao: '',
      status: 'inativa',
      api_key: '',
      endpoint_url: '',
      observacoes: '',
    });
  };

  const handleEdit = (integracao: IntegracaoConfig) => {
    setEditingIntegracao(integracao);
    setFormData({
      nome_integracao: integracao.nome_integracao,
      status: integracao.status,
      api_key: integracao.api_key,
      endpoint_url: integracao.endpoint_url,
      observacoes: integracao.observacoes || '',
    });
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  if (!canManageIntegrations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuracoes de Integracoes</CardTitle>
          <CardDescription>Voce nao tem permissao para acessar esta area.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuracoes de Integracoes</h1>
          <p className="text-gray-600">Gerencie as integracoes externas do sistema</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Integracao
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={(event) => { void handleSubmit(event); }}>
              <DialogHeader>
                <DialogTitle>{editingIntegracao ? 'Editar Integracao' : 'Nova Integracao'}</DialogTitle>
                <DialogDescription>Configure uma nova integracao externa para o sistema.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nome" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome_integracao}
                    onChange={(e) => setFormData({ ...formData, nome_integracao: e.target.value })}
                    className="col-span-3"
                    placeholder="Ex: Google Calendar, WhatsApp Business"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'ativa' | 'inativa' | 'erro') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endpoint" className="text-right">
                    Endpoint URL
                  </Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint_url}
                    onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                    className="col-span-3"
                    placeholder="https://api.exemplo.com/v1"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apikey" className="text-right">
                    API Key
                  </Label>
                  <Input
                    id="apikey"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="col-span-3"
                    placeholder="Sua API Key"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="observacoes" className="text-right mt-2">
                    Observacoes
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="col-span-3"
                    placeholder="Observacoes adicionais..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingIntegracao(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editingIntegracao ? 'Atualizar' : 'Criar'} Integracao</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {integracoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma integracao configurada</h3>
              <p className="text-gray-500 text-center max-w-md">
                Configure suas primeiras integracoes externas para comecar a sincronizar dados com servicos terceiros.
              </p>
            </CardContent>
          </Card>
        ) : (
          integracoes.map((integracao) => (
            <Card key={integracao.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{integracao.nome_integracao}</CardTitle>
                    <Badge className={getStatusColor(integracao.status)}>{getStatusText(integracao.status)}</Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integracao.status === 'ativa'}
                      onCheckedChange={() => toggleStatus(integracao.id, integracao.status)}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(integracao)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void updateSincronizacao(integracao.id)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void deleteIntegracao(integracao.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{integracao.observacoes || 'Nenhuma observacao disponivel'}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Endpoint URL</Label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{integracao.endpoint_url}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">API Key</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-900 font-mono">
                        {showApiKeys[integracao.id] ? integracao.api_key : maskApiKey(integracao.api_key)}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => toggleApiKeyVisibility(integracao.id)}>
                        {showApiKeys[integracao.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Criado em</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(integracao.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ultima sincronizacao</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {integracao.data_ultima_sincronizacao
                        ? format(new Date(integracao.data_ultima_sincronizacao), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editingIntegracao} onOpenChange={(open) => !open && setEditingIntegracao(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={(event) => { void handleSubmit(event); }}>
            <DialogHeader>
              <DialogTitle>Editar Integracao</DialogTitle>
              <DialogDescription>Atualize as configuracoes da integracao.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-nome" className="text-right">
                  Nome
                </Label>
                <Input
                  id="edit-nome"
                  value={formData.nome_integracao}
                  onChange={(e) => setFormData({ ...formData, nome_integracao: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'ativa' | 'inativa' | 'erro') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-endpoint" className="text-right">
                  Endpoint URL
                </Label>
                <Input
                  id="edit-endpoint"
                  value={formData.endpoint_url}
                  onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-apikey" className="text-right">
                  API Key
                </Label>
                <Input
                  id="edit-apikey"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-observacoes" className="text-right mt-2">
                  Observacoes
                </Label>
                <Textarea
                  id="edit-observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingIntegracao(null)}>
                Cancelar
              </Button>
              <Button type="submit">Atualizar Integracao</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegracoesConfig;

