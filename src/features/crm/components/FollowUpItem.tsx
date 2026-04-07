import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime as fmtDt } from '@/utils/formatting';

/* Priority badge classes */
const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-rose-100  text-rose-700  border-rose-200  dark:bg-rose-900/30  dark:text-rose-300',
  high:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  medium: 'bg-blue-100  text-blue-700  border-blue-200  dark:bg-blue-900/30  dark:text-blue-300',
  low:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baixa',
};

export interface FollowUpItemProps {
  fu: { id: string; title: string; lead_name: string; scheduled_at: string; status: string; priority: string };
}

const FollowUpItem = memo(({ fu }: FollowUpItemProps) => (
  <div
    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
      fu.status === 'overdue' ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-muted/40 hover:bg-muted/70'
    }`}
  >
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${fu.status === 'overdue' ? 'bg-rose-600 dark:bg-rose-500' : 'bg-amber-600 dark:bg-amber-500'}`}
    />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground truncate">{fu.title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {fu.lead_name} · {fmtDt(fu.scheduled_at)}
      </p>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      {fu.status === 'overdue' && (
        <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">Atrasado</Badge>
      )}
      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_CLS[fu.priority] ?? PRIORITY_CLS.low}`}>
        {PRIORITY_LABEL[fu.priority] ?? fu.priority}
      </span>
    </div>
  </div>
));

FollowUpItem.displayName = 'FollowUpItem';

export default FollowUpItem;
