import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  sparkData?: number[];
  sparkColor?: string;
  className?: string;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
      <polygon fill={color} fillOpacity={0.1} points={areaPoints} />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  sparkData,
  sparkColor = 'hsl(var(--primary))',
  className,
}: StatCardProps) {
  return (
    <div className={cn('border border-border rounded-lg p-5 bg-card', className)}>
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
      {sparkData && sparkData.length >= 2 && (
        <MiniSparkline data={sparkData} color={sparkColor} />
      )}
    </div>
  );
}
