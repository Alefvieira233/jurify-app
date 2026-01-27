
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import OrigemLeadsChart from './OrigemLeadsChart';

interface LeadsPorOrigemChartProps {
  data?: Record<string, number>;
}

const LeadsPorOrigemChart: React.FC<LeadsPorOrigemChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Origem dos Leads</CardTitle>
        <CardDescription>Canais de aquisição de leads</CardDescription>
      </CardHeader>
      <CardContent>
        <OrigemLeadsChart data={data} />
      </CardContent>
    </Card>
  );
};

export default LeadsPorOrigemChart;
