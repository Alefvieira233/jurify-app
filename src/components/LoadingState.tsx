
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  showSpinner?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text = 'Carregando...',
  className,
  showSpinner = true
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn(
      'flex items-center justify-center gap-2 p-4',
      className
    )}>
      {showSpinner && (
        <Loader2 className={cn(
          'animate-spin text-blue-600',
          sizeClasses[size]
        )} />
      )}
      {text && (
        <span className={cn(
          'text-muted-foreground font-medium',
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingState;
