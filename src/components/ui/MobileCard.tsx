import { Card } from '@/components/ui/card';
import { ReactNode } from 'react';

interface MobileCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  details?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  onClick?: () => void;
}

export function MobileCard({ title, subtitle, badge, details, actions, onClick }: MobileCardProps) {
  return (
    <Card className={`p-4 ${onClick ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>
      {details && details.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      )}
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </Card>
  );
}
