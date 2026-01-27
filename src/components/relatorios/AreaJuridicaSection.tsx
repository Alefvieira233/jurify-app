
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AreaJuridicaChart from './AreaJuridicaChart';

interface AreaJuridicaSectionProps {
  data?: Record<string, number>;
}

const AreaJuridicaSection: React.FC<AreaJuridicaSectionProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads por Área Jurídica</CardTitle>
        <CardDescription>Volume de leads por especialização</CardDescription>
      </CardHeader>
      <CardContent>
        <AreaJuridicaChart data={data} />
      </CardContent>
    </Card>
  );
};

export default AreaJuridicaSection;
