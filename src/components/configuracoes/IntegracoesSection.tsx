import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Calendar, FileSignature, MessageSquare, Bot } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Configure a integração com Google Calendar para sincronização de agendamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integracaoSettings.filter((s) => s.key.startsWith('google_')).map(renderSettingField)}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>URL de Callback:</strong> {window.location.origin}/auth/google/callback
            </p>
          </div>
        </CardContent>
      </Card>

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
