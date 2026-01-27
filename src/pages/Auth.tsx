
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, ArrowRight, Shield, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PasswordStrength from '@/components/ui/password-strength';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        const { error } = await signUp(email, password, { full_name: nomeCompleto });
        if (error) {
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu email para confirmar sua conta.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(222_47%_8%)] to-[hsl(222_47%_4%)] flex relative overflow-hidden">
      {/* Ultra-Premium Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs - More Sophisticated */}
        <div className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-gradient-to-br from-[hsl(43_96%_56%_/_0.15)] to-[hsl(43_96%_40%_/_0.08)] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -right-40 w-[900px] h-[900px] bg-gradient-to-tl from-[hsl(217_91%_60%_/_0.12)] to-[hsl(217_91%_50%_/_0.06)] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-[hsl(43_96%_56%_/_0.08)] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

        {/* Premium Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        {/* Diagonal Lines Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, hsl(var(--accent)) 60px, hsl(var(--accent)) 61px)`
        }} />

        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Left Side - Ultra-Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-16 text-white">
        <div className="fade-in space-y-16">
          {/* Premium Logo */}
          <div className="flex items-center space-x-5 group">
            <div className="relative">
              {/* Logo Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700" />

              {/* Logo Container */}
              <div className="relative bg-gradient-to-br from-[hsl(43_96%_56%)] via-[hsl(43_96%_48%)] to-[hsl(43_74%_42%)] p-5 rounded-3xl shadow-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-500">
                <Scale className="h-12 w-12 text-[hsl(222_47%_11%)]" strokeWidth={2.5} />
              </div>
            </div>

            <div>
              <h1 className="text-5xl font-bold tracking-tight mb-1 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.03em' }}>
                Jurify
              </h1>
              <div className="flex items-center space-x-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(43_96%_56%)]" />
                <p className="text-sm text-white/60 font-semibold tracking-widest uppercase" style={{ fontSize: '11px' }}>
                  Premium Legal Suite
                </p>
              </div>
            </div>
          </div>

          {/* Premium Value Propositions */}
          <div className="space-y-10 max-w-lg">
            {/* Feature 1 */}
            <div className="slide-in group" style={{ animationDelay: '0.1s' }}>
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(43_96%_56%_/_0.1)] to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative flex items-start space-x-5 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 transition-all duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] rounded-2xl blur-lg opacity-40" />
                    <div className="relative bg-gradient-to-br from-[hsl(43_96%_56%_/_0.2)] to-[hsl(43_96%_42%_/_0.15)] p-4 rounded-2xl backdrop-blur-sm border border-[hsl(43_96%_56%_/_0.3)]">
                      <Shield className="h-7 w-7 text-[hsl(43_96%_56%)]" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Segurança Enterprise
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed font-medium">
                      Criptografia de nível bancário, conformidade LGPD e auditoria contínua para máxima proteção
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="slide-in group" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(217_91%_60%_/_0.1)] to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative flex items-start space-x-5 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 transition-all duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(217_91%_60%)] to-[hsl(217_91%_50%)] rounded-2xl blur-lg opacity-40" />
                    <div className="relative bg-gradient-to-br from-[hsl(217_91%_60%_/_0.2)] to-[hsl(217_91%_50%_/_0.15)] p-4 rounded-2xl backdrop-blur-sm border border-[hsl(217_91%_60%_/_0.3)]">
                      <Sparkles className="h-7 w-7 text-[hsl(217_91%_60%)]" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      IA de Próxima Geração
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed font-medium">
                      Agentes especializados que automatizam análise de processos, contratos e comunicação
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="slide-in group" style={{ animationDelay: '0.3s' }}>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(43_96%_56%_/_0.1)] to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative flex items-start space-x-5 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 transition-all duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] rounded-2xl blur-lg opacity-40" />
                    <div className="relative bg-gradient-to-br from-[hsl(43_96%_56%_/_0.2)] to-[hsl(43_96%_42%_/_0.15)] p-4 rounded-2xl backdrop-blur-sm border border-[hsl(43_96%_56%_/_0.3)]">
                      <Zap className="h-7 w-7 text-[hsl(43_96%_56%)]" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      ROI Comprovado
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed font-medium">
                      Aumente em 10x a produtividade e reduza custos operacionais em até 70%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Social Proof */}
        <div className="fade-in space-y-6" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] border-2 border-[hsl(222_47%_11%)] flex items-center justify-center text-[hsl(222_47%_11%)] font-bold shadow-lg">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">+500 Escritórios</p>
              <p className="text-white/50 text-xs">Confiam no Jurify</p>
            </div>
          </div>

          <blockquote className="relative pl-6 py-4">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(43_96%_56%)] to-transparent rounded-full" />
            <p className="text-white/80 italic text-lg leading-relaxed font-light mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              "Transformou completamente nossa operação. O investimento se pagou em menos de 2 meses."
            </p>
            <p className="text-white/50 text-sm font-medium">— Dr. Roberto Silva, Sócio-fundador</p>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Ultra-Premium Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-lg">
          {/* Premium Card with Glow */}
          <div className="relative group">
            {/* Card Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(43_96%_56%_/_0.3)] via-[hsl(217_91%_60%_/_0.2)] to-[hsl(43_96%_56%_/_0.3)] rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700" />

            <Card className="relative shadow-2xl border-[hsl(var(--card-border))] bg-[hsl(var(--card))]/98 backdrop-blur-2xl rounded-3xl overflow-hidden fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Shine Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

              <CardHeader className="text-center space-y-6 pb-8 pt-10 px-10">
                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center justify-center space-x-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] rounded-2xl blur-lg opacity-50" />
                    <div className="relative bg-gradient-to-br from-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] p-3.5 rounded-2xl shadow-lg">
                      <Scale className="h-9 w-9 text-[hsl(222_47%_11%)]" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      Jurify
                    </h1>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold tracking-wider uppercase">Premium Legal Suite</p>
                  </div>
                </div>

                <div>
                  <CardTitle className="text-3xl font-bold text-[hsl(var(--foreground))] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.02em' }}>
                    {isLogin ? 'Bem-vindo de volta' : 'Comece sua jornada'}
                  </CardTitle>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium leading-relaxed">
                    {isLogin
                      ? 'Acesse sua plataforma premium de automação jurídica'
                      : 'Junte-se a +500 escritórios que transformaram sua operação'}
                  </p>
                </div>

                {/* Trust Badge */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[hsl(var(--accent)_/_0.1)] to-[hsl(var(--accent)_/_0.05)] rounded-full border border-[hsl(var(--accent)_/_0.2)]">
                  <Shield className="h-4 w-4 text-[hsl(var(--accent))]" />
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Certificado Enterprise</span>
                </div>
              </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="nomeCompleto" className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Nome Completo
                  </Label>
                  <Input
                    id="nomeCompleto"
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    required={!isLogin}
                    placeholder="Dr. João da Silva"
                    className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Email Profissional
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@escritorio.com.br"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-12 border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))] transition-all"
                />
                {!isLogin && (
                  <PasswordStrength password={password} showRequirements={true} />
                )}
              </div>

              {/* Premium Submit Button */}
              <div className="relative group">
                {/* Button Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(43_96%_56%)] via-[hsl(43_96%_48%)] to-[hsl(43_96%_56%)] rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

                <Button
                  type="submit"
                  className="relative w-full h-14 bg-gradient-to-r from-[hsl(43_96%_56%)] via-[hsl(43_96%_48%)] to-[hsl(43_74%_49%)] hover:from-[hsl(43_96%_60%)] hover:via-[hsl(43_96%_52%)] hover:to-[hsl(43_74%_53%)] text-[hsl(222_47%_11%)] font-bold text-base shadow-2xl hover:shadow-[hsl(43_96%_56%_/_0.5)] transition-all duration-500 rounded-2xl group/btn overflow-hidden"
                  disabled={loading}
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
                      <span className="font-bold tracking-wide">
                        {isLogin ? 'Acessar Plataforma' : 'Começar Agora'}
                      </span>
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
                  {isLogin ? 'Novo por aqui?' : 'Já tem conta?'}
                </span>
              </div>
            </div>

            {/* Toggle Auth Mode - Premium */}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center px-6 py-4 rounded-2xl text-sm font-bold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] bg-[hsl(var(--accent)_/_0.05)] hover:bg-[hsl(var(--accent)_/_0.1)] border border-[hsl(var(--accent)_/_0.2)] hover:border-[hsl(var(--accent)_/_0.3)] transition-all duration-300 group"
            >
              <span className="flex items-center justify-center space-x-2">
                {!isLogin && <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />}
                <span>{isLogin ? 'Criar uma nova conta' : 'Voltar para login'}</span>
                {isLogin && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>

            {/* Security Notice */}
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted)_/_0.3)] border border-[hsl(var(--border))]">
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center leading-relaxed">
                <Shield className="inline h-3.5 w-3.5 mr-1.5 text-[hsl(var(--accent))]" />
                Seus dados estão protegidos com criptografia de nível bancário e conformidade LGPD
              </p>
            </div>
          </CardContent>
        </Card>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Auth;
