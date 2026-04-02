import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, X, Sparkles, PartyPopper } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface OnboardingStep {
  id: string;
  number: number;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  actionLabel: string;
}

const STEP_DEFINITIONS = [
  {
    id: 'perfil',
    title: 'Perfil configurado',
    description: 'Preencha seu nome completo e informações básicas do seu perfil.',
    link: '/configuracoes?tab=perfil',
    actionLabel: 'Configurar Perfil',
  },
  {
    id: 'escritorio',
    title: 'Escritório configurado',
    description: 'Configure o nome e dados do seu escritório para personalizar o sistema.',
    link: '/configuracoes?tab=escritorio',
    actionLabel: 'Configurar Escritório',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp conectado',
    description: 'Conecte seu WhatsApp para atendimento automático de clientes.',
    link: '/conexoes',
    actionLabel: 'Conectar WhatsApp',
  },
  {
    id: 'lead',
    title: 'Primeiro lead criado',
    description: 'Cadastre seu primeiro lead para iniciar o pipeline de vendas.',
    link: '/crm',
    actionLabel: 'Criar Lead',
  },
  {
    id: 'agente',
    title: 'Agente IA ativo',
    description: 'Crie um agente de inteligência artificial para automatizar atendimentos.',
    link: '/agentes',
    actionLabel: 'Criar Agente',
  },
  {
    id: 'equipe',
    title: 'Equipe adicionada',
    description: 'Convide membros da sua equipe para colaborar no sistema.',
    link: '/usuarios',
    actionLabel: 'Gerenciar Equipe',
  },
  {
    id: 'departamento',
    title: 'Departamento criado',
    description: 'Organize sua equipe criando departamentos e áreas de atuação.',
    link: '/departamentos',
    actionLabel: 'Criar Departamento',
  },
] as const;

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id || null;

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [allComplete, setAllComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const steps: OnboardingStep[] = useMemo(
    () =>
      STEP_DEFINITIONS.map((def, idx) => ({
        ...def,
        number: idx + 1,
        completed: completionMap[def.id] ?? false,
      })),
    [completionMap],
  );

  const completedCount = useMemo(() => steps.filter((s) => s.completed).length, [steps]);
  const progress = useMemo(
    () => (steps.length > 0 ? (completedCount / steps.length) * 100 : 0),
    [completedCount, steps.length],
  );
  const currentStepIndex = useMemo(
    () => {
      const idx = steps.findIndex((s) => !s.completed);
      return idx === -1 ? 0 : idx;
    },
    [steps],
  );

  const fetchCompletionStatus = useCallback(async () => {
    if (!tenantId || !user) return;

    try {
      // Check if already completed
      const { data: completedSetting } = await supabaseUntyped
        .from('system_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'onboarding_completed')
        .single();

      if (completedSetting?.value === 'true') {
        setVisible(false);
        setLoading(false);
        return;
      }

      // Check if dismissed within the last 24h
      const { data: dismissedSetting } = await supabaseUntyped
        .from('system_settings')
        .select('value, updated_at')
        .eq('tenant_id', tenantId)
        .eq('key', 'onboarding_dismissed')
        .single();

      if (dismissedSetting?.value === 'true' && dismissedSetting.updated_at) {
        const dismissedAt = new Date(dismissedSetting.updated_at as string).getTime();
        if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) {
          setVisible(false);
          setLoading(false);
          return;
        }
      }

      // Run all completion checks in parallel
      const [
        { data: profileData },
        { data: tenantData },
        { data: conexoes },
        { data: leads },
        { data: agentes },
        { data: userRoles },
        { data: departamentos },
      ] = await Promise.all([
        supabaseUntyped.from('profiles').select('nome_completo').eq('id', user.id).single(),
        supabaseUntyped.from('tenants').select('nome').eq('id', tenantId).single(),
        supabaseUntyped.from('conexoes_whatsapp').select('id').eq('tenant_id', tenantId).eq('status', 'connected').limit(1),
        supabaseUntyped.from('leads').select('id').eq('tenant_id', tenantId).limit(1),
        supabaseUntyped.from('agentes_ia').select('id').eq('tenant_id', tenantId).limit(1),
        supabaseUntyped.from('user_roles').select('id').eq('tenant_id', tenantId),
        supabaseUntyped.from('departamentos').select('id').eq('tenant_id', tenantId).limit(1),
      ]);

      const map: Record<string, boolean> = {
        perfil: Boolean(profileData?.nome_completo && String(profileData.nome_completo).trim().length > 0),
        escritorio: Boolean(tenantData?.nome && String(tenantData.nome).trim().length > 0),
        whatsapp: Array.isArray(conexoes) && conexoes.length > 0,
        lead: Array.isArray(leads) && leads.length > 0,
        agente: Array.isArray(agentes) && agentes.length > 0,
        equipe: Array.isArray(userRoles) && userRoles.length > 1,
        departamento: Array.isArray(departamentos) && departamentos.length > 0,
      };

      setCompletionMap(map);

      const allDone = Object.values(map).every(Boolean);
      setAllComplete(allDone);
      if (allDone) {
        setShowCelebration(true);
      }

      setVisible(true);
    } catch (err) {
      console.warn('[OnboardingFlow] fetchCompletionStatus failed:', err);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user]);

  useEffect(() => {
    if (user && profile && hasRole('admin')) {
      void fetchCompletionStatus();
    } else {
      setLoading(false);
    }
  }, [user, profile, hasRole, fetchCompletionStatus]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);

    if (!tenantId) return;
    try {
      await supabaseUntyped.from('system_settings').upsert({
        tenant_id: tenantId,
        key: 'onboarding_dismissed',
        value: 'true',
        category: 'sistema',
        description: 'Onboarding dispensado pelo administrador',
      });
    } catch (err) {
      console.warn('[OnboardingFlow] handleDismiss failed:', err);
    }
  }, [tenantId]);

  const handleComplete = useCallback(async () => {
    if (!tenantId) return;

    try {
      await supabaseUntyped.from('system_settings').upsert({
        tenant_id: tenantId,
        key: 'onboarding_completed',
        value: 'true',
        category: 'sistema',
        description: 'Onboarding concluído pelo administrador',
      });

      setVisible(false);

      toast({
        title: 'Configuração concluída!',
        description: 'Parabéns! Seu escritório Jurify está 100% configurado.',
      });
    } catch (err) {
      console.error('[OnboardingFlow] handleComplete failed:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o progresso. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [tenantId, toast]);

  const handleNavigate = useCallback(
    (link: string) => {
      setVisible(false);
      navigate(link);
    },
    [navigate],
  );

  if (loading || !visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-border">
        {/* Header */}
        <CardHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Configuração Inicial</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => { void handleDismiss(); }}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{completedCount} de 7 concluídas</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 w-full" />
          </div>
        </CardHeader>

        {/* Steps list */}
        <CardContent className="flex-1 overflow-y-auto space-y-3 pb-0">
          {/* Celebration banner */}
          {showCelebration && allComplete && (
            <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 p-4 mb-2">
              <PartyPopper className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  Tudo pronto! Parabéns!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Todas as 7 etapas foram concluídas. Seu escritório está 100% configurado.
                </p>
              </div>
            </div>
          )}

          {steps.map((step) => {
            const isCurrent = step.number - 1 === currentStepIndex && !step.completed;

            return (
              <div
                key={step.id}
                className={`rounded-lg border transition-all ${
                  step.completed
                    ? 'border-green-500/30 bg-green-500/5'
                    : isCurrent
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-muted/30'
                } ${isCurrent ? 'p-4' : 'p-3'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Step indicator */}
                  <div className="shrink-0 mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {step.number}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-medium text-sm ${
                          step.completed ? 'text-green-700 dark:text-green-400' : 'text-foreground'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <Badge
                        variant={step.completed ? 'default' : 'outline'}
                        className={`text-[10px] px-1.5 py-0 ${
                          step.completed
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20'
                            : ''
                        }`}
                      >
                        {step.completed ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </div>

                    {(isCurrent || step.completed) && (
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    )}

                    {isCurrent && !step.completed && (
                      <Button
                        size="sm"
                        className="mt-3 h-8 text-xs"
                        onClick={() => handleNavigate(step.link)}
                      >
                        {step.actionLabel}
                        <ArrowRight className="h-3 w-3 ml-1.5" />
                      </Button>
                    )}
                  </div>

                  {/* Action for non-current incomplete steps */}
                  {!isCurrent && !step.completed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs text-muted-foreground"
                      onClick={() => handleNavigate(step.link)}
                    >
                      Configurar
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>

        {/* Footer */}
        <div className="shrink-0 p-6 pt-4 flex items-center justify-between border-t border-border mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { void handleDismiss(); }}
          >
            Pular por agora
          </Button>

          {allComplete && (
            <Button size="sm" onClick={() => { void handleComplete(); }}>
              <PartyPopper className="h-4 w-4 mr-2" />
              Concluir Configuração
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
