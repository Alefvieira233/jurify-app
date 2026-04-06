import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlanCardProps {
  name: string;
  price: string;
  features: string[];
  buttonLabel: string;
  upgrading: boolean;
  onUpgrade: () => void;
  recommended?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  name,
  price,
  features,
  buttonLabel,
  upgrading,
  onUpgrade,
  recommended = false,
  className = '',
  buttonClassName = '',
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          {recommended && <Badge>RECOMENDADO</Badge>}
        </div>
        <CardDescription>{price}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1 mb-4">
          {features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <Button
          onClick={onUpgrade}
          disabled={upgrading}
          className={`w-full ${buttonClassName}`}
        >
          {upgrading ? 'Processando...' : buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
};
