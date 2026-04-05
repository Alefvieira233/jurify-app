import { Users, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fmtCurrency as fmt } from '@/utils/formatting';

const KPI_COLORS = {
  blue:    { hex: '#2563eb', bg: 'rgba(37,99,235,0.08)'   },
  emerald: { hex: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  amber:   { hex: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  rose:    { hex: '#e11d48', bg: 'rgba(225,29,72,0.08)'   },
};

export interface KPICardsProps {
  totalLeads: number;
  totalPipelineValue: number;
  pendingFollowUps: number;
  overdueCount: number;
  hotLeads: number;
}

export default function KPICards({ totalLeads, totalPipelineValue, pendingFollowUps, overdueCount, hotLeads }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* Leads */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Clientes no Pipeline</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{totalLeads}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: KPI_COLORS.blue.bg }}>
              <Users className="h-4.5 w-4.5" style={{ color: KPI_COLORS.blue.hex }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Valor Total Pipeline</p>
              <p className="text-lg font-bold tabular-nums mt-0.5 truncate">{fmt(totalPipelineValue)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: KPI_COLORS.emerald.bg }}>
              <DollarSign className="h-4.5 w-4.5" style={{ color: KPI_COLORS.emerald.hex }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Follow-ups Pendentes</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{pendingFollowUps}</p>
              {overdueCount > 0 && (
                <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" /> {overdueCount} atrasados
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: KPI_COLORS.amber.bg }}>
              <Clock className="h-4.5 w-4.5" style={{ color: KPI_COLORS.amber.hex }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hot leads */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Clientes Quentes</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{hotLeads}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: KPI_COLORS.rose.bg }}>
              <TrendingUp className="h-4.5 w-4.5" style={{ color: KPI_COLORS.rose.hex }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
