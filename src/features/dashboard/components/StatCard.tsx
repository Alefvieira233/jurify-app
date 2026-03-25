import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon }: StatCardProps) {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {change && (
        <div className={cn(
          'text-xs mt-1',
          changeType === 'positive' && 'text-green-600',
          changeType === 'negative' && 'text-red-600',
          changeType === 'neutral' && 'text-muted-foreground',
        )}>
          {change}
        </div>
      )}
    </div>
  );
}
