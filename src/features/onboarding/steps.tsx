import { Button } from '@/components/ui/button';
import {
  Sparkles,
  MessageCircle,
  Bot,
  Rocket,
  ArrowRight,
  SkipForward,
} from 'lucide-react';

/** Default AI agents shown in step 3. */
const DEFAULT_AGENTS = [
  {
    name: 'Sofia',
    emoji: '\u{1F469}\u{200D}\u{1F4BC}',
    role: 'Triagem & Qualificacao',
    description: 'Primeiro contato com o cliente. Acolhe, qualifica e encaminha ao especialista.',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  },
  {
    name: 'Dr. Lex',
    emoji: '\u{2696}\u{FE0F}',
    role: 'Analise Juridica',
    description: 'Analisa o caso com base na legislacao vigente e prepara pareceres preliminares.',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  },
  {
    name: 'Marcos',
    emoji: '\u{1F4CA}',
    role: 'Estrategia Comercial',
    description: 'Calcula honorarios, propoe estrategias de fechamento e negocia com o cliente.',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  },
] as const;

interface StepProps {
  onNext: () => void;
  onNavigate: (path: string) => void;
  onComplete: () => void;
  isPending: boolean;
}

export const WelcomeStep = ({ onNext }: Pick<StepProps, 'onNext'>) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
      <Sparkles className="w-10 h-10 text-primary" />
    </div>
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Bem-vindo ao Jurify!
      </h1>
      <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
        Vamos configurar seu escritorio em alguns passos rapidos.
      </p>
    </div>
    <Button size="lg" className="mt-4 px-8 text-base font-semibold gap-2" onClick={onNext}>
      Comecar
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);

export const WhatsAppStep = ({ onNext, onNavigate }: Pick<StepProps, 'onNext' | 'onNavigate'>) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
    <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
      <MessageCircle className="w-10 h-10 text-emerald-500" />
    </div>
    <div className="space-y-3">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Conecte seu WhatsApp
      </h2>
      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Receba leads automaticamente e atenda clientes direto pelo WhatsApp integrado ao Jurify.
      </p>
    </div>
    <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
      <Button size="lg" className="px-6 gap-2 font-semibold" onClick={() => onNavigate('/conexoes')}>
        <MessageCircle className="w-4 h-4" />
        Conectar WhatsApp
      </Button>
      <Button variant="ghost" size="lg" className="text-muted-foreground gap-2" onClick={onNext}>
        <SkipForward className="w-4 h-4" />
        Configurar depois
      </Button>
    </div>
  </div>
);

export const AgentsStep = ({ onNext, onNavigate }: Pick<StepProps, 'onNext' | 'onNavigate'>) => (
  <div className="flex-1 flex flex-col gap-5">
    <div className="text-center space-y-2">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Bot className="w-8 h-8 text-violet-500" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Conheca seus agentes</h2>
      <p className="text-muted-foreground text-sm">Seus agentes de IA ja estao prontos para trabalhar!</p>
    </div>
    <div className="grid gap-3">
      {DEFAULT_AGENTS.map((agent) => (
        <div key={agent.name} className={`rounded-xl border bg-gradient-to-r p-4 flex items-start gap-3 ${agent.color}`}>
          <span className="text-2xl mt-0.5" role="img" aria-label={agent.name}>{agent.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{agent.name}</span>
              <span className="text-xs text-muted-foreground">{agent.role}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{agent.description}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between mt-auto pt-2">
      <Button variant="link" className="text-muted-foreground text-sm px-0" onClick={() => onNavigate('/agentes')}>
        Personalizar agentes
      </Button>
      <Button size="lg" className="gap-2 font-semibold" onClick={onNext}>
        Continuar
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

export const DoneStep = ({ onComplete, isPending }: Pick<StepProps, 'onComplete' | 'isPending'>) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-bounce [animation-duration:2s]">
      <Rocket className="w-10 h-10 text-primary" />
    </div>
    <div className="space-y-3">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Seu escritorio esta pronto!</h2>
      <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
        Tudo configurado. Agora e so comecar a usar o Jurify para transformar seu atendimento.
      </p>
    </div>
    <Button size="lg" className="mt-4 px-8 text-base font-semibold gap-2" onClick={onComplete} disabled={isPending}>
      Ir para o Dashboard
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);
