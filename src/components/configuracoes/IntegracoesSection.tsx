import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, FileSignature, MessageSquare, Bot, CreditCard, Mail, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { GoogleCalendarCard } from './GoogleCalendarCard';

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
              placeholder={setting.is_sensitive ? '************' : `Digite ${setting.description.toLowerCase()}`}
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

  const stripeConfigured = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY &&
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_...' &&
    (!!import.meta.env.VITE_STRIPE_PRICE_PRO || !!import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE);

  return (
    <div className="space-y-6">
      <GoogleCalendarCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-green-600" />
            ZapSign
          </CardTitle>
          <CardDescription>
            Configure a integração com ZapSign para assinatura digital de contratos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integracaoSettings.filter((s) => s.key.startsWith('zapsign_')).map(renderSettingField)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            WhatsApp API
          </CardTitle>
          <CardDescription>
            Configure a integração com a API do WhatsApp para envio de mensagens automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integracaoSettings.filter((s) => s.key.startsWith('whatsapp_')).map(renderSettingField)}
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card className={stripeConfigured ? 'border-emerald-200 dark:border-emerald-800/50' : undefined}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Stripe — Pagamentos
                  {stripeConfigured ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20 font-semibold">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 font-semibold">
                      <AlertCircle className="h-2.5 w-2.5 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Cobrança recorrente e gestão de assinaturas
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stripeConfigured ? (
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
                  Price ID Plano Pro pendente — configure VITE_STRIPE_PRICE_PRO no Vercel
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
                  Price ID Plano Enterprise pendente — configure VITE_STRIPE_PRICE_ENTERPRISE no Vercel
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Configure as chaves do Stripe no painel Vercel e os secrets do webhook no Supabase para ativar cobranças.
              </p>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2" asChild>
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir Stripe Dashboard
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email / Postmark */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Email — Postmark
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 font-semibold">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" />
                  Pendente
                </Badge>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                E-mails transacionais: boas-vindas, faturamento, alertas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_SERVER_TOKEN</code>,{' '}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_FROM_EMAIL</code> e{' '}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded">POSTMARK_FROM_NAME</code> nos Secrets do Supabase.
          </p>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2" asChild>
            <a href="https://account.postmarkapp.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Postmark
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            Inteligência Artificial
          </CardTitle>
          <CardDescription>
            Configure os modelos de IA para agentes automáticos e assistentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiSettings.map(renderSettingField)}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="openai_key">OpenAI API Key</Label>
              <div className="text-sm text-muted-foreground mt-1">
                Configurada nas variáveis de ambiente do sistema
              </div>
            </div>
            <div>
              <Label htmlFor="anthropic_key">Anthropic API Key</Label>
              <div className="text-sm text-muted-foreground mt-1">
                Configurada nas variáveis de ambiente do sistema
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegracoesSection;
