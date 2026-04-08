/**
 * AnalyticsFilters -- Header with period selector and refresh button.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type Period = '7d' | '30d' | '90d';

interface AnalyticsFiltersProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  onRefresh: () => void;
}

const AnalyticsFilters = React.memo(({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
}: AnalyticsFiltersProps) => (
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      <p className="text-muted-foreground">Visao completa do seu escritorio</p>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted rounded-lg p-1">
        {(['7d', '30d', '90d'] as const).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPeriodChange(period)}
          >
            {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
          </Button>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Atualizar
      </Button>
    </div>
  </div>
));

AnalyticsFilters.displayName = 'AnalyticsFilters';

export { AnalyticsFilters };
export type { AnalyticsFiltersProps, Period };
