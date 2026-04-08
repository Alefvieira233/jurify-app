import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';
import OnboardingProgress from './components/OnboardingProgress';
import CelebrationBanner from './components/CelebrationBanner';
import OnboardingStepItem from './components/OnboardingStepItem';

const log = createLogger('OnboardingFlow');

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
  { id: 'perfil', title: 'Perfil configurado', description: 'Preencha seu nome completo e informacoes basicas do seu perfil.', link: '/configuracoes?tab=perfil', actionLabel: 'Configurar Perfil' },
  { id: 'escritorio', title: 'Escritorio configurado', description: 'Configure o nome e dados do seu escritorio para personalizar o sistema.', link: '/configuracoes?tab=escritorio', actionLabel: 'Configurar Escritorio' },
  { id: 'whatsapp', title: 'WhatsApp conectado', description: 'Conecte seu WhatsApp para atendimento automatico de clientes.', link: '/conexoes', actionLabel: 'Conectar WhatsApp' },
  { id: 'lead', title: 'Primeiro lead criado', description: 'Cadastre seu primeiro lead para iniciar o pipeline de vendas.', link: '/crm', actionLabel: 'Criar Lead' },
  { id: 'agente', title: 'Agente IA ativo', description: 'Crie um agente de inteligencia artificial para automatizar atendimentos.', link: '/agentes', actionLabel: 'Criar Agente' },
  { id: 'equipe', title: 'Equipe adicionada', description: 'Convide membros da sua equipe para colaborar no sistema.', link: '/usuarios', actionLabel: 'Gerenciar Equipe' },
  { id: 'departamento', title: 'Departamento criado', description: 'Organize sua equipe criando departamentos e areas de atuacao.', link: '/departamentos', actionLabel: 'Criar Departamento' },
] as const;

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface OnboardingData {
  visible: boolean;
  completionMap: Record<string, boolean>;
  allComplete: boolean;
}

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAdmin } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id || null;

  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isAdminWithAuth = isAdmin && !!user && !!profile;

  const { data: onboardingData, isLoading: loading } = useQuery<OnboardingData>({
    queryKey: queryKeys.onboardingStatus.detail(tenantId, user?.id),
    queryFn: async () => {
      if (!tenantId || !user) return { visible: false, completionMap: {}, allComplete: false };

      const { data: completedSetting } = await supabase
        .from('system_settings').select('value').eq('tenant_id', tenantId).eq('key', 'onboarding_completed').maybeSingle();
      if (completedSetting?.value === 'true') return { visible: false, completionMap: {}, allComplete: true };

      const { data: dismissedSetting } = await supabase
        .from('system_settings').select('value, updated_at').eq('tenant_id', tenantId).eq('key', 'onboarding_dismissed').maybeSingle();
      if (dismissedSetting?.value === 'true' && dismissedSetting.updated_at) {
        const dismissedAt = new Date(dismissedSetting.updated_at as string).getTime();
        if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return { visible: false, completionMap: {}, allComplete: false };
      }

      const [{ data: profileData }, { data: tenantData }, { data: conexoes }, { data: leads }, { data: agentes }, { data: userRoles }, { data: departamentos }] = await Promise.all([
        supabase.from('profiles').select('nome_completo').eq('id', user.id).maybeSingle(),
        supabase.from('tenants').select('nome').eq('id', tenantId).maybeSingle(),
        supabase.from('conexoes_whatsapp').select('id').eq('tenant_id', tenantId).eq('status', 'connected').limit(1),
        supabase.from('leads').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('agentes_ia').select('id').eq('tenant_id', tenantId).limit(1),
        supabase.from('user_roles').select('id').eq('tenant_id', tenantId),
        supabase.from('departamentos').select('id').eq('tenant_id', tenantId).limit(1),
      ]);

      const completionMap: Record<string, boolean> = {
        perfil: Boolean(profileData?.nome_completo && String(profileData.nome_completo).trim().length > 0),
        escritorio: Boolean(tenantData?.nome && String(tenantData.nome).trim().length > 0),
        whatsapp: Array.isArray(conexoes) && conexoes.length > 0,
        lead: Array.isArray(leads) && leads.length > 0,
        agente: Array.isArray(agentes) && agentes.length > 0,
        equipe: Array.isArray(userRoles) && userRoles.length > 1,
        departamento: Array.isArray(departamentos) && departamentos.length > 0,
      };

      const allComplete = Object.values(completionMap).every(Boolean);
      if (allComplete) setShowCelebration(true);
      return { visible: true, completionMap, allComplete };
    },
    enabled: !!isAdminWithAuth && !!tenantId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const visible = !dismissed && (onboardingData?.visible ?? false);
  const completionMap = useMemo(() => onboardingData?.completionMap ?? {}, [onboardingData?.completionMap]);
  const allComplete = onboardingData?.allComplete ?? false;

  const steps: OnboardingStep[] = useMemo(
    () => STEP_DEFINITIONS.map((def, idx) => ({ ...def, number: idx + 1, completed: completionMap[def.id] ?? false })),
    [completionMap],
  );

  const completedCount = useMemo(() => steps.filter((s) => s.completed).length, [steps]);
  const progress = useMemo(() => (steps.length > 0 ? (completedCount / steps.length) * 100 : 0), [completedCount, steps.length]);
  const currentStepIndex = useMemo(() => { const idx = steps.findIndex((s) => !s.completed); return idx === -1 ? 0 : idx; }, [steps]);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await supabase.from('system_settings').upsert({ tenant_id: tenantId, key: 'onboarding_dismissed', value: 'true', category: 'sistema', description: 'Onboarding dispensado pelo administrador' });
    },
    onMutate: () => { setDismissed(true); },
    onError: (err) => { log.warn('handleDismiss failed', { error: String(err) }); },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Tenant not found');
      await supabase.from('system_settings').upsert({ tenant_id: tenantId, key: 'onboarding_completed', value: 'true', category: 'sistema', description: 'Onboarding concluido pelo administrador' });
    },
    onSuccess: () => {
      setDismissed(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus.all });
      toast({ title: 'Configuracao concluida!', description: 'Parabens! Seu escritorio Jurify esta 100% configurado.' });
    },
    onError: (err) => {
      log.error('handleComplete failed', err);
      toast({ title: 'Erro ao salvar', description: 'Nao foi possivel salvar o progresso. Tente novamente.', variant: 'destructive' });
    },
  });

  const handleDismiss = useCallback(() => { dismissMutation.mutate(); }, [dismissMutation]);
  const handleComplete = useCallback(() => { completeMutation.mutate(); }, [completeMutation]);
  const handleNavigate = useCallback((link: string) => { setDismissed(true); navigate(link); }, [navigate]);

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-border">
        <OnboardingProgress
          completedCount={completedCount}
          total={steps.length}
          progress={progress}
          onDismiss={handleDismiss}
        />

        <CardContent className="flex-1 overflow-y-auto space-y-3 pb-0">
          <CelebrationBanner show={showCelebration && allComplete} />

          {steps.map((step) => (
            <OnboardingStepItem
              key={step.id}
              step={step}
              isCurrent={step.number - 1 === currentStepIndex && !step.completed}
              onNavigate={handleNavigate}
            />
          ))}
        </CardContent>

        <div className="shrink-0 p-6 pt-4 flex items-center justify-between border-t border-border mt-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleDismiss}>
            Pular por agora
          </Button>
          {allComplete && (
            <Button size="sm" onClick={handleComplete} disabled={completeMutation.isPending}>
              <PartyPopper className="h-4 w-4 mr-2" />
              Concluir Configuracao
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
