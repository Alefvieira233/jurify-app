import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PasswordStrength, { validatePasswordStrength } from '@/components/ui/password-strength';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description: 'A senha e a confirmação precisam ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    const { isStrong } = validatePasswordStrength(password);
    if (!isStrong) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve atender pelo menos 4 dos 5 requisitos de segurança.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Senha redefinida!',
        description: 'Sua nova senha foi salva. Redirecionando...',
      });
      navigate('/');
    } catch (_err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível redefinir a senha. O link pode ter expirado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(222_47%_8%)] to-[hsl(222_47%_4%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(43_96%_56%_/_0.3)] via-[hsl(217_91%_60%_/_0.2)] to-[hsl(43_96%_56%_/_0.3)] rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700" />

          <Card className="relative shadow-2xl border-[hsl(var(--card-border))] bg-[hsl(var(--card))]/98 backdrop-blur-2xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center space-y-4 pb-6 pt-10 px-8">
              <div className="flex items-center justify-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] rounded-2xl blur-lg opacity-50" />
                  <div className="relative bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] p-3 rounded-2xl shadow-lg">
                    <Scale className="h-7 w-7 text-[hsl(222_47%_11%)]" strokeWidth={2.5} />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Jurify
                </h1>
              </div>
              <CardTitle className="text-xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Criar nova senha
              </CardTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Defina uma senha forte para sua conta.
              </p>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Nova senha
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] transition-all"
                  />
                  <PasswordStrength password={password} showRequirements={true} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] transition-all"
                  />
                </div>

                <div className="relative group/btn pt-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(43_96%_56%)] to-[hsl(43_74%_49%)] rounded-2xl blur-lg opacity-50 group-hover/btn:opacity-75 transition-opacity duration-500" />
                  <Button
                    type="submit"
                    className="relative w-full h-12 bg-gradient-to-r from-[hsl(43_96%_56%)] to-[hsl(43_74%_49%)] text-[hsl(222_47%_11%)] font-bold rounded-2xl"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar nova senha'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
