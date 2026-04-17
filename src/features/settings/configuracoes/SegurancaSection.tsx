import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength } from '@/components/ui/password-strength';
import { createLogger } from '@/lib/logger';

const log = createLogger('SegurancaSection');
import PasswordStrength from '@/components/ui/password-strength';

const senhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'Informe a senha atual'),
    nova_senha: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.nova_senha === d.confirmar_senha, {
    message: 'As senhas não conferem',
    path: ['confirmar_senha'],
  });

type SenhaForm = z.infer<typeof senhaSchema>;

const SegurancaSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [novaSenhaValue, setNovaSenhaValue] = useState('');

  const form = useForm<SenhaForm>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { senha_atual: '', nova_senha: '', confirmar_senha: '' },
  });

  const handleSave = async (data: SenhaForm) => {
    const { isStrong } = validatePasswordStrength(data.nova_senha);
    if (!isStrong) {
      toast({
        title: 'Senha fraca',
        description: 'A nova senha deve atender pelo menos 4 dos 5 requisitos de segurança.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (!user?.email) throw new Error('Usuário sem email');
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.senha_atual,
      });
      if (authError) {
        toast({
          title: 'Senha atual incorreta',
          description: 'Verifique sua senha atual e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: data.nova_senha });
      if (error) throw error;

      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      form.reset();
      setNovaSenhaValue('');
    } catch (err) {
      log.error('save failed', err);
      toast({
        title: 'Erro ao alterar senha',
        description: 'Não foi possível alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alterar Senha */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Alterar Senha</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Defina uma nova senha segura para sua conta
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
              <FormField
                control={form.control}
                name="senha_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nova_senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setNovaSenhaValue(e.target.value);
                        }}
                      />
                    </FormControl>
                    {novaSenhaValue && <PasswordStrength password={novaSenhaValue} />}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmar_senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  variant="outline"
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  Alterar senha
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
};

export default SegurancaSection;
