
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Target, DollarSign } from 'lucide-react';

interface KPI {
  titulo: string;
  valor: string | number;
  mudanca?: number;
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
}

interface KPICardsProps {
  kpis?: {
    totalLeads: number;
    contratosAssinados: number;
    valorTotalContratos: number;
    taxaConversao: number;
  };
  isLoading?: boolean;
}

const KPICards: React.FC<KPICardsProps> = ({ kpis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpisCards: KPI[] = [
    {
      titulo: 'Total de Leads',
      valor: kpis?.totalLeads || 0,
      mudanca: 12,
      icon: Users,
      cor: 'text-blue-600'
    },
    {
      titulo: 'Contratos Assinados',
      valor: kpis?.contratosAssinados || 0,
      mudanca: 8,
      icon: Target,
      cor: 'text-green-600'
    },
    {
      titulo: 'Valor Total',
      valor: `R$ ${((kpis?.valorTotalContratos || 0) / 1000).toFixed(0)}k`,
      mudanca: 15,
      icon: DollarSign,
      cor: 'text-purple-600'
    },
    {
      titulo: 'Taxa de Conversão',
      valor: `${(kpis?.taxaConversao || 0).toFixed(1)}%`,
      mudanca: -2,
      icon: TrendingUp,
      cor: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpisCards.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{kpi.titulo}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.valor}</p>
              </div>
              <div className={`p-3 rounded-full bg-gray-100 ${kpi.cor}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
            {kpi.mudanca && (
              <div className="flex items-center mt-3">
                {kpi.mudanca > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${kpi.mudanca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(kpi.mudanca)}% vs mês anterior
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
