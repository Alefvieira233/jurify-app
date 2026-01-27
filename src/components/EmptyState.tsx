
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className
}) => {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        {Icon && (
          <Icon className="w-12 h-12 text-[hsl(var(--muted-foreground))] mb-4" />
        )}
        
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-md">
            {description}
          </p>
        )}
        
        {action && (
          <Button 
            onClick={action.onClick}
            className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;

