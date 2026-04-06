import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  darkFrom: string;
  darkTo: string;
  borderColor: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientTo,
  darkFrom,
  darkTo,
  borderColor,
}) => {
  return (
    <Card className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} ${darkFrom} ${darkTo} ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
};
