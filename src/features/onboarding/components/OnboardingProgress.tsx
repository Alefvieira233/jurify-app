import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, X } from 'lucide-react';

interface OnboardingProgressProps {
  completedCount: number;
  total: number;
  progress: number;
  onDismiss: () => void;
}

const OnboardingProgress = ({
  completedCount,
  total,
  progress,
  onDismiss,
}: OnboardingProgressProps) => {
  return (
    <CardHeader className="pb-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Configuracao Inicial</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{completedCount} de {total} concluidas</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 w-full" />
      </div>
    </CardHeader>
  );
};

export default OnboardingProgress;
