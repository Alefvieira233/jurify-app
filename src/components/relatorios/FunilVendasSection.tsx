
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FunilVendasChart from './FunilVendasChart';

interface FunilVendasData {
  novo: number;
  em_contato: number;
  qualificado: number;
  proposta: number;
  negociacao: number;
  ganho: number;
  perdido: number;
}

interface FunilVendasSectionProps {
  data?: FunilVendasData;
}

const FunilVendasSection: React.FC<FunilVendasSectionProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas Jurídico</CardTitle>
        <CardDescription>Distribuição de leads por etapa do processo</CardDescription>
      </CardHeader>
      <CardContent>
        <FunilVendasChart data={data} />
      </CardContent>
    </Card>
  );
};

export default FunilVendasSection;
