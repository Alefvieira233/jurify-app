import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Play, X, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  link?: string;
}

const OnboardingFlow = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id || null;

  const checkOnboardingStatus = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: setting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'onboarding_completed')
        .single();

      if (setting?.value === 'true') {
        return;
      }

      const [
        { data: googleSettings },
        { data: apiKeys },
        { data: agentes },
        { data: usuarios }
      ] = await Promise.all([
        supabase.from('google_calendar_settings').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('api_keys').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('agentes_ia').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('user_roles').select('id').eq('tenant_id', tenantId).gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const onboardingSteps: OnboardingStep[] = [
        {
          id: 'welcome',
          title: 'Bem-vindo ao Jurify',
          description: 'Configure seu sistema de automacao juridica',
          completed: true
        },
        {
          id: 'google_calendar',
          title: 'Integracao Google Calendar',
          description: 'Configure a sincronizacao de agendamentos',
          completed: (googleSettings && googleSettings.length > 0) || false,
          link: '/?tab=configuracoes'
        },
        {
          id: 'api_keys',
          title: 'Configurar API Keys',
          description: 'Configure chaves para integracoes externas',
          completed: (apiKeys && apiKeys.length > 0) || false,
          link: '/?tab=configuracoes'
        },
        {
          id: 'agentes_ia',
          title: 'Criar Agentes IA',
          description: 'Configure seus assistentes virtuais',
          completed: (agentes && agentes.length > 0) || false,
          link: '/?tab=agentes'
        },
        {
          id: 'usuarios',
          title: 'Gerenciar Usuarios',
          description: 'Convide sua equipe para o sistema',
          completed: (usuarios && usuarios.length > 1) || false,
          link: '/?tab=usuarios'
        }
      ];

      setSteps(onboardingSteps);

      const hasIncompleteSteps = onboardingSteps.some(step => !step.completed);
      if (hasIncompleteSteps) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (user && profile && hasRole('administrador')) {
      void checkOnboardingStatus();
    }
  }, [user, profile, hasRole, checkOnboardingStatus]);

  const completeOnboarding = async () => {
    if (!tenantId) return;

    try {
      await supabase
        .from('system_settings')
        .upsert({
          tenant_id: tenantId,
          key: 'onboarding_completed',
          value: 'true',
          category: 'sistema',
          description: 'Onboarding do administrador foi concluido'
        });

      setShowOnboarding(false);

      toast({
        title: 'Configuracao concluida!',
        description: 'Seu sistema Jurify esta pronto para uso.'
      });
    } catch (error) {
      console.error('Erro ao concluir onboarding:', error);
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  if (!showOnboarding) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Configuracao Inicial - Jurify
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnboarding(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{completedSteps} de {steps.length} etapas concluidas</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-4 rounded-lg border transition-colors ${
                step.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <Badge variant="outline">
                      {step.completed ? 'Concluido' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>

                  {!step.completed && step.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = step.link!;
                        setShowOnboarding(false);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-1">Tutorial em Video</h4>
                <p className="text-sm text-muted-foreground">
                  Assista ao guia completo do sistema
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Assistir
              </Button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setShowOnboarding(false)}
            >
              Fazer Depois
            </Button>

            {progress === 100 && (
              <Button onClick={() => { void completeOnboarding(); }}>
                Finalizar Configuracao
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
