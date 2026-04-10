import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('MinhaContaSection');

const perfilSchema = z.object({
  nome_completo: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
});

type PerfilForm = z.infer<typeof perfilSchema>;

const MinhaContaSection = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome_completo: profile?.nome_completo ?? '',
      telefone: (profile as { telefone?: string })?.telefone ?? '',
      cargo: (profile as { cargo?: string })?.cargo ?? '',
    },
  });

  const handleSave = async (data: PerfilForm) => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo: data.nome_completo,
          telefone: data.telefone || null,
          cargo: data.cargo || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas.' });
    } catch (err) {
      log.error('save failed', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const userInitial = (profile?.nome_completo ?? user?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Dados Pessoais</CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Nome, cargo, telefone e email da conta
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(handleSave)(e);
            }}
            className="space-y-4"
          >
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{profile?.nome_completo || '—'}</p>
                <p>{user?.email}</p>
                <p className="mt-0.5 capitalize">
                  {profile?.role ?? 'user'} · Plano {profile?.subscription_tier ?? 'free'}
                </p>
              </div>
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Advogado sênior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_readonly">Email</Label>
              <Input
                id="email_readonly"
                value={user?.email ?? ''}
                readOnly
                className="bg-muted/40 cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">
                O email não pode ser alterado diretamente. Entre em contato com o suporte se necessário.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Salvar alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MinhaContaSection;
