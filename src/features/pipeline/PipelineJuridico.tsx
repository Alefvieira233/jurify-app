
import { useState, useMemo } from 'react';
import { Search, Plus, RefreshCw, Filter, User, TrendingUp } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import PipelineColumn from './PipelineColumn';

export const PIPELINE_STAGES = [
  { id: 'novo_lead',         title: 'Captação',     color: 'blue'    },
  { id: 'em_qualificacao',   title: 'Qualificação', color: 'amber'   },
  { id: 'proposta_enviada',  title: 'Proposta',     color: 'indigo'  },
  { id: 'contrato_assinado', title: 'Contrato',     color: 'emerald' },
  { id: 'em_atendimento',    title: 'Execução',     color: 'sky'     },
  { id: 'lead_perdido',      title: 'Arquivados',   color: 'rose'    },
];

export type StageColors = { hex: string; light: string; textColor: string };

export const STAGE_COLORS: Record<string, StageColors> = {
  blue:    { hex: '#2563eb', light: 'rgba(37,99,235,0.07)',   textColor: '#1d4ed8' },
  amber:   { hex: '#d97706', light: 'rgba(217,119,6,0.07)',   textColor: '#b45309' },
  indigo:  { hex: '#4f46e5', light: 'rgba(79,70,229,0.07)',   textColor: '#4338ca' },
  emerald: { hex: '#059669', light: 'rgba(5,150,105,0.07)',   textColor: '#047857' },
  sky:     { hex: '#0284c7', light: 'rgba(2,132,199,0.07)',   textColor: '#0369a1' },
  rose:    { hex: '#e11d48', light: 'rgba(225,29,72,0.07)',   textColor: '#be123c' },
};

const fmt = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const PipelineJuridico = () => {
  const [searchTerm, setSearchTerm]               = useState('');
  const [filterArea, setFilterArea]               = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [showFormModal, setShowFormModal]         = useState(false);
  const { toast } = useToast();

  const { leads, loading, updateLead, fetchLeads } = useLeads();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => {
      const matchSearch    = lead.nome_completo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false;
      const matchArea      = filterArea === '' || lead.area_juridica === filterArea;
      const matchResp      = filterResponsavel === '' || lead.responsavel === filterResponsavel;
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
  const responsaveis   = useMemo(() => [...new Set(leads?.map(l => l.responsavel).filter(Boolean) ?? [])], [leads]);
  const totalPipeline  = useMemo(() => filteredLeads.reduce((s, l) => s + (Number(l.valor_causa) || 0), 0), [filteredLeads]);
  const hasFilter      = searchTerm || filterArea || filterResponsavel;

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    void (async () => {
      const ok = await updateLead(draggableId, { status: destination.droppableId });
      if (ok) toast({ title: 'Lead movido', description: 'Estágio atualizado com sucesso.' });
    })();
  };

  const handleRetry       = () => void fetchLeads();
  const handleFormSuccess = () => { setShowFormModal(false); void fetchLeads(); };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
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
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">

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
            <Button size="sm" onClick={() => setShowFormModal(true)} className="h-8 text-xs gap-1.5">
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
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 w-44 bg-muted/50 border border-border rounded-md pl-8 pr-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
            />
          </div>

          {/* Area filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              className="h-8 bg-muted/50 border border-border rounded-md pl-7 pr-5 text-xs text-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
            >
              <option value="">Todas as áreas</option>
              {areasJuridicas.map(a => <option key={a} value={a ?? ''}>{a}</option>)}
            </select>
          </div>

          {/* Responsável filter */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={filterResponsavel}
              onChange={e => setFilterResponsavel(e.target.value)}
              className="h-8 bg-muted/50 border border-border rounded-md pl-7 pr-5 text-xs text-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
            >
              <option value="">Todos responsáveis</option>
              {responsaveis.map(r => <option key={r} value={r ?? ''}>{r}</option>)}
            </select>
          </div>

          {/* Clear filters */}
          {hasFilter && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterArea(''); setFilterResponsavel(''); }}
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
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

      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default PipelineJuridico;
