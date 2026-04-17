import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ArrowRight, SkipForward, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import {
  EscritorioOnboardingSchema,
  type EscritorioOnboardingInput,
  stripCnpjMask,
} from '@/schemas/domain';

const log = createLogger('EscritorioStep');

/**
 * Format a digit-only CNPJ string as `XX.XXX.XXX/0001-XX`, padding/truncating
 * as the user types. Non-digits are stripped first.
 */
function formatCnpj(raw: string): string {
  const digits = stripCnpjMask(raw).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

interface EscritorioStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const EscritorioStep = ({ onNext, onSkip }: EscritorioStepProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EscritorioOnboardingInput>({
    resolver: zodResolver(EscritorioOnboardingSchema),
    defaultValues: {
      nome_escritorio: '',
      cnpj: '',
      endereco: '',
      telefone_principal: '',
      logo_url: '',
    },
  });

  // Prefill from existing tenant row so repeat visits show saved data.
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const tenantId = profile.tenant_id;
    void (async () => {
      try {
        const { data } = await supabase
          .from('tenants')
          // Tenants columns added in 20260417000010 may not be in types.ts yet
          // until `supabase gen types` is re-run — hence the generic select.
          .select('nome, logo_url, telefone_principal, cnpj, endereco')
          .eq('id', tenantId)
          .maybeSingle();
        if (data) {
          form.reset({
            nome_escritorio: (data as { nome?: string | null }).nome ?? '',
            cnpj: (data as { cnpj?: string | null }).cnpj ?? '',
            endereco: (data as { endereco?: string | null }).endereco ?? '',
            telefone_principal:
              (data as { telefone_principal?: string | null }).telefone_principal ?? '',
            logo_url: (data as { logo_url?: string | null }).logo_url ?? '',
          });
        }
      } catch (err) {
        log.warn('prefill failed', { error: String(err) });
      }
    })();
  }, [profile?.tenant_id, form]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleLogoUpload = async (file: File) => {
    if (!profile?.tenant_id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no maximo 2 MB.',
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${profile.tenant_id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: signed } = await supabase.storage
        .from('tenant-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
      if (signed?.signedUrl) {
        form.setValue('logo_url', signed.signedUrl, { shouldDirty: true });
      }
      toast({ title: 'Logo carregado' });
    } catch (err) {
      log.error('logo upload failed', err);
      toast({
        title: 'Falha no upload',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: EscritorioOnboardingInput) => {
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nome: values.nome_escritorio,
        cnpj: values.cnpj ? stripCnpjMask(values.cnpj) : null,
        endereco: values.endereco || null,
        telefone_principal: values.telefone_principal || null,
        logo_url: values.logo_url || null,
      };
      const { error } = await supabase
        .from('tenants')
        .update(payload as never)
        .eq('id', profile.tenant_id);
      if (error) throw error;
      toast({ title: 'Escritorio salvo' });
      onNext();
    } catch (err) {
      log.error('save escritorio failed', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Nao foi possivel salvar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Seu escritorio
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Personalize o Jurify com os dados da sua banca.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(handleSubmit)(e);
          }}
          className="space-y-3"
        >
          <FormField
            control={form.control}
            name="nome_escritorio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do escritorio *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Silva & Associados"
                    autoComplete="organization"
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      firstInputRef.current = el;
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00.000.000/0001-00"
                    inputMode="numeric"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="telefone_principal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone principal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      type="tel"
                      autoComplete="tel"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereco</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rua, numero, cidade"
                      autoComplete="street-address"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="logo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                    <label
                      className="inline-flex items-center gap-1 px-3 h-10 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent whitespace-nowrap"
                      aria-label="Carregar arquivo de logo"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleLogoUpload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </FormControl>
                <FormDescription className="text-[11px]">
                  PNG/JPG ate 2 MB. Usado em relatorios e emails.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={onSkip}
            >
              <SkipForward className="w-4 h-4" />
              Pular por agora
            </Button>
            <Button type="submit" size="lg" className="gap-2 font-semibold" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EscritorioStep;
