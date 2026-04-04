import { getStatusConfig, type EntityType } from '@/constants/statusConfig';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  entity: EntityType;
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Reusable status badge that uses centralized color configuration.
 *
 * Renders a Badge with WCAG AA compliant colors for the given entity/status
 * combination, with automatic fallback to gray for unknown statuses.
 */
export function StatusBadge({ entity, status, size = 'md', className }: StatusBadgeProps) {
  const config = getStatusConfig(entity, status);
  return (
    <Badge
      className={`${config.bgClass} ${config.textClass} border-transparent${size === 'sm' ? ' text-xs px-1.5 py-0.5' : ''}${className ? ` ${className}` : ''}`}
    >
      {config.label}
    </Badge>
  );
}
