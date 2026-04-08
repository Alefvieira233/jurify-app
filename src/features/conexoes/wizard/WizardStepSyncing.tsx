import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SYNC_STEPS } from './types';

interface WizardStepSyncingProps {
  syncStep: number;
}

const WizardStepSyncing = ({ syncStep }: WizardStepSyncingProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold mb-8">Conectando seu WhatsApp...</h2>
      <div className="w-full max-w-xs space-y-4">
        {SYNC_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            {i < syncStep ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              : i === syncStep ? <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
              : <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />}
            <span className={cn('text-sm',
              i < syncStep ? 'text-foreground' :
              i === syncStep ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WizardStepSyncing;
