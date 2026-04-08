import { cn } from '@/lib/utils';
import type { WizardStep } from './types';

interface WizardProgressBarProps {
  step: WizardStep;
}

const ALL_STEPS = ['API Key', 'Preparar', 'Conectar', 'Pronto'] as const;

function getStepIndex(step: WizardStep): number {
  if (step === 'api-key') return 0;
  if (step === 'prepare') return 1;
  if (step === 'connecting') return 2;
  return 3;
}

const WizardProgressBar = ({ step }: WizardProgressBarProps) => {
  const stepIndex = getStepIndex(step);

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {ALL_STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          {i > 0 && <div className={cn('w-12 h-0.5 mx-1', i <= stepIndex ? 'bg-primary' : 'bg-border')} />}
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:inline',
              i <= stepIndex ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WizardProgressBar;
