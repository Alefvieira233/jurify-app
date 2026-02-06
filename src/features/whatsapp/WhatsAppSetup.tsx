/**
 * WhatsApp Setup - Unified connection page
 *
 * Supports two providers:
 * 1. Evolution API (self-hosted, QR Code) — Recommended for MVP
 * 2. Meta Official API (credentials) — For enterprise scale
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Save,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  QrCode,
  ArrowRight,
  Zap,
  DollarSign,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const WhatsAppEvolutionSetup = lazy(() => import('./WhatsAppEvolutionSetup'));

interface WhatsAppSetupProps {
  onConnectionSuccess?: () => void;
}

type Provider = 'select' | 'evolution' | 'meta';

const DEFAULT_ENDPOINT = 'https://graph.facebook.com/v18.0';
const INTEGRATION_NAME = 'whatsapp_oficial';

export default function WhatsAppSetup({ onConnectionSuccess }: WhatsAppSetupProps) {
  const [provider, setProvider] = useState<Provider>('select');
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

  // Auto-detect existing provider
  useEffect(() => {
    if (!tenantId) return;

    const detectProvider = async () => {
      try {
        // Check Evolution first
        const { data: evoConfig } = await supabase
          .from('configuracoes_integracoes')
          .select('status')
          .eq('tenant_id', tenantId)
          .eq('nome_integracao', 'whatsapp_evolution')
          .maybeSingle();

        if (evoConfig) {
          setProvider('evolution');
          return;
        }

        // Check Meta
        const { data: metaConfig } = await supabase
          .from('configuracoes_integracoes')
          .select('api_key, phone_number_id, verify_token')
          .eq('tenant_id', tenantId)
          .eq('nome_integracao', INTEGRATION_NAME)
          .maybeSingle();

        if (metaConfig) {
          setProvider('meta');
          setConfig({
            phoneNumberId: metaConfig.phone_number_id || '',
            accessToken: metaConfig.api_key || '',
            verifyToken: metaConfig.verify_token || 'jurify_secret_token',
          });
          setSaved(true);
        }
      } catch (error) {
        console.error('Failed to detect WhatsApp provider:', error);
      }
    };

    void detectProvider();
  }, [tenantId]);

  const handleSaveMeta = async () => {
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

  // Provider selection screen
  if (provider === 'select') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-emerald-400" />
            Conectar WhatsApp
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Escolha como deseja conectar o WhatsApp ao Jurify.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Evolution API Card */}
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-emerald-500/50 transition-all relative overflow-hidden"
            onClick={() => setProvider('evolution')}
          >
            <div className="absolute top-3 right-3">
              <Badge className="bg-emerald-600 text-white text-xs">Recomendado</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-400" />
                Evolution API
              </CardTitle>
              <CardDescription>Conexao via QR Code (self-hosted)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Sem custo por mensagem</span>
                </div>
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Conecta em 30 segundos via QR Code</span>
                </div>
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Use seu numero pessoal ou empresarial</span>
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Conectar via QR Code
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Meta Official API Card */}
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-blue-500/50 transition-all"
            onClick={() => setProvider('meta')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                Meta Official API
              </CardTitle>
              <CardDescription>API oficial do WhatsApp Business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <Shield className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Zero risco de banimento</span>
                </div>
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Custo por conversa (~R$0.25-0.80)</span>
                </div>
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <ExternalLink className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Requer conta Meta for Developers</span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Configurar API Oficial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Evolution API setup
  if (provider === 'evolution') {
    return (
      <div>
        <div className="px-6 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setProvider('select')}>
            ← Voltar
          </Button>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          }
        >
          <WhatsAppEvolutionSetup onConnectionSuccess={onConnectionSuccess} />
        </Suspense>
      </div>
    );
  }

  // Meta Official API setup (existing flow)
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setProvider('select')}>
          ← Voltar
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setProvider('evolution')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white ml-2"
        >
          <QrCode className="h-4 w-4 mr-2" />
          Usar QR Code (Evolution)
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-blue-400" />
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
              https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook
            </code>
          </div>

          <Button
            onClick={() => void handleSaveMeta()}
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


