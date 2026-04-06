import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import { PlanCard } from './PlanCard';

interface PlanComparisonProps {
  currentPlan: string;
  upgrading: boolean;
  onUpgrade: (plan: string) => void;
}

export const PlanComparison: React.FC<PlanComparisonProps> = ({
  currentPlan,
  upgrading,
  onUpgrade,
}) => {
  if (currentPlan === 'enterprise') return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-purple-600" />
          Upgrade seu Plano
        </CardTitle>
        <CardDescription>Desbloqueie mais recursos e escale seu escritorio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentPlan === 'free' && (
            <PlanCard
              name="Pro"
              price="R$ 99/mes"
              features={[
                'V 500 chamadas IA/mes',
                'V 1.000 leads',
                'V 10 usuarios',
                'V Suporte prioritario',
              ]}
              buttonLabel="Upgrade para Pro"
              upgrading={upgrading}
              onUpgrade={() => onUpgrade('pro')}
              className="border-2 hover:border-blue-500 transition-colors"
            />
          )}

          <PlanCard
            name="Enterprise"
            price="Sob consulta"
            features={[
              'V Chamadas IA ilimitadas',
              'V Clientes ilimitados',
              'V Usuarios ilimitados',
              'V SLA garantido',
              'V Suporte dedicado',
            ]}
            buttonLabel="Falar com Vendas"
            upgrading={upgrading}
            onUpgrade={() => onUpgrade('enterprise')}
            recommended
            className="border-2 border-purple-500 hover:shadow-lg transition-shadow"
            buttonClassName="bg-purple-600 hover:bg-purple-700"
          />
        </div>
      </CardContent>
    </Card>
  );
};
