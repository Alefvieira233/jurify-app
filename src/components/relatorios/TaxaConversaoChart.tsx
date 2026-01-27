
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ConversaoChart from './ConversaoChart';

interface TaxaConversaoChartProps {
  periodo: string;
}

const TaxaConversaoChart: React.FC<TaxaConversaoChartProps> = ({ periodo }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxa de Conversão</CardTitle>
        <CardDescription>Evolução da conversão ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ConversaoChart periodo={periodo} />
      </CardContent>
    </Card>
  );
};

export default TaxaConversaoChart;
