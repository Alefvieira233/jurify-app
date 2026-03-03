import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Lock, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength } from '@/components/ui/password-strength';
import PasswordStrength from '@/components/ui/password-strength';

const perfilSchema = z.object({
  nome_completo: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
});

const senhaSchema = z.object({
  senha_atual: z.string().min(1, 'Informe a senha atual'),
  nova_senha: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
  confirmar_senha: z.string(),
}).refine(d => d.nova_senha === d.confirmar_senha, {
  message: 'As senhas não conferem',
  path: ['confirmar_senha'],
});

type PerfilForm = z.infer<typeof perfilSchema>;
type SenhaForm = z.infer<typeof senhaSchema>;

const PerfilSection = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [novaSenhaValue, setNovaSenhaValue] = useState('');

  const perfilForm = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome_completo: profile?.nome_completo ?? '' },
  });

  const senhaForm = useForm<SenhaForm>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { senha_atual: '', nova_senha: '', confirmar_senha: '' },
  });

  const handleSavePerfil = async (data: PerfilForm) => {
    if (!profile?.id) return;
    setSavingPerfil(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome_completo: data.nome_completo })
        .eq('id', profile.id);

      if (error) throw error;
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas.' });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar o perfil.', variant: 'destructive' });
    } finally {
      setSavingPerfil(false);
    }
  };

  const handleSaveSenha = async (data: SenhaForm) => {
    const { isStrong } = validatePasswordStrength(data.nova_senha);
    if (!isStrong) {
      toast({
        title: 'Senha fraca',
        description: 'A nova senha deve atender pelo menos 4 dos 5 requisitos de segurança.',
        variant: 'destructive',
      });
      return;
    }

    setSavingSenha(true);
    try {
      // Re-authenticate to validate current password
      if (!user?.email) throw new Error('Usuário sem email');
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.senha_atual,
      });
      if (authError) {
        toast({ title: 'Senha atual incorreta', description: 'Verifique sua senha atual e tente novamente.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: data.nova_senha });
      if (error) throw error;

      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      senhaForm.reset();
      setNovaSenhaValue('');
    } catch {
      toast({ title: 'Erro ao alterar senha', description: 'Não foi possível alterar a senha.', variant: 'destructive' });
    } finally {
      setSavingSenha(false);
    }
  };

  const userInitial = (profile?.nome_completo ?? user?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Dados pessoais */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Dados Pessoais</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Nome de exibição e email da conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void perfilForm.handleSubmit(handleSavePerfil)(e); }} className="space-y-4">
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
                <p className="mt-0.5 capitalize">{profile?.role ?? 'user'} · Plano {profile?.subscription_tier ?? 'free'}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome completo *</Label>
              <Input
                id="nome_completo"
                placeholder="Seu nome completo"
                {...perfilForm.register('nome_completo')}
              />
              {perfilForm.formState.errors.nome_completo && (
                <p className="text-xs text-destructive">{perfilForm.formState.errors.nome_completo.message}</p>
              )}
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
              <Button type="submit" size="sm" disabled={savingPerfil} className="gap-2">
                {savingPerfil ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Alterar Senha</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Defina uma nova senha segura para sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void senhaForm.handleSubmit(handleSaveSenha)(e); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha_atual">Senha atual *</Label>
              <Input
                id="senha_atual"
                type="password"
                placeholder="••••••••"
                {...senhaForm.register('senha_atual')}
              />
              {senhaForm.formState.errors.senha_atual && (
                <p className="text-xs text-destructive">{senhaForm.formState.errors.senha_atual.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova_senha">Nova senha *</Label>
              <Input
                id="nova_senha"
                type="password"
                placeholder="••••••••"
                {...senhaForm.register('nova_senha', {
                  onChange: (e) => setNovaSenhaValue(e.target.value),
                })}
              />
              {novaSenhaValue && <PasswordStrength password={novaSenhaValue} />}
              {senhaForm.formState.errors.nova_senha && (
                <p className="text-xs text-destructive">{senhaForm.formState.errors.nova_senha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha">Confirmar nova senha *</Label>
              <Input
                id="confirmar_senha"
                type="password"
                placeholder="••••••••"
                {...senhaForm.register('confirmar_senha')}
              />
              {senhaForm.formState.errors.confirmar_senha && (
                <p className="text-xs text-destructive">{senhaForm.formState.errors.confirmar_senha.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={savingSenha} variant="outline" className="gap-2">
                {savingSenha ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                Alterar senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerfilSection;
