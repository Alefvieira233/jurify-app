

import { Scale } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Carregando...', 
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? 'min-h-screen bg-gray-100 flex items-center justify-center'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClasses} role="status" aria-busy="true">
      <div className="text-center">
        <div className="bg-amber-500 p-3 rounded-lg inline-flex items-center justify-center mb-4">
          <Scale className={`${sizeClasses[size]} text-white animate-pulse`} />
        </div>
        <div className={`animate-spin rounded-full border-b-2 border-amber-500 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-gray-600 font-medium">{text}</p>
        <span className="sr-only">{text}</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
