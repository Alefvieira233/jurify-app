import React from 'react';
import { Link } from 'react-router-dom';
import { type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Fingerprint } from 'lucide-react';
import ForgotPasswordDialog from './ForgotPasswordDialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type LoginFormData } from '../schemas';

interface LoginFormProps {
  form: UseFormReturn<LoginFormData>;
  loading: boolean;
  isBiometricsAvailable: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBiometricLogin: () => void;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  form,
  loading,
  isBiometricsAvailable,
  onSubmit,
  onBiometricLogin,
  onSwitchToRegister,
}) => {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5" aria-label="Formulário de login">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Email Profissional
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="seu@escritorio.com.br"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Senha
                </FormLabel>
                <ForgotPasswordDialog />
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Premium Submit Button */}
        <div className="relative group">
          {/* Button Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(43_96%_56%)] via-[hsl(43_96%_48%)] to-[hsl(43_96%_56%)] rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

          <Button
            type="submit"
            className="relative w-full h-14 bg-gradient-to-r from-[hsl(43_96%_56%)] via-[hsl(43_96%_48%)] to-[hsl(43_74%_49%)] hover:from-[hsl(43_96%_60%)] hover:via-[hsl(43_96%_52%)] hover:to-[hsl(43_74%_53%)] text-[hsl(222_47%_11%)] font-bold text-base shadow-2xl hover:shadow-[hsl(43_96%_56%_/_0.5)] transition-all duration-500 rounded-2xl group/btn overflow-hidden"
            disabled={loading}
            data-testid="btn-auth-submit"
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />

            {loading ? (
              <span className="relative flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-[hsl(222_47%_11%)] border-t-transparent rounded-full animate-spin mr-3" />
                <span className="font-bold">Processando...</span>
              </span>
            ) : (
              <span className="relative flex items-center justify-center">
                <span className="font-bold tracking-wide">Acessar Plataforma</span>
                <ArrowRight className="ml-2.5 h-5 w-5 group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={3} />
              </span>
            )}
          </Button>
        </div>
      </form>

      {isBiometricsAvailable && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 mt-2"
          onClick={onBiometricLogin}
        >
          <Fingerprint className="h-4 w-4" />
          Entrar com biometria
        </Button>
      )}

      {/* Premium Divider */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[hsl(var(--border))]"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[hsl(var(--card))] px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Novo por aqui?
          </span>
        </div>
      </div>

      {/* Toggle Auth Mode - Premium */}
      <button
        type="button"
        onClick={onSwitchToRegister}
        className="w-full text-center px-6 py-4 rounded-2xl text-sm font-bold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] bg-[hsl(var(--accent)_/_0.05)] hover:bg-[hsl(var(--accent)_/_0.1)] border border-[hsl(var(--accent)_/_0.2)] hover:border-[hsl(var(--accent)_/_0.3)] transition-all duration-300 group"
      >
        <span className="flex items-center justify-center space-x-2">
          <span>Criar uma nova conta</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>

      {/* Legal footer (LGPD/OAB compliance) */}
      <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
        Ao acessar, você aceita os{' '}
        <Link to="/termos" target="_blank" className="underline hover:text-[hsl(var(--accent))] transition-colors">
          Termos de Uso
        </Link>{' '}
        e a{' '}
        <Link to="/privacidade" target="_blank" className="underline hover:text-[hsl(var(--accent))] transition-colors">
          Política de Privacidade
        </Link>
        .
      </p>
    </>
  );
};

export default LoginForm;
