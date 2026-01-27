
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FunilVendasChart from './FunilVendasChart';

interface FunilVendasData {
  novo_lead: number;
  em_qualificacao: number;
  proposta_enviada: number;
  contrato_assinado: number;
  em_atendimento: number;
  lead_perdido: number;
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
