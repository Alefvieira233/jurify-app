import { memo } from 'react';
import type { DroppableProvided } from '@hello-pangea/dnd';
import type { KanbanColumn as KanbanColumnType } from './useKanbanGrouping';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KanbanColumnProps {
  column: KanbanColumnType;
  children: React.ReactNode;
  provided: DroppableProvided;
}

export const KanbanColumnComponent = memo(({ column, children, provided }: KanbanColumnProps) => {
  return (
    <div className="flex flex-col min-w-[280px] w-[300px] bg-muted/30 rounded-lg border border-border shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-xs font-semibold text-foreground truncate flex-1">
          {column.label}
        </h3>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 font-bold tabular-nums"
          style={{ backgroundColor: `${column.color}1a`, color: column.color }}
        >
          {column.count}
        </Badge>
      </div>

      {/* Drop zone */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[200px]"
      >
        {column.leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 select-none">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 border-dashed"
              style={{ borderColor: `${column.color}40` }}
            >
              <Inbox className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-[11px] text-muted-foreground/40 font-medium">Sem leads</p>
          </div>
        )}

        {children}

        {provided.placeholder}
      </div>
    </div>
  );
});

KanbanColumnComponent.displayName = 'KanbanColumn';

export default KanbanColumnComponent;
