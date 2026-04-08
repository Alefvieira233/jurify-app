
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Shield, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength } from '@/components/ui/password-strength';
import { useBiometrics } from '@/hooks/useBiometrics';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth');
import { Form } from '@/components/ui/form';
import EmailConfirmation from './auth/components/EmailConfirmation';
import LoginForm from './auth/components/LoginForm';
import RegisterForm from './auth/components/RegisterForm';
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from './auth/schemas';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);

  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAvailable: isBiometricsAvailable, authenticate: biometricAuth } = useBiometrics();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nomeCompleto: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const handleBiometricLogin = async () => {
    const success = await biometricAuth();
    if (success) navigate('/');
  };

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLoginSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { data: authData, error } = await signIn(data.email, data.password);

      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          setEmailConfirmationPending(true);
        } else {
          toast({
            title: "Erro no login",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        }
      } else if (authData?.user) {
        toast({
          title: "Login realizado!",
          description: "Redirecionando...",
        });
      }
    } catch (_error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const { isStrong } = validatePasswordStrength(data.password);
      if (!isStrong) {
        toast({
          title: "Senha fraca",
          description: "A senha deve atender pelo menos 4 dos 5 requisitos de segurança.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!lgpdConsent) {
        toast({
          title: "Consentimento obrigatório",
          description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: authData, error } = await signUp(data.email, data.password, { full_name: data.nomeCompleto });
      if (error) {
        const errorMsg = error instanceof Error ? error.message : (error as { message?: string })?.message || '';
        log.error('Signup error', error, { errorMsg });
        toast({
          title: "Erro no cadastro",
          description: errorMsg || toUserMessage(error),
          variant: "destructive",
        });
      } else if (authData?.user) {
        toast({
          title: "Conta criada!",
          description: "Redirecionando...",
        });
        // autoconfirm is ON — user is already logged in, redirect
        navigate('/');
      } else {
        setEmailConfirmationPending(true);
      }
    } catch (_error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailConfirmationPending) {
    const email = isLogin ? loginForm.getValues('email') : registerForm.getValues('email');
    return (
      <EmailConfirmation
        email={email}
        onBackToLogin={() => { setEmailConfirmationPending(false); setIsLogin(true); }}
      />
    );
  }

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
            {isLogin ? (
              <Form {...loginForm}>
                <LoginForm
                  form={loginForm}
                  loading={loading}
                  isBiometricsAvailable={isBiometricsAvailable}
                  onSubmit={(e) => void loginForm.handleSubmit((data) => void handleLoginSubmit(data))(e)}
                  onBiometricLogin={() => { void handleBiometricLogin(); }}
                  onSwitchToRegister={() => setIsLogin(false)}
                />
              </Form>
            ) : (
              <Form {...registerForm}>
                <RegisterForm
                  form={registerForm}
                  lgpdConsent={lgpdConsent}
                  loading={loading}
                  onLgpdConsentChange={setLgpdConsent}
                  onSubmit={(e) => void registerForm.handleSubmit((data) => void handleRegisterSubmit(data))(e)}
                  onSwitchToLogin={() => setIsLogin(true)}
                />
              </Form>
            )}

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
