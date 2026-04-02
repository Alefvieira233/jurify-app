import { Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { PeriodKey } from './useReportMetrics';
import { PERIOD_LABELS } from './useReportMetrics';

interface ReportFiltersProps {
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

const ReportFilters = ({
  selectedPeriod,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-muted/20 p-1 border border-border/10 rounded-[14px]">
      <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodKey)}>
        <SelectTrigger className="h-9 w-[180px] text-xs bg-transparent border-0 shadow-none focus:ring-0">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Selecionar período" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key} className="text-xs font-medium">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPeriod === 'personalizado' && (
        <div className="flex items-center gap-1.5 px-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="h-7 w-[130px] text-[11px] bg-background border-border/20 rounded-[8px]"
            aria-label="Data inicial"
          />
          <span className="text-[11px] text-muted-foreground">até</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="h-7 w-[130px] text-[11px] bg-background border-border/20 rounded-[8px]"
            aria-label="Data final"
          />
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
