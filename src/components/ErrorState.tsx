import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Erro ao carregar dados',
  message,
  onRetry,
  className,
}) => {
  return (
    <Card className={cn('border-destructive/30', className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>

        {message && (
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            {message}
          </p>
        )}

        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorState;
