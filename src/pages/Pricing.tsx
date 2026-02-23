import { useState } from 'react';
import { Check, CreditCard, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface ContactForm {
  nome: string;
  email: string;
  escritorio: string;
  tamanho: string;
  mensagem: string;
}

const ContactModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [form, setForm] = useState<ContactForm>({
    nome: '',
    email: '',
    escritorio: '',
    tamanho: '',
    mensagem: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Nome e email são obrigatórios.',
      });
      return;
    }

    setSubmitting(true);

    const text = encodeURIComponent(
      `Olá! Tenho interesse no plano Enterprise do Jurify. Nome: ${form.nome}, Escritório: ${form.escritorio || 'Não informado'}, Tamanho: ${form.tamanho || 'Não informado'}`
    );
    window.open(`https://wa.me/5596981419460?text=${text}`, '_blank');

    toast.success('Entraremos em contato em até 24h úteis');
    setForm({ nome: '', email: '', escritorio: '', tamanho: '', mensagem: '' });
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Falar com Vendas — Escritório Elite</DialogTitle>
          <DialogDescription>
            Preencha seus dados e entraremos em contato para personalizar seu plano.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="contact-nome">Nome completo *</Label>
            <Input
              id="contact-nome"
              placeholder="Seu nome completo"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-escritorio">Nome do escritório</Label>
            <Input
              id="contact-escritorio"
              placeholder="Nome do escritório"
              value={form.escritorio}
              onChange={(e) => setForm((f) => ({ ...f, escritorio: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-tamanho">Tamanho do escritório</Label>
            <Select value={form.tamanho} onValueChange={(v) => setForm((f) => ({ ...f, tamanho: v }))}>
              <SelectTrigger id="contact-tamanho">
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5 advogados">1-5 advogados</SelectItem>
                <SelectItem value="6-20 advogados">6-20 advogados</SelectItem>
                <SelectItem value="21-50 advogados">21-50 advogados</SelectItem>
                <SelectItem value="50+ advogados">50+ advogados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-mensagem">Mensagem (opcional)</Label>
            <Textarea
              id="contact-mensagem"
              placeholder="Conte-nos sobre suas necessidades..."
              value={form.mensagem}
              onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar e abrir WhatsApp'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Pricing = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const currentTier = profile?.subscription_tier ?? 'free';

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    if (planId === 'enterprise') {
      setContactOpen(true);
      return;
    }

    if (!user) {
      toast.error('Faça login para assinar um plano.');
      return;
    }

    setLoading(planId);

    try {
      const priceIds: Record<string, string> = {
        'pro': import.meta.env.VITE_STRIPE_PRICE_PRO || '',
      };

      const priceId = priceIds[planId];

      if (!priceId) {
        toast.error('Plano não disponível no momento.', {
          description: 'Entre em contato com o suporte.'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId,
          priceId,
          successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${planId}`,
          cancelUrl: `${window.location.origin}/planos?checkout=cancel`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar sessão de pagamento');
      }

      if (!data) {
        throw new Error('Nenhum dado retornado pela Edge Function');
      }

      if (data.url) {
        toast.success('Redirecionando para o pagamento seguro...');

        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } else {
        throw new Error('URL de checkout não retornada');
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tente novamente mais tarde.';
      toast.error('Erro ao iniciar pagamento', {
        description: message
      });
    } finally {
      setLoading(null);
    }
  };

  const getButtonLabel = (plan: typeof plans[number]) => {
    if (loading === plan.id) return 'Processando...';
    if (user && currentTier === plan.id) return 'Plano Ativo';
    return plan.buttonText;
  };

  const isButtonDisabled = (plan: typeof plans[number]) => {
    if (loading === plan.id) return true;
    if (plan.id === 'free' && (!user || currentTier === 'free')) return true;
    if (user && currentTier === plan.id) return true;
    return false;
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
            {user && currentTier === plan.id && (
              <Badge variant="secondary" className="absolute -top-3 left-4 px-3 py-1">
                Seu plano atual
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
                disabled={isButtonDisabled(plan)}
              >
                {getButtonLabel(plan)}
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

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
};

export default Pricing;
