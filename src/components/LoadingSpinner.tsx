

import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner = ({
  size = 'md',
  text,
  fullScreen = false
}: LoadingSpinnerProps) => {
  const { t } = useTranslation();
  const displayText = text ?? t('common.loading');
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? 'min-h-screen bg-muted flex items-center justify-center'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClasses} role="status" aria-busy="true">
      <div className="text-center">
        <div className="bg-amber-500 p-3 rounded-lg inline-flex items-center justify-center mb-4">
          <Scale className={`${sizeClasses[size]} text-white animate-pulse`} />
        </div>
        <div className={`animate-spin rounded-full border-b-2 border-amber-500 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-muted-foreground font-medium">{displayText}</p>
        <span className="sr-only">{displayText}</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
