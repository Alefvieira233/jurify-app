import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useConexoes } from '@/hooks/useConexoes';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useKanbanGrouping, type GroupBy } from './useKanbanGrouping';
import { KanbanToolbar } from './KanbanToolbar';
import { KanbanColumnComponent } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

/** Maps GroupBy value to the lead field that should be updated on drag */
const GROUP_TO_FIELD: Record<GroupBy, string> = {
  status:       'status',
  departamento: 'departamento_id',
  responsavel:  'responsavel_id',
  origem:       'origem',
  prioridade:   'prioridade',
  conexao:      'conexao_id',
};

const KanbanOperacional = () => {
  usePageTitle('Pipeline');

  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const { toast } = useToast();
  const { leads, loading, updateLead } = useLeads();
  const { conexoes } = useConexoes();
  const debouncedSearch = useDebounce(search, 300);

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      // Archived filter
      if (!showArchived && lead.arquivado_em) return false;
      if (showArchived && !lead.arquivado_em) return false;

      // Search filter
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchNome = (lead.nome_completo ?? lead.nome ?? '').toLowerCase().includes(term);
        const matchTel = (lead.telefone ?? '').toLowerCase().includes(term);
        if (!matchNome && !matchTel) return false;
      }

      return true;
    });
  }, [leads, debouncedSearch, showArchived]);

  // Group into columns
  const { columns } = useKanbanGrouping(filteredLeads, groupBy, undefined, undefined, conexoes);

  // Handle drag end
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const field = GROUP_TO_FIELD[groupBy];
      const targetValue = destination.droppableId.startsWith('__') ? null : destination.droppableId;

      const sourceCol = columns.find((c) => c.id === source.droppableId);
      const destCol = columns.find((c) => c.id === destination.droppableId);

      void (async () => {
        const ok = await updateLead(draggableId, { [field]: targetValue } as Record<string, unknown>);
        if (ok) {
          toast({
            title: 'Lead movido',
            description: `${sourceCol?.label ?? source.droppableId} \u2192 ${destCol?.label ?? destination.droppableId}`,
          });
        }
      })();
    },
    [groupBy, columns, updateLead, toast],
  );

  // Card click handler
  const handleCardClick = useCallback((_lead: Lead) => {
    // Future: open lead detail drawer/modal
  }, []);

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-8 w-[180px]" />
          <Skeleton className="h-8 w-[260px]" />
          <Skeleton className="h-5 w-[140px]" />
        </div>
        <div className="flex gap-4 p-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-col-${i}`} className="min-w-[280px] w-[300px] space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <KanbanToolbar
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        search={search}
        onSearchChange={setSearch}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 overflow-x-auto pb-4 flex-1">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(droppableProvided) => (
                <KanbanColumnComponent column={column} provided={droppableProvided}>
                  {column.leads.map((lead, index) => (
                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                      {(draggableProvided) => (
                        <KanbanCard
                          lead={lead}
                          onClick={handleCardClick}
                          provided={draggableProvided}
                        />
                      )}
                    </Draggable>
                  ))}
                </KanbanColumnComponent>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanOperacional;
