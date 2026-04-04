import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraftRecoveryBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * Banner shown when a saved form draft is detected, allowing the user
 * to restore or discard the draft.
 */
export function DraftRecoveryBanner({ onRestore, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="flex items-center gap-3 p-3 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
        Você tem um rascunho salvo. Deseja restaurar?
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRestore}>
          Restaurar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard} aria-label="Descartar rascunho">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
