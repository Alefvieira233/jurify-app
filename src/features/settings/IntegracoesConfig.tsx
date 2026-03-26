import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { useIntegracoesConfig, type IntegracaoConfig, type CreateIntegracaoData } from '@/hooks/useIntegracoesConfig';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';
import {
  Eye, EyeOff, Plus, Settings, Trash2, RefreshCw, Copy, Check,
  Calendar, FileSignature, MessageSquare, CreditCard, Mail, Bot,
  CheckCircle2, AlertCircle, ExternalLink, Loader2, Unlink, Plug,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRBAC } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { IntegrationStatus } from '@/components/configuracoes/IntegrationCard';

/* ═══════════════════════════════════════════════════════════════════════════
   Integrações — Página dedicada (/integracoes)
   Google Calendar e ZapSign em destaque + integrações nativas + CRUD custom
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Status helpers ── */
const STATUS_STYLE: Record<IntegrationStatus, { label: string; color: string }> = {
  connected:      { label: 'Conectado',       color: 'text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20' },
  pending:        { label: 'Pendente',         color: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20' },
  error:          { label: 'Erro',             color: 'text-red-600 border-red-400/60 bg-red-50 dark:bg-red-900/20' },
  not_configured: { label: 'Não configurado',  color: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20' },
};

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const cfg = STATUS_STYLE[status];
  const Icon = status === 'connected' ? CheckCircle2 : AlertCircle;
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5 mr-1" />
      {cfg.label}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

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

  /* ══════════════════════════════════════════════════════════════════════ */
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
          {renderFormDialog(false)}
        </Dialog>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEÇÃO 1 — Google Calendar e ZapSign (DESTAQUE)
          ══════════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Integrações Principais
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Google Calendar ── */}
          <Card className={cn(
            'relative overflow-hidden transition-all hover:shadow-md',
            gcalStatus === 'connected'
              ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-blue-50/50 to-emerald-50/30 dark:from-blue-950/20 dark:to-emerald-950/10'
              : 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/40 to-white dark:from-blue-950/20 dark:to-background'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-background shadow-sm border flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      Google Calendar
                      <StatusBadge status={gcalStatus} />
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Sincronize agendamentos automaticamente com sua conta Google
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/50 hover:text-foreground"
                  onClick={() => void gcal.refetch()}
                  title="Atualizar status"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {gcal.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{gcal.error}</span>
                </div>
              )}

              {gcal.status.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
                    <Avatar className="h-10 w-10">
                      {gcal.status.picture && <AvatarImage src={gcal.status.picture} alt={gcal.status.name ?? ''} />}
                      <AvatarFallback className="text-sm">{gcal.status.name?.charAt(0).toUpperCase() ?? 'G'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {gcal.status.name && <p className="text-sm font-medium truncate">{gcal.status.name}</p>}
                      <p className="text-xs text-muted-foreground truncate">{gcal.status.email}</p>
                    </div>
                  </div>
                  {gcal.status.connectedAt && (
                    <p className="text-xs text-muted-foreground/70">
                      Conectado {formatDistanceToNow(new Date(gcal.status.connectedAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-sm"
                    onClick={gcal.disconnect}
                    disabled={gcal.isDisconnecting}
                  >
                    {gcal.isDisconnecting
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Unlink className="h-4 w-4 mr-2" />
                    }
                    Desconectar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta Google para sincronizar automaticamente com o Calendar.
                  </p>
                  <Button
                    className="w-full h-11 text-sm gap-2.5 font-medium"
                    onClick={() => void gcal.connect()}
                    disabled={gcal.isConnecting}
                  >
                    {gcal.isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Conectar com Google
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── ZapSign ── */}
          <Card className={cn(
            'relative overflow-hidden transition-all hover:shadow-md',
            zapSignStatus === 'connected'
              ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10'
              : 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/40 to-white dark:from-green-950/20 dark:to-background'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-background shadow-sm border flex items-center justify-center">
                    <FileSignature className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      ZapSign
                      <StatusBadge status={zapSignStatus} />
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Assinatura digital de contratos com validade jurídica
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {zapSignStatus === 'connected' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-background/80 border">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">API configurada</p>
                      <p className="text-xs text-muted-foreground">Contratos podem ser assinados digitalmente</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-sm gap-2" asChild>
                    <a href="https://app.zapsign.com.br" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Painel ZapSign
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Configure sua API Key do ZapSign para habilitar assinaturas digitais nos contratos.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-11 text-sm gap-2" asChild>
                      <a href="https://zapsign.com.br" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Criar conta ZapSign
                      </a>
                    </Button>
                    <Button className="flex-1 h-11 text-sm gap-2" asChild>
                      <a href="/configuracoes?tab=integracoes">
                        <Settings className="h-4 w-4" />
                        Configurar API Key
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEÇÃO 2 — Outras Integrações Nativas
          ══════════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Outras Integrações
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* WhatsApp */}
          <Card className={cn('transition-all hover:shadow-sm', waStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">WhatsApp</p>
                  <StatusBadge status={waStatus} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automação de mensagens via Kapso API
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <a href="/configuracoes?tab=integracoes">Configurar</a>
              </Button>
            </CardContent>
          </Card>

          {/* Stripe */}
          <Card className={cn('transition-all hover:shadow-sm', stripeStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">Stripe</p>
                  <StatusBadge status={stripeStatus} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Cobranças recorrentes e assinaturas
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Stripe Dashboard
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Postmark */}
          <Card className="transition-all hover:shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">Postmark</p>
                  <StatusBadge status="not_configured" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                E-mails transacionais e alertas
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
                <a href="https://account.postmarkapp.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Abrir Postmark
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* IA */}
          <Card className={cn('transition-all hover:shadow-sm', aiStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">Inteligência Artificial</p>
                  <StatusBadge status={aiStatus} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                OpenAI e Anthropic para agentes IA
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <a href="/configuracoes?tab=integracoes">Configurar</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEÇÃO 3 — Integrações Customizadas (CRUD)
          ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Integrações Customizadas
          </h2>
          <span className="text-xs text-muted-foreground">{integracoes.length} configuradas</span>
        </div>

        {integracoes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Nenhuma integração customizada</p>
              <p className="text-xs text-muted-foreground text-center max-w-sm mb-4">
                Use o botão "Nova Integração" para conectar serviços terceiros via API.
              </p>
              <Button variant="outline" size="sm" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira integração
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {integracoes.map((integracao) => {
              const isConnected = integracao.status === 'ativa' && !!integracao.api_key && !!integracao.endpoint_url;
              return (
                <Card key={integracao.id} className={cn(isConnected && 'border-emerald-200 dark:border-emerald-800/50')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                          <Plug className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            {integracao.nome_integracao}
                            <Badge className={cn(
                              'text-[10px]',
                              integracao.status === 'ativa' ? 'bg-green-100 text-green-800' :
                              integracao.status === 'erro' ? 'bg-red-100 text-red-800' :
                              'bg-muted text-foreground'
                            )}>
                              {integracao.status === 'ativa' ? 'Ativa' : integracao.status === 'erro' ? 'Erro' : 'Inativa'}
                            </Badge>
                          </CardTitle>
                          {integracao.observacoes && (
                            <CardDescription className="text-[11px] mt-0.5">{integracao.observacoes}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={integracao.status === 'ativa'}
                          onCheckedChange={() => void toggleStatus(integracao.id, integracao.status)}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(integracao)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void updateSincronizacao(integracao.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void deleteIntegracao(integracao.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-3" />
                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Endpoint</Label>
                        <p className="font-mono mt-0.5 truncate">{integracao.endpoint_url}</p>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">API Key</Label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="font-mono truncate">
                            {showApiKeys[integracao.id] ? integracao.api_key : maskApiKey(integracao.api_key)}
                          </p>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowApiKeys(p => ({ ...p, [integracao.id]: !p[integracao.id] }))}>
                            {showApiKeys[integracao.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(integracao.api_key, integracao.id)}>
                            {copied === integracao.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Criado em</Label>
                        <p className="mt-0.5">{format(new Date(integracao.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Última sincronização</Label>
                        <p className="mt-0.5">
                          {integracao.data_ultima_sincronizacao
                            ? format(new Date(integracao.data_ultima_sincronizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : 'Nunca'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingIntegracao} onOpenChange={(open) => { if (!open) setEditingIntegracao(null); }}>
        {renderFormDialog(true)}
      </Dialog>
    </div>
  );

  /* ── Shared form dialog content ── */
  function renderFormDialog(isEdit: boolean) {
    return (
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={(event) => { void handleSubmit(event); }}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Integração' : 'Nova Integração'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Atualize as configurações da integração.' : 'Configure uma nova integração externa.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={isEdit ? 'edit-nome' : 'nome'} className="text-right text-sm">Nome</Label>
              <Input
                id={isEdit ? 'edit-nome' : 'nome'}
                value={formData.nome_integracao}
                onChange={(e) => setFormData({ ...formData, nome_integracao: e.target.value })}
                className="col-span-3"
                placeholder="Ex: CRM, ERP, API de pagamento"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'ativa' | 'inativa' | 'erro') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={isEdit ? 'edit-endpoint' : 'endpoint'} className="text-right text-sm">Endpoint</Label>
              <Input
                id={isEdit ? 'edit-endpoint' : 'endpoint'}
                value={formData.endpoint_url}
                onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                className="col-span-3"
                placeholder="https://api.exemplo.com/v1"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={isEdit ? 'edit-apikey' : 'apikey'} className="text-right text-sm">API Key</Label>
              <Input
                id={isEdit ? 'edit-apikey' : 'apikey'}
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="col-span-3"
                placeholder="Sua API Key"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor={isEdit ? 'edit-obs' : 'obs'} className="text-right text-sm mt-2">Notas</Label>
              <Textarea
                id={isEdit ? 'edit-obs' : 'obs'}
                value={formData.observacoes ?? ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="col-span-3"
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsCreateDialogOpen(false); setEditingIntegracao(null); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Atualizar' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }
};

export default IntegracoesConfig;
