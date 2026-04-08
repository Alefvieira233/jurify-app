import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface OnboardingStep {
  id: string;
  number: number;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  actionLabel: string;
}

interface OnboardingStepItemProps {
  step: OnboardingStep;
  isCurrent: boolean;
  onNavigate: (link: string) => void;
}

const OnboardingStepItem = React.memo(function OnboardingStepItem({
  step,
  isCurrent,
  onNavigate,
}: OnboardingStepItemProps) {
  return (
    <div
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
              {step.completed ? 'Concluido' : 'Pendente'}
            </Badge>
          </div>

          {(isCurrent || step.completed) && (
            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
          )}

          {isCurrent && !step.completed && (
            <Button
              size="sm"
              className="mt-3 h-8 text-xs"
              onClick={() => onNavigate(step.link)}
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
            onClick={() => onNavigate(step.link)}
          >
            Configurar
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default OnboardingStepItem;
