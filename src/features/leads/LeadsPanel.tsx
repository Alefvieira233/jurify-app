
import { useState, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, MessageCircle, Edit, Trash2,
  Phone, Scale, User, Users, LayoutList, LayoutGrid, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import TimelineConversas from '@/features/timeline/TimelineConversas';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import EditarLeadForm from '@/components/forms/EditarLeadForm';
import LeadsKanban from './LeadsKanban';
import { type DropResult } from '@hello-pangea/dnd';

/* ── Status palette (matches Pipeline) ── */
const STATUS_COLORS: Record<string, { hex: string; textColor: string; label: string }> = {
  novo_lead:         { hex: '#2563eb', textColor: '#1d4ed8', label: 'Captação'    },
  em_qualificacao:   { hex: '#d97706', textColor: '#b45309', label: 'Qualificação' },
  proposta_enviada:  { hex: '#4f46e5', textColor: '#4338ca', label: 'Proposta'    },
  contrato_assinado: { hex: '#059669', textColor: '#047857', label: 'Contrato'    },
  em_atendimento:    { hex: '#0284c7', textColor: '#0369a1', label: 'Execução'    },
  lead_perdido:      { hex: '#e11d48', textColor: '#be123c', label: 'Arquivado'   },
};

/* ── Avatar helpers ── */
const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#9333ea','#0d9488'];
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return (p[0]?.charAt(0) ?? '?').toUpperCase();
  return ((p[0]?.charAt(0) ?? '') + (p[p.length - 1]?.charAt(0) ?? '')).toUpperCase();
}
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length] ?? PALETTE[0]!;
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const LeadsPanel = () => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLead, setEditingLead]   = useState<Lead | null>(null);
  const [viewMode, setViewMode]         = useState<'list' | 'kanban'>('list');

  const { leads, loading, error, isEmpty, fetchLeads, deleteLead, updateLead } = useLeads();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const matchSearch = l.nome_completo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false;
    const matchStatus = filterStatus === '' || l.status === filterStatus;
    return matchSearch && matchStatus;
  }), [leads, debouncedSearch, filterStatus]);

  const totalValue = useMemo(() =>
    filteredLeads.reduce((s, l) => s + (Number(l.valor_causa) || 0), 0),
  [filteredLeads]);

  const hasFilter = searchTerm || filterStatus;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.droppableId === result.destination.droppableId) return;
    void updateLead(result.draggableId, { status: result.destination.droppableId });
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <div className="p-4 space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-sm font-bold text-foreground">Gestão de Leads</h1>
            </div>
            <Button size="sm" onClick={() => setShowFormModal(true)} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Novo Lead
            </Button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Erro ao carregar leads</h3>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button size="sm" onClick={() => void fetchLeads()} className="h-8 text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        </div>
        <NovoLeadForm open={showFormModal} onOpenChange={setShowFormModal} onSuccess={() => { setShowFormModal(false); void fetchLeads(); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">

        {/* Top row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">Gestão de Leads</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {leads.length} lead{leads.length !== 1 ? 's' : ''}&nbsp;·&nbsp;{fmtCurrency(totalValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex bg-muted/50 border border-border rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Lista"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${viewMode === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Kanban"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchLeads()} className="h-8 text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
            <Button size="sm" onClick={() => setShowFormModal(true)} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Novo Lead
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
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
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-8 bg-muted/50 border border-border rounded-md px-2.5 text-xs text-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_COLORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterStatus(''); }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/30 transition-colors"
            >
              Limpar
            </button>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline tabular-nums">
            {filteredLeads.length}/{leads.length} leads
          </span>
        </div>
      </header>

      {/* ── Content ── */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <LeadsKanban
            leads={filteredLeads}
            onDragEnd={handleDragEnd}
            onEditLead={setEditingLead}
            onViewTimeline={(id) => { setSelectedLead(id); setShowTimeline(true); }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Empty state — no leads at all */}
          {isEmpty && !searchTerm && !filterStatus && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum lead cadastrado</p>
              <p className="text-xs text-muted-foreground mb-4">
                Crie seu primeiro lead para começar a gerenciar suas oportunidades.
              </p>
              <Button size="sm" onClick={() => setShowFormModal(true)} className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Criar primeiro lead
              </Button>
            </div>
          )}

          {/* No results with active filter */}
          {filteredLeads.length === 0 && hasFilter && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          )}

          {/* Lead rows */}
          <div className="divide-y divide-border">
            {filteredLeads.map(lead => {
              const sc = STATUS_COLORS[lead.status ?? ''] ?? { hex: '#6b7280', textColor: '#6b7280', label: lead.status ?? '' };
              const initials = getInitials(lead.nome_completo ?? '?');
              const bg       = avatarColor(lead.nome_completo ?? '');

              return (
                <div
                  key={lead.id}
                  className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Left accent */}
                  <div
                    className="w-[3px] h-10 rounded-full flex-shrink-0 opacity-60"
                    style={{ background: sc.hex }}
                  />

                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-background"
                    style={{ background: bg }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {lead.nome_completo}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: sc.hex + '1a', color: sc.textColor }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                      {lead.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5 flex-shrink-0" style={{ color: sc.hex }} />
                          {lead.telefone}
                        </span>
                      )}
                      {lead.area_juridica && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-2.5 w-2.5 flex-shrink-0" style={{ color: sc.hex }} />
                          {lead.area_juridica}
                        </span>
                      )}
                      {lead.responsavel && (
                        <span className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5 flex-shrink-0" />
                          {lead.responsavel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  {lead.valor_causa ? (
                    <span
                      className="text-[11px] font-bold tabular-nums flex-shrink-0 hidden sm:block"
                      style={{ color: sc.textColor }}
                    >
                      {fmtCurrency(Number(lead.valor_causa))}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/30 flex-shrink-0 hidden sm:block">—</span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setSelectedLead(lead.id); setShowTimeline(true); }}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                      aria-label="Timeline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLead(lead)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Excluir "${lead.nome_completo}"?\nEsta ação não pode ser desfeita.`)) {
                          void deleteLead(lead.id);
                        }
                      }}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline modal */}
      {showTimeline && selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex justify-between items-center px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">
                Timeline — {leads.find(l => l.id === selectedLead)?.nome_completo}
              </h2>
              <button
                type="button"
                onClick={() => { setSelectedLead(null); setShowTimeline(false); }}
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-52px)]">
              <TimelineConversas leadId={selectedLead} />
            </div>
          </div>
        </div>
      )}

      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={() => { setShowFormModal(false); void fetchLeads(); }}
      />
      {editingLead && (
        <EditarLeadForm
          open={!!editingLead}
          onOpenChange={open => !open && setEditingLead(null)}
          lead={editingLead}
          onSuccess={() => { setEditingLead(null); void fetchLeads(); }}
        />
      )}
    </div>
  );
};

export default LeadsPanel;
