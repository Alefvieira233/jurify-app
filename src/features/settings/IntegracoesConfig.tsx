import React, { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useIntegracoesConfig, type IntegracaoConfig, type CreateIntegracaoData } from '@/hooks/useIntegracoesConfig';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';
import { Plus, Loader2, Plug } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { IntegrationStatus } from '@/components/configuracoes/IntegrationCard';
import GoogleCalendarCard from './integrations/GoogleCalendarCard';
import ZapSignCard from './integrations/ZapSignCard';
import NativeIntegrationsGrid from './integrations/NativeIntegrationsGrid';
import CustomIntegrations from './integrations/CustomIntegrations';
import IntegrationFormDialog from './integrations/IntegrationFormDialog';

const IntegracoesConfig = () => {
  usePageTitle('Integrações');

  const { canManageIntegrations } = useRBAC();
  const { getSettingsByCategory, getSettingValue } = useSystemSettings();
  const gcal = useGoogleCalendarConnection();
  const {
    integracoes, loading,
    createIntegracao, updateIntegracao, toggleStatus, updateSincronizacao, deleteIntegracao,
  } = useIntegracoesConfig();

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIntegracao, setEditingIntegracao] = useState<IntegracaoConfig | null>(null);
  const [formData, setFormData] = useState<CreateIntegracaoData>({
    nome_integracao: '', status: 'inativa', api_key: '', endpoint_url: '', observacoes: '',
  });

  /* ── Derived status ── */
  const integracaoSettings = getSettingsByCategory('integracoes');

  const zapSignSettings = integracaoSettings.filter(s => s.key.startsWith('zapsign_'));
  const zapSignHasKey = zapSignSettings.some(s => !!getSettingValue(s.key));
  const zapSignStatus: IntegrationStatus = zapSignHasKey ? 'connected' : 'not_configured';

  const waSettings = integracaoSettings.filter(s => s.key.startsWith('whatsapp_'));
  const waHasKey = waSettings.some(s => !!getSettingValue(s.key));
  const waStatus: IntegrationStatus = waHasKey ? 'connected' : 'not_configured';

  const stripeHasKey = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY &&
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_...';
  const stripeHasPrices = !!import.meta.env.VITE_STRIPE_PRICE_PRO || !!import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE;
  const stripeStatus: IntegrationStatus = stripeHasKey && stripeHasPrices ? 'connected' : 'not_configured';

  const aiSettings = getSettingsByCategory('ai');
  const aiHasSettings = aiSettings.some(s => !!getSettingValue(s.key));
  const aiStatus: IntegrationStatus = aiHasSettings ? 'connected' : 'pending';

  const gcalStatus: IntegrationStatus = gcal.status.connected ? 'connected' : 'not_configured';

  /* ── CRUD helpers ── */
  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  const resetForm = () => {
    setFormData({ nome_integracao: '', status: 'inativa', api_key: '', endpoint_url: '', observacoes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIntegracao) {
      const success = await updateIntegracao(editingIntegracao.id, formData);
      if (success) { setEditingIntegracao(null); resetForm(); }
    } else {
      const success = await createIntegracao(formData);
      if (success) { setIsCreateDialogOpen(false); resetForm(); }
    }
  };

  const handleEdit = (integracao: IntegracaoConfig & { api_key?: string }) => {
    setEditingIntegracao(integracao);
    setFormData({
      nome_integracao: integracao.nome_integracao,
      status: integracao.status,
      api_key: integracao.api_key ?? '',
      endpoint_url: integracao.endpoint_url,
      observacoes: integracao.observacoes || '',
    });
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setEditingIntegracao(null);
    resetForm();
  };

  /* ── Permission gate ── */
  if (!canManageIntegrations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>Você não tem permissão para acessar esta área.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading || gcal.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Count connected ── */
  const allStatuses = [gcalStatus, zapSignStatus, waStatus, stripeStatus, aiStatus];
  const connectedCount = allStatuses.filter(s => s === 'connected').length;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
            <p className="text-sm text-muted-foreground">
              {connectedCount} de {allStatuses.length} serviços conectados
            </p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <IntegrationFormDialog
            isEdit={false}
            formData={formData}
            onFormDataChange={setFormData}
            onSubmit={() => { void handleSubmit(); }}
            onCancel={handleCancel}
          />
        </Dialog>
      </div>

      {/* SECTION 1 -- Google Calendar & ZapSign */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Integrações Principais
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoogleCalendarCard
            status={gcal.status}
            gcalStatus={gcalStatus}
            error={gcal.error}
            isConnecting={gcal.isConnecting}
            isDisconnecting={gcal.isDisconnecting}
            onConnect={() => void gcal.connect()}
            onDisconnect={gcal.disconnect}
            onRefetch={() => void gcal.refetch()}
          />
          <ZapSignCard zapSignStatus={zapSignStatus} />
        </div>
      </div>

      {/* SECTION 2 -- Other native integrations */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Outras Integrações
        </h2>
        <NativeIntegrationsGrid
          waStatus={waStatus}
          stripeStatus={stripeStatus}
          aiStatus={aiStatus}
        />
      </div>

      {/* SECTION 3 -- Custom integrations (CRUD) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Integrações Customizadas
          </h2>
          <span className="text-xs text-muted-foreground">{integracoes.length} configuradas</span>
        </div>

        <CustomIntegrations
          integracoes={integracoes as (IntegracaoConfig & { api_key: string; data_ultima_sincronizacao?: string | null })[]}
          showApiKeys={showApiKeys}
          copied={copied}
          onToggleApiKeyVisibility={(id) => setShowApiKeys(p => ({ ...p, [id]: !p[id] }))}
          onCopy={handleCopy}
          onToggleStatus={(id, status) => void toggleStatus(id, status)}
          onEdit={handleEdit}
          onSync={(id) => void updateSincronizacao(id)}
          onDelete={(id) => void deleteIntegracao(id)}
          onCreateNew={() => { resetForm(); setIsCreateDialogOpen(true); }}
          maskApiKey={maskApiKey}
        />
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingIntegracao} onOpenChange={(open) => { if (!open) setEditingIntegracao(null); }}>
        <IntegrationFormDialog
          isEdit={true}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={() => { void handleSubmit(); }}
          onCancel={handleCancel}
        />
      </Dialog>
    </div>
  );
};

export default IntegracoesConfig;
