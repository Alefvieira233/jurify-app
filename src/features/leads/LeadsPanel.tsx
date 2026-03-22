import { useState, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, MessageCircle, Edit, Trash2,
  Phone, Scale, User, Users, AlignLeft, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import TimelineConversas from '@/features/timeline/TimelineConversas';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import LeadDrawer from '@/components/forms/LeadDrawer';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getAvatarHex, getInitials } from '@/utils/formatting';

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  novo_lead:         { label: 'Captação',     dot: 'bg-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-500' },
  em_qualificacao:   { label: 'Qualificação', dot: 'bg-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-500' },
  proposta_enviada:  { label: 'Proposta',     dot: 'bg-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-500' },
  contrato_assinado: { label: 'Contrato',     dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  em_atendimento:    { label: 'Execução',     dot: 'bg-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-500' },
  lead_perdido:      { label: 'Arquivado',    dot: 'bg-slate-500',   bg: 'bg-slate-500/10',   text: 'text-slate-500' },
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const LeadsPanel = () => {
  usePageTitle('Contatos (CRM)');
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLead, setEditingLead]   = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; leadId: string; leadNome: string }>({ open: false, leadId: '', leadNome: '' });

  const { leads, loading, error, isEmpty, fetchLeads, deleteLead } = useLeads();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const matchSearch = l.nome_completo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false;
    const matchStatus = filterStatus === '' || l.status === filterStatus;
    return matchSearch && matchStatus;
  }), [leads, debouncedSearch, filterStatus]);

  const totalValue = useMemo(() => filteredLeads.reduce((s, l) => s + (Number(l.valor_causa) || 0), 0), [filteredLeads]);
  const hasFilter = searchTerm || filterStatus;

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex justify-between items-center">
          <div><Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-5 w-96" /></div>
          <Skeleton className="h-10 w-44 rounded-[12px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-[24px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-destructive/20 rounded-[24px] bg-destructive/5">
        <ShieldCheck className="h-16 w-16 text-destructive/40 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Erro ao carregar dados</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">{error}</p>
        <Button onClick={() => void fetchLeads()} size="lg" className="rounded-[12px]">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Lex Obsidian */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" />
            Central de Contatos
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Gestão de Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Visualize, filtre e gerencie todos os contatos que entraram na sua operação, rastreando seus valores e origens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void fetchLeads()} size="icon" className="h-11 w-11 rounded-[12px] border-border/20 shadow-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button onClick={() => setShowFormModal(true)} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
            <Plus className="h-4 w-4" />
            Adicionar Contato
          </Button>
        </div>
      </div>

      {/* Bar / Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato (nome, e-mail)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-11 bg-background/50 border border-border/20 rounded-[12px] px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto min-w-[180px]"
        >
          <option value="">Filtro: Todos os fluxos</option>
          {Object.entries(STATUS_MAP).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-6 px-4">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Volume</p>
            <p className="text-xl font-black">{filteredLeads.length}</p>
          </div>
          <div className="w-px h-8 bg-border/20"></div>
          <div className="text-center min-w-[100px]">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Pipelines Estimado</p>
            <p className="text-xl font-black text-primary truncate max-w-[150px]">
              {fmtCurrency(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {isEmpty && !hasFilter ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/20 rounded-[24px] bg-muted/5">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Base de contatos vazia</h3>
          <p className="text-base text-muted-foreground mb-8 max-w-md">
            Você não tem tickets cadastrados. Preencha manualmente ou ative uma conexão para captar de forma unida.
          </p>
          <Button onClick={() => setShowFormModal(true)} size="lg" className="rounded-[12px]">
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Manualmente
          </Button>
        </div>
      ) : filteredLeads.length === 0 && hasFilter ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-foreground">Sem resultados</h3>
          <p className="text-muted-foreground">O filtro selecionado não encontrou leads correspondentes.</p>
          <Button variant="link" onClick={() => { setSearchTerm(''); setFilterStatus(''); }} className="mt-4 text-primary">
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLeads.map(lead => {
            const sc = STATUS_MAP[lead.status ?? ''] || { label: lead.status || 'Sem status', dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted' };
            const bgAvatar = getAvatarHex(lead.nome_completo ?? 'W');
            const initials = getInitials(lead.nome_completo ?? '?');

            return (
              <div
                key={lead.id}
                onClick={() => setEditingLead(lead)}
                className="group relative bg-background border border-border/10 rounded-[20px] p-5 hover:shadow-2xl hover:shadow-primary/5 hover:border-border/30 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer"
              >
                {/* Glow status */}
                <div className={`absolute -top-10 -right-10 w-28 h-28 blur-[50px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-30 ${sc.bg.replace('/10', '')}`} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 w-full min-w-0 pr-6">
                    <div
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white text-[13px] font-bold shadow-md cursor-pointer shrink-0 border border-background shadow-black/10"
                      style={{ backgroundColor: bgAvatar }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[15px] text-foreground leading-tight truncate" title={lead.nome_completo || ''}>
                        {lead.nome_completo}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${sc.text}`}>
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions Dropdown */}
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[8px]">
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-[12px]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLead(lead.id); setShowTimeline(true); }} className="rounded-[8px] cursor-pointer">
                          <MessageCircle className="h-4 w-4 mr-2" /> Timeline
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }} className="rounded-[8px] cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" /> Editar / Triar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, leadId: lead.id, leadNome: lead.nome_completo ?? '' }); }} className="text-destructive focus:text-destructive rounded-[8px] cursor-pointer">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2 mt-5">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 mr-2 opacity-50" />
                    <span className="truncate">{lead.telefone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Scale className="w-3.5 h-3.5 mr-2 opacity-50" />
                    <span className="truncate">{lead.area_juridica || 'Área não definida'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/5 flex items-center justify-between">
                  {lead.responsavel_id ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 border border-border/10">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-foreground max-w-[90px] truncate">—</span>
                    </div>
                  ) : <span />}
                  
                  {lead.valor_causa ? (
                    <span className={`text-[12px] font-extrabold ${sc.text} truncate pl-2`}>
                      {fmtCurrency(Number(lead.valor_causa))}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/30 font-medium">--</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overlays */}
      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={() => { setShowFormModal(false); void fetchLeads(); }}
      />

      {editingLead && (
        <LeadDrawer
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => {
            if (!open) { setEditingLead(null); void fetchLeads(); }
          }}
          onDelete={() => {
            setConfirmDelete({ open: true, leadId: editingLead.id, leadNome: editingLead.nome_completo ?? '' });
          }}
          onTimelineRequest={() => { setShowTimeline(true); setSelectedLead(editingLead.id); }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => setConfirmDelete(prev => ({ ...prev, open: v }))}
        title="Exclusão de Registro"
        description={`Cuidado: O lead "${confirmDelete.leadNome}" e todo o histórico de conversas associado a ele serão deletados permanentemente.`}
        onConfirm={() => {
          void deleteLead(confirmDelete.leadId);
          setConfirmDelete({ open: false, leadId: '', leadNome: '' });
          if (editingLead?.id === confirmDelete.leadId) setEditingLead(null);
        }}
        destructive
      />

      {showTimeline && selectedLead && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background border border-border/10 rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold">
                  Histórico de Conversação <span className="text-muted-foreground opacity-50 text-sm font-normal"># {selectedLead.slice(0, 8)}</span>
                </h2>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => { setSelectedLead(null); setShowTimeline(false); }}>
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
              <TimelineConversas leadId={selectedLead} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPanel;
