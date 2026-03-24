import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useConexoes } from '@/hooks/useConexoes';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useLeadTagsBatch } from '@/hooks/useLeadTagsBatch';
import { useRBAC } from '@/hooks/useRBAC';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useKanbanGrouping, type GroupBy } from './useKanbanGrouping';
import { KanbanToolbar } from './KanbanToolbar';
import { KanbanColumnComponent } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import LeadDrawer from '@/features/leads/LeadDrawer';

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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { toast } = useToast();
  const { leads, loading, updateLead } = useLeads();
  const { conexoes } = useConexoes();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const { leadTagsMap } = useLeadTagsBatch();
  const { can, canInDepartment, isAdmin, isManager } = useRBAC();
  const debouncedSearch = useDebounce(search, 300);

  // Build lookup maps
  const conexaoMap = useMemo(
    () => new Map((conexoes ?? []).map((c) => [c.id, c.nome])),
    [conexoes],
  );

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
        const matchEmail = (lead.email ?? '').toLowerCase().includes(term);
        if (!matchNome && !matchTel && !matchEmail) return false;
      }

      return true;
    });
  }, [leads, debouncedSearch, showArchived]);

  // Group into columns — pass real departamentos and profiles
  const { columns } = useKanbanGrouping(
    filteredLeads,
    groupBy,
    activeDepartamentos,
    members,
    conexoes,
  );

  // Check drag permission
  const canDrag = useCallback(
    (lead: Lead, targetGroupBy: GroupBy): boolean => {
      if (isAdmin || isManager) return true;
      if (!can('pipeline', 'update')) return false;

      // Department-specific checks
      if (targetGroupBy === 'departamento' && lead.departamento_id) {
        return canInDepartment(lead.departamento_id, 'mover');
      }
      if (targetGroupBy === 'responsavel' && lead.departamento_id) {
        return canInDepartment(lead.departamento_id, 'atribuir');
      }
      return true;
    },
    [isAdmin, isManager, can, canInDepartment],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const lead = filteredLeads.find((l) => l.id === draggableId);
      if (lead && !canDrag(lead, groupBy)) {
        toast({ title: 'Sem permissão', description: 'Você não tem permissão para mover este lead.', variant: 'destructive' });
        return;
      }

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
    [groupBy, columns, updateLead, toast, filteredLeads, canDrag],
  );

  // Card click handler — open drawer
  const handleCardClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }, []);

  // When drawer closes, refresh the selected lead from latest data
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      // Keep selectedLead for smooth animation; will be refreshed on next open
      setTimeout(() => setSelectedLead(null), 300);
    }
  }, []);

  // Keep selectedLead in sync with latest leads data
  const currentLead = useMemo(() => {
    if (!selectedLead) return null;
    return leads?.find((l) => l.id === selectedLead.id) ?? selectedLead;
  }, [selectedLead, leads]);

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
                          tags={leadTagsMap.get(lead.id)}
                          conexaoNome={lead.conexao_id ? conexaoMap.get(lead.conexao_id) : undefined}
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

      {/* Lead Drawer */}
      <LeadDrawer
        lead={currentLead}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />
    </div>
  );
};

export default KanbanOperacional;
