import { useState } from 'react';
import { Check, CreditCard, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 'R$ 0',
    description: 'Para advogados autônomos iniciando a jornada com IA.',
    features: [
      '1 Agente de IA Básico',
      '50 Leads/mês',
      'CRM Básico',
      'Agenda Integrada'
    ],
    limitations: [
      'Sem suporte prioritário',
      'Sem API de WhatsApp',
      'Sem relatórios avançados'
    ],
    buttonText: 'Plano Atual',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para escritórios em crescimento que precisam de escala.',
    features: [
      '10 Agentes de IA Avançados',
      'Leads Ilimitados',
      'Integração WhatsApp Oficial',
      'Suporte Prioritário',
      'Relatórios de Performance',
      'Automação de Contratos'
    ],
    buttonText: 'Assinar Profissional',
    highlight: true,
    badge: 'Mais Popular'
  },
  {
    id: 'enterprise',
    name: 'Escritório Elite',
    price: 'R$ 299',
    period: '/mês',
    description: 'Para grandes bancas jurídicas com alta demanda.',
    features: [
      '100 Agentes Personalizados',
      'White Label (Sua Marca)',
      'API Access',
      'Gerente de Conta Dedicado',
      'Treinamento de IA Exclusivo',
      'SLA Garantido'
    ],
    buttonText: 'Falar com Vendas',
    highlight: false
  }
];

const Pricing = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    // Verificar se usuário está autenticado
    if (!user) {
      toast.error('Faça login para assinar um plano.');
      return;
    }

    setLoading(planId);

    try {
      // 1. Busca Price IDs do ambiente (configurados no .env)
      const priceIds: Record<string, string> = {
        'pro': import.meta.env.VITE_STRIPE_PRICE_PRO || '',
        'enterprise': import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || ''
      };

      const priceId = priceIds[planId];

      if (!priceId) {
        console.error('❌ Price ID não configurado para plano:', planId);
        toast.error('Configuração de preço não encontrada', {
          description: 'Entre em contato com o suporte para configurar seu plano.'
        });
        return;
      }

      console.log('💳 Iniciando checkout para plano:', planId);
      console.log('   Price ID:', priceId);

      // 2. Chama Edge Function para criar sessão de checkout
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId,
          priceId,
          successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${planId}`,
          cancelUrl: `${window.location.origin}/planos?checkout=cancel`,
        }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        throw new Error(error.message || 'Erro ao criar sessão de pagamento');
      }

      if (!data) {
        throw new Error('Nenhum dado retornado pela Edge Function');
      }

      if (data.url) {
        console.log('✅ Checkout URL recebida, redirecionando...');
        toast.success('Redirecionando para o pagamento seguro...');

        // Pequeno delay para o usuário ver o toast
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } else {
        throw new Error('URL de checkout não retornada');
      }

    } catch (err: unknown) {
      console.error('Erro ao iniciar checkout:', err);
      const message = err instanceof Error ? err.message : 'Tente novamente mais tarde.';
      toast.error('Erro ao iniciar pagamento', {
        description: message
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planos e Preços</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para revolucionar seu escritório jurídico com Inteligência Artificial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${plan.highlight ? 'border-primary shadow-lg scale-105' : ''}`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 right-4 px-3 py-1">
                {plan.badge}
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="mt-4 flex items-baseline text-gray-900 dark:text-gray-100">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.period && <span className="ml-1 text-xl font-semibold text-muted-foreground">{plan.period}</span>}
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="ml-3 text-sm">{feature}</p>
                  </li>
                ))}
                {plan.limitations?.map((limitation) => (
                  <li key={limitation} className="flex items-start text-muted-foreground opacity-70">
                    <div className="flex-shrink-0">
                      <Zap className="h-5 w-5" />
                    </div>
                    <p className="ml-3 text-sm">{limitation}</p>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlight ? 'default' : 'outline'}
                onClick={() => void handleSubscribe(plan.id)}
                disabled={loading === plan.id || plan.id === 'free'}
              >
                {loading === plan.id ? 'Processando...' : plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 text-center">
        <div className="p-6 bg-card rounded-lg border">
          <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Segurança Jurídica</h3>
          <p className="text-muted-foreground">Seus dados protegidos com criptografia de ponta a ponta e compliance com LGPD.</p>
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <Zap className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">IA de Alta Performance</h3>
          <p className="text-muted-foreground">Agentes treinados especificamente para o direito brasileiro e processual.</p>
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pagamento Seguro</h3>
          <p className="text-muted-foreground">Processamento via Stripe com garantia de segurança e cancelamento a qualquer momento.</p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

