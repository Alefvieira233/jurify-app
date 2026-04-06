import { Scale, Gavel, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProcessosStatsProps {
  totalCount: number;
  statsAtivos: number;
  statsExito: number;
  prazosUrgentesCount: number;
}

export const ProcessosStats = ({ totalCount, statsAtivos, statsExito, prazosUrgentesCount }: ProcessosStatsProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Gavel className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Scale className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">{statsAtivos}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">{statsExito}%</p>
          <p className="text-xs text-muted-foreground">Taxa de Êxito</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Clock className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">{prazosUrgentesCount}</p>
          <p className="text-xs text-muted-foreground">Prazos Urgentes</p>
        </div>
      </CardContent>
    </Card>
  </div>
);
