import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Building2, Phone, Mail, Link2, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

const escritorioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type EscritorioForm = z.infer<typeof escritorioSchema>;

interface TenantConfig {
  lgpd_enabled?: boolean;
  cookie_consent?: boolean;
  data_retention_days?: number;
}

const EscritorioSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [lgpdConfig, setLgpdConfig] = useState<TenantConfig>({
    lgpd_enabled: true,
    cookie_consent: true,
    data_retention_days: 365,
  });

  const form = useForm<EscritorioForm>({
    resolver: zodResolver(escritorioSchema),
    defaultValues: { nome: '', email: '', telefone: '', logo_url: '' },
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const tenantId = profile.tenant_id;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('nome, email, telefone, logo_url, configuracoes')
          .eq('id', tenantId)
          .single();

        if (error) throw error;
        if (data) {
          form.reset({
            nome: data.nome ?? '',
            email: data.email ?? '',
            telefone: data.telefone ?? '',
            logo_url: data.logo_url ?? '',
          });
          if (data.configuracoes && typeof data.configuracoes === 'object') {
            setLgpdConfig(data.configuracoes as TenantConfig);
          }
        }
      } catch {
        // falha silenciosa — form mantém defaultValues
      }
    })();
  }, [profile?.tenant_id, form]);

  const handleSaveEscritorio = async (data: EscritorioForm) => {
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome: data.nome,
          email: data.email || null,
          telefone: data.telefone || null,
          logo_url: data.logo_url || null,
        })
        .eq('id', profile.tenant_id);

      if (error) throw error;
      toast({ title: 'Escritório atualizado', description: 'Dados do escritório salvos com sucesso.' });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar os dados.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLGPD = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
          .update({ configuracoes: lgpdConfig as unknown as Json })
        .eq('id', profile.tenant_id);

      if (error) throw error;
      toast({ title: 'LGPD atualizado', description: 'Configurações de privacidade salvas.' });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar as configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dados do Escritório */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Dados do Escritório</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Nome, contato e identidade visual do seu escritório
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { void form.handleSubmit(handleSaveEscritorio)(e); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do escritório *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="nome"
                  className="pl-9"
                  placeholder="Ex: Silva & Associados Advocacia"
                  {...form.register('nome')}
                />
              </div>
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_escritorio">E-mail do escritório</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="email_escritorio"
                    type="email"
                    className="pl-9"
                    placeholder="contato@escritorio.com.br"
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="telefone"
                    className="pl-9"
                    placeholder="(11) 99999-9999"
                    {...form.register('telefone')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">URL do logotipo</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="logo_url"
                  type="url"
                  className="pl-9"
                  placeholder="https://seusite.com/logo.png"
                  {...form.register('logo_url')}
                />
              </div>
              {form.formState.errors.logo_url && (
                <p className="text-xs text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Usado em relatórios PDF e e-mails enviados pelo sistema.
              </p>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Salvar dados
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* LGPD */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Privacidade e LGPD</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Configurações de conformidade com a Lei Geral de Proteção de Dados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Conformidade LGPD ativa</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Registra consentimento e dados de auditoria de acesso
              </p>
            </div>
            <Switch
              checked={lgpdConfig.lgpd_enabled ?? true}
              onCheckedChange={(v) => setLgpdConfig((p) => ({ ...p, lgpd_enabled: v }))}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Banner de cookies</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Exibe aviso de cookies para visitantes do sistema
              </p>
            </div>
            <Switch
              checked={lgpdConfig.cookie_consent ?? true}
              onCheckedChange={(v) => setLgpdConfig((p) => ({ ...p, cookie_consent: v }))}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Retenção de dados</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Período máximo de armazenamento de logs (dias)
              </p>
            </div>
            <Input
              type="number"
              min={30}
              max={3650}
              className="w-24 h-8 text-sm text-right"
              value={lgpdConfig.data_retention_days ?? 365}
              onChange={(e) =>
                setLgpdConfig((p) => ({ ...p, data_retention_days: Number(e.target.value) }))
              }
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" disabled={saving} onClick={() => void handleSaveLGPD()} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Salvar LGPD
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EscritorioSection;
