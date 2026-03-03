import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, FileSignature, MessageSquare, Bot, CreditCard, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { GoogleCalendarCard } from './GoogleCalendarCard';
import { IntegrationCard, type IntegrationStatus } from './IntegrationCard';

type IntegrationSetting = { key: string; description: string; is_sensitive?: boolean };

const IntegracoesSection = () => {
  const { getSettingsByCategory, updateSetting, isUpdating, getSettingValue } = useSystemSettings();
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  const integracaoSettings = getSettingsByCategory('integracoes');
  const aiSettings = getSettingsByCategory('ai');

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = formData[key] !== undefined ? formData[key] : getSettingValue(key);
    updateSetting({ key, value });
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSettingField = (setting: IntegrationSetting) => {
    const currentValue = formData[setting.key] !== undefined ? formData[setting.key] : getSettingValue(setting.key);
    const isVisible = showSensitive[setting.key];

    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={setting.key}>{setting.description}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={setting.key}
              type={setting.is_sensitive && !isVisible ? 'password' : 'text'}
              value={currentValue}
              onChange={(e) => handleInputChange(setting.key, e.target.value)}
              placeholder={setting.is_sensitive ? '••••••••••••' : `Digite ${setting.description.toLowerCase()}`}
            />
            {setting.is_sensitive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => toggleSensitive(setting.key)}
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Button onClick={() => handleSave(setting.key)} disabled={isUpdating} size="sm">
            Salvar
          </Button>
        </div>
      </div>
    );
  };

  /* ── Stripe status ── */
  const stripeHasKey = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY &&
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_...';
  const stripeHasPrices = !!import.meta.env.VITE_STRIPE_PRICE_PRO || !!import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE;
  const stripeStatus: IntegrationStatus = stripeHasKey && stripeHasPrices ? 'connected' : 'not_configured';

  /* ── ZapSign has configured keys? ── */
  const zapSignSettings = integracaoSettings.filter(s => s.key.startsWith('zapsign_'));
  const zapSignHasKey = zapSignSettings.some(s => !!getSettingValue(s.key));
  const zapSignStatus: IntegrationStatus = zapSignHasKey ? 'connected' : 'not_configured';

  /* ── WhatsApp has configured keys? ── */
  const waSettings = integracaoSettings.filter(s => s.key.startsWith('whatsapp_'));
  const waHasKey = waSettings.some(s => !!getSettingValue(s.key));
  const waStatus: IntegrationStatus = waHasKey ? 'connected' : 'not_configured';

  /* ── AI has configured models? ── */
  const aiHasSettings = aiSettings.some(s => !!getSettingValue(s.key));
  const aiStatus: IntegrationStatus = aiHasSettings ? 'connected' : 'pending';

  return (
    <div className="space-y-4">
      {/* Google Calendar — always first */}
      <GoogleCalendarCard />

      {/* ZapSign */}
      <IntegrationCard
        icon={FileSignature}
        iconColor="text-green-600"
        iconBg="bg-green-50 dark:bg-green-900/20"
        name="ZapSign — Assinatura Digital"
        description="Assinatura digital de contratos jurídicos com validade legal"
        status={zapSignStatus}
        externalLink="https://zapsign.com.br"
        externalLinkLabel="Abrir ZapSign"
      >
        {zapSignSettings.length > 0 ? (
          <div className="space-y-3">
            {zapSignSettings.map(renderSettingField)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma configuração disponível. Verifique as permissões de administrador.
          </p>
        )}
      </IntegrationCard>

      {/* WhatsApp */}
      <IntegrationCard
        icon={MessageSquare}
        iconColor="text-green-500"
        iconBg="bg-green-50 dark:bg-green-900/20"
        name="WhatsApp — Automação"
        description="Envio automático de mensagens via API oficial do WhatsApp"
        status={waStatus}
      >
        {waSettings.length > 0 ? (
          <div className="space-y-3">
            {waSettings.map(renderSettingField)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma configuração disponível. Verifique as permissões de administrador.
          </p>
        )}
      </IntegrationCard>

      {/* Stripe */}
      <IntegrationCard
        icon={CreditCard}
        iconColor="text-violet-600"
        iconBg="bg-violet-50 dark:bg-violet-900/20"
        name="Stripe — Pagamentos"
        description="Cobrança recorrente e gestão de assinaturas"
        status={stripeStatus}
        externalLink="https://dashboard.stripe.com/apikeys"
        externalLinkLabel="Abrir Stripe Dashboard"
      >
        {stripeStatus === 'connected' ? (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              Chave publicável configurada
            </p>
            {import.meta.env.VITE_STRIPE_PRICE_PRO ? (
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                Price ID Plano Pro configurado
              </p>
            ) : (
              <p className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                Price ID Plano Pro pendente
              </p>
            )}
            {import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE ? (
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                Price ID Plano Enterprise configurado
              </p>
            ) : (
              <p className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                Price ID Plano Enterprise pendente
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Configure as chaves do Stripe no painel Vercel e os secrets do webhook no Supabase para ativar cobranças.
          </p>
        )}
      </IntegrationCard>

      {/* Email / Postmark */}
      <IntegrationCard
        icon={Mail}
        iconColor="text-sky-600"
        iconBg="bg-sky-50 dark:bg-sky-900/20"
        name="Email — Postmark"
        description="E-mails transacionais: boas-vindas, faturamento e alertas"
        status="not_configured"
        externalLink="https://account.postmarkapp.com"
        externalLinkLabel="Abrir Postmark"
      >
        <p className="text-xs text-muted-foreground">
          Configure{' '}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_SERVER_TOKEN</code>,{' '}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_FROM_EMAIL</code> e{' '}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_FROM_NAME</code>{' '}
          nos Secrets do Supabase.
        </p>
      </IntegrationCard>

      {/* Inteligência Artificial */}
      <IntegrationCard
        icon={Bot}
        iconColor="text-purple-600"
        iconBg="bg-purple-50 dark:bg-purple-900/20"
        name="Inteligência Artificial"
        description="Modelos de IA para agentes automáticos e assistentes jurídicos"
        status={aiStatus}
      >
        {aiSettings.length > 0 ? (
          <>
            <div className="space-y-3">
              {aiSettings.map(renderSettingField)}
            </div>
            <Separator />
          </>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>OpenAI API Key</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Configurada nos secrets do Supabase
            </p>
          </div>
          <div>
            <Label>Anthropic API Key</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Configurada nos secrets do Supabase
            </p>
          </div>
        </div>
      </IntegrationCard>
    </div>
  );
};

export default IntegracoesSection;
