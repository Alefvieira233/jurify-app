import { Filter, Download, FileText, FileType2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { PeriodKey } from './useReportMetrics';
import { PERIOD_LABELS } from './useReportMetrics';
import type { ExportFormat } from './hooks/useReportExport';

interface ReportFiltersProps {
  selectedPeriod: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  /** Optional export handler — when provided, renders an Export dropdown (CSV / PDF / Excel). */
  onExport?: (format: ExportFormat) => void | Promise<void>;
  /** Current export format in-flight, to show loading indicator and disable clicks. */
  exporting?: ExportFormat | null;
}

const ReportFilters = ({
  selectedPeriod,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onExport,
  exporting,
}: ReportFiltersProps) => {
  const isExporting = exporting !== null && exporting !== undefined;
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

      {onExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5"
              disabled={isExporting}
              aria-label="Exportar relatório"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[11px]">Formato de exportação</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isExporting} onClick={() => { void onExport('csv'); }}>
              <FileText className="h-3.5 w-3.5 mr-2" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onClick={() => { void onExport('pdf'); }}>
              <FileType2 className="h-3.5 w-3.5 mr-2" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ReportFilters;
