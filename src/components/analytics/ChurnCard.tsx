import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserMinus, Heart, TrendingDown, ArrowDownRight } from 'lucide-react';
import { fmtCurrency } from '@/utils/formatting';

interface ChurnCardProps {
  churnRate: number;
  ltv: number;
  canceledThisMonth: number;
  netNewMRR: number;
}

export const ChurnCard: React.FC<ChurnCardProps> = ({
  churnRate,
  ltv,
  canceledThisMonth,
  netNewMRR,
}) => {
  const isHealthy = churnRate < 5;
  const isNegativeMRR = netNewMRR < 0;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Saúde Financeira
        </CardTitle>
        <div className="relative">
          <div className={`relative p-3 rounded-xl ${isHealthy ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {isHealthy ? (
              <Heart className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
            ) : (
              <UserMinus className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Churn Rate */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{ color: isHealthy ? '#059669' : '#e11d48' }}
            >
              {churnRate.toFixed(1)}%
            </span>
            <Badge
              className={`text-[10px] ${isHealthy
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-rose-100 text-rose-800 border-rose-200'
              } border`}
            >
              {isHealthy ? 'Saudável' : 'Atenção'}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Taxa de Churn Mensal
          </p>
        </div>

        {/* Grid: LTV + Net New MRR + Cancelados */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">LTV</div>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5">
              {fmtCurrency(ltv)}
            </div>
          </div>
          <div className="text-center border-x border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Net MRR</div>
            <div className={`text-sm font-bold font-mono mt-0.5 flex items-center justify-center gap-0.5 ${isNegativeMRR ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isNegativeMRR && <ArrowDownRight className="h-3 w-3" />}
              {fmtCurrency(netNewMRR)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cancelados</div>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5 flex items-center justify-center gap-0.5">
              {canceledThisMonth > 0 && <TrendingDown className="h-3 w-3 text-rose-500" />}
              {canceledThisMonth}
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Retenção</span>
            <span className="font-mono">{(100 - churnRate).toFixed(1)}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100 - churnRate, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChurnCard;
