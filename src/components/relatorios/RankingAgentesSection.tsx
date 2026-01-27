
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RankingAgentesTable from './RankingAgentesTable';

interface RankingAgentesSectionProps {
  periodo: string;
}

const RankingAgentesSection: React.FC<RankingAgentesSectionProps> = ({ periodo }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Agentes (IA e Humanos)</CardTitle>
        <CardDescription>Performance dos agentes por leads atendidos e taxa de fechamento</CardDescription>
      </CardHeader>
      <CardContent>
        <RankingAgentesTable periodo={periodo} />
      </CardContent>
    </Card>
  );
};

export default RankingAgentesSection;
