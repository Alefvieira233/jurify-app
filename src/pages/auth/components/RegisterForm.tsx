import React from 'react';
import { Link } from 'react-router-dom';
import { type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import PasswordStrength from '@/components/ui/password-strength';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type RegisterFormData } from '../schemas';

interface RegisterFormProps {
  form: UseFormReturn<RegisterFormData>;
  lgpdConsent: boolean;
  loading: boolean;
  onLgpdConsentChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  form,
  lgpdConsent,
  loading,
  onLgpdConsentChange,
  onSubmit,
  onSwitchToLogin,
}) => {
  const passwordValue = form.watch('password');

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5" aria-label="Formulário de cadastro">
        <FormField
          control={form.control}
          name="nomeCompleto"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Nome Completo
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Dr. João da Silva"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  data-testid="input-register-nome"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  data-testid="input-register-email"
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
              <FormLabel className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Senha
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  data-testid="input-register-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <PasswordStrength password={passwordValue} showRequirements={true} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Confirmar Senha
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  data-testid="input-register-confirm-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
          <input
            id="lgpdConsent"
            type="checkbox"
            checked={lgpdConsent}
            onChange={(e) => onLgpdConsentChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(43_96%_56%)] cursor-pointer"
          />
          <label htmlFor="lgpdConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            Li e concordo com os{' '}
            <Link to="/termos" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-[hsl(43_96%_56%)] transition-colors">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-[hsl(43_96%_56%)] transition-colors">
              Política de Privacidade
            </Link>
            , incluindo o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>

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
                <span className="font-bold tracking-wide">Começar Agora</span>
                <ArrowRight className="ml-2.5 h-5 w-5 group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={3} />
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Premium Divider */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[hsl(var(--border))]"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[hsl(var(--card))] px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Já tem conta?
          </span>
        </div>
      </div>

      {/* Toggle Auth Mode - Premium */}
      <button
        type="button"
        onClick={onSwitchToLogin}
        className="w-full text-center px-6 py-4 rounded-2xl text-sm font-bold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] bg-[hsl(var(--accent)_/_0.05)] hover:bg-[hsl(var(--accent)_/_0.1)] border border-[hsl(var(--accent)_/_0.2)] hover:border-[hsl(var(--accent)_/_0.3)] transition-all duration-300 group"
      >
        <span className="flex items-center justify-center space-x-2">
          <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para login</span>
        </span>
      </button>
    </>
  );
};

export default RegisterForm;
