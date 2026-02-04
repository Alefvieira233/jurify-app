/**
 * WhatsApp Setup - Official API configuration
 *
 * Component to configure the official WhatsApp Business API.
 * This replaces the unstable QR Code flow.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppSetupProps {
  onConnectionSuccess?: () => void;
}

const DEFAULT_ENDPOINT = 'https://graph.facebook.com/v18.0';
const INTEGRATION_NAME = 'whatsapp_oficial';

export default function WhatsAppSetup({ onConnectionSuccess }: WhatsAppSetupProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: 'jurify_secret_token',
  });
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  useEffect(() => {
    const loadConfig = async () => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from('configuracoes_integracoes')
          .select('api_key, phone_number_id, verify_token, endpoint_url')
          .eq('tenant_id', tenantId)
          .eq('nome_integracao', INTEGRATION_NAME)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        setConfig({
          phoneNumberId: data.phone_number_id || '',
          accessToken: data.api_key || '',
          verifyToken: data.verify_token || 'jurify_secret_token',
        });
        setSaved(true);
      } catch (error) {
        console.error('Failed to load WhatsApp config:', error);
      }
    };

    void loadConfig();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) {
      toast({
        title: 'Tenant nao encontrado',
        description: 'Nao foi possivel salvar sem um tenant valido.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('configuracoes_integracoes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('nome_integracao', INTEGRATION_NAME)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const payload = {
        tenant_id: tenantId,
        nome_integracao: INTEGRATION_NAME,
        status: 'ativa',
        api_key: config.accessToken,
        endpoint_url: DEFAULT_ENDPOINT,
        phone_number_id: config.phoneNumberId,
        verify_token: config.verifyToken,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('configuracoes_integracoes')
          .update(payload)
          .eq('id', existing.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('configuracoes_integracoes').insert([payload]);

        if (error) throw error;
      }

      setSaved(true);
      toast({
        title: 'Configuracao salva',
        description: 'Suas credenciais do WhatsApp foram atualizadas.',
      });

      onConnectionSuccess?.();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Nao foi possivel salvar as configuracoes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-emerald-200" />
          WhatsApp Business API (Oficial)
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Conecte-se via API oficial da Meta para garantir estabilidade e evitar banimentos.
        </p>
      </div>

      <Alert className="border-blue-500/30 bg-blue-500/10">
        <ExternalLink className="h-4 w-4 text-blue-300" />
        <AlertDescription className="text-[hsl(var(--foreground))]">
          Voce precisa de uma conta no{' '}
          <a
            href="https://developers.facebook.com/"
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            Meta for Developers
          </a>
          . Crie um app, adicione o produto "WhatsApp" e obtenha as credenciais abaixo.
        </AlertDescription>
      </Alert>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Credenciais de Acesso</CardTitle>
          <CardDescription>Insira os dados do seu aplicativo WhatsApp Business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phoneId">Phone Number ID</Label>
            <Input
              id="phoneId"
              placeholder="Ex: 123456789012345"
              value={config.phoneNumberId}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Encontrado na secao "API Setup" do painel da Meta.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Access Token (Permanente)</Label>
            <Input
              id="token"
              type="password"
              placeholder="EAA..."
              value={config.accessToken}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Recomendamos usar um Token de Sistema para nao expirar.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify">Webhook Verify Token</Label>
            <Input
              id="verify"
              value={config.verifyToken}
              onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Defina este mesmo valor na configuracao do Webhook na Meta.
            </p>
          </div>

          <div className="bg-[hsl(var(--surface-1))] p-4 rounded-md border border-[hsl(var(--border))]">
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Webhook URL para configurar na Meta:</p>
            <code className="block bg-[hsl(var(--card))] p-2 rounded text-xs font-mono break-all border border-[hsl(var(--border))]">
              https://[YOUR_PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook
            </code>
          </div>

          <Button
            onClick={() => void handleSave()}
            disabled={loading || !config.phoneNumberId || !config.accessToken}
            className="w-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configuracao
              </>
            )}
          </Button>

          {saved && (
            <p className="text-xs text-emerald-200 text-center">Configuracao salva para este tenant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


