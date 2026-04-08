
import { useState, useMemo } from 'react';
import { Search, Plus, RefreshCw, User, TrendingUp } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import PipelineColumn from './PipelineColumn';
import { PIPELINE_STAGES, STAGE_COLORS } from './pipelineConfig';
import { usePageTitle } from '@/hooks/usePageTitle';
import { triggerHaptic } from '@/hooks/useCapacitor';

const fmt = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const PipelineJuridico = () => {
  usePageTitle('Pipeline');
  const [searchTerm, setSearchTerm]               = useState('');
  const [filterArea, setFilterArea]               = useState('all');
  const [filterResponsavel, setFilterResponsavel] = useState('all');
  const [showFormModal, setShowFormModal]         = useState(false);
  const { toast } = useToast();

  const { leads, loading, updateLead, fetchLeads } = useLeads();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => {
      const matchSearch    = lead.nome_completo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false;
      const matchArea      = !filterArea || filterArea === 'all' || lead.area_juridica === filterArea;
      const matchResp      = !filterResponsavel || filterResponsavel === 'all' || lead.responsavel_id === filterResponsavel;
      return matchSearch && matchArea && matchResp;
    });
  }, [leads, debouncedSearch, filterArea, filterResponsavel]);

  const groupedLeads = useMemo(() =>
    PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = filteredLeads.filter(l => l.status === stage.id);
      return acc;
    }, {} as Record<string, Lead[]>),
  [filteredLeads]);

  const areasJuridicas = useMemo(() => [...new Set(leads?.map(l => l.area_juridica).filter(Boolean) ?? [])], [leads]);
  const responsaveis   = useMemo(() => [...new Set(leads?.map(l => l.responsavel_id).filter(Boolean) ?? [])], [leads]);
  const totalPipeline  = useMemo(() => filteredLeads.reduce((s, l) => s + (Number(l.valor_causa) || 0), 0), [filteredLeads]);
  const hasFilter      = searchTerm || (filterArea && filterArea !== 'all') || (filterResponsavel && filterResponsavel !== 'all');

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    void triggerHaptic('medium');
    const fromStage = PIPELINE_STAGES.find(s => s.id === source.droppableId)?.title ?? source.droppableId;
    const toStage   = PIPELINE_STAGES.find(s => s.id === destination.droppableId)?.title ?? destination.droppableId;
    void (async () => {
      const ok = await updateLead(draggableId, { status: destination.droppableId });
      if (ok) {
        void triggerHaptic('success');
        toast({ title: 'Lead movido', description: `${fromStage} → ${toStage}` });
      }
    })();
  };

  const handleRetry       = () => void fetchLeads();
  const handleFormSuccess = () => { setShowFormModal(false); void fetchLeads(); };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="px-6 py-3.5 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-1 border-r border-border p-3 space-y-2.5">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-[88px] w-full rounded-lg" />
              <Skeleton className="h-[88px] w-full rounded-lg" />
              <Skeleton className="h-[88px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent fade-in">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-border/10 bg-background/30 backdrop-blur-md">

        {/* Top row */}
        <div className="flex items-center justify-between gap-4">

          {/* Brand block */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">Pipeline Jurídico</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {leads.length} lead{leads.length !== 1 ? 's' : ''}&nbsp;·&nbsp;{fmt(totalPipeline)}
              </p>
            </div>
          </div>

          {/* Stage pills — visible only on xl+ */}
          <div className="hidden xl:flex items-center gap-1.5 flex-1 overflow-hidden">
            {PIPELINE_STAGES.map(stage => {
              const count  = groupedLeads[stage.id]?.length ?? 0;
              const colors = STAGE_COLORS[stage.color]!;
              return (
                <div
                  key={stage.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium flex-shrink-0 select-none"
                  style={{ borderColor: colors.hex + '35', background: colors.light }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.hex }} />
                  <span className="text-muted-foreground">{stage.title}</span>
                  <span className="font-bold tabular-nums" style={{ color: colors.textColor }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleRetry} className="h-8 text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
            <Button size="sm" onClick={() => setShowFormModal(true)} className="h-8 text-xs gap-1.5" data-testid="btn-novo-lead">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              aria-label="Buscar lead..." placeholder="Buscar lead..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="input-buscar-lead"
              className="h-8 w-44 bg-background/50 border border-border/30 rounded-md pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>

          {/* Area filter */}
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Todas as areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as areas</SelectItem>
              {areasJuridicas.map(a => <SelectItem key={a} value={a ?? 'unknown'}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Responsavel filter */}
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Todos responsaveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsaveis</SelectItem>
              {responsaveis.map(r => <SelectItem key={r} value={r ?? 'unknown'}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasFilter && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterArea('all'); setFilterResponsavel('all'); }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/30 transition-colors"
            >
              Limpar
            </button>
          )}

          {/* Count */}
          <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline tabular-nums">
            {filteredLeads.length}/{leads.length} leads
          </span>
        </div>
      </header>

      {/* ── Kanban board ── */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
          <User className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum lead encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasFilter
              ? 'Tente ajustar os filtros ou limpar a busca'
              : 'Adicione seu primeiro lead para começar'}
          </p>
          {hasFilter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearchTerm(''); setFilterArea('all'); setFilterResponsavel('all'); }}
              className="text-xs"
            >
              Limpar filtros
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowFormModal(true)} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Novo Lead
            </Button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 overflow-x-auto overflow-y-hidden p-6 gap-6 bg-background/5">
            {PIPELINE_STAGES.map((stage, idx) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                colors={STAGE_COLORS[stage.color]!}
                leads={groupedLeads[stage.id] ?? []}
                stageIndex={idx}
                onUpdateLead={updateLead}
                onRefresh={handleRetry}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default PipelineJuridico;
