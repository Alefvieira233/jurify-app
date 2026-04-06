
import { useState, useMemo, lazy, Suspense } from 'react';
import { Plus, Search, Calendar, RefreshCw, Eye, Edit, Trash2, LayoutGrid, CalendarDays } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import type { Agendamento } from '@/hooks/useAgendamentos';
import { fmtMessageTime } from '@/utils/formatting';

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit' });
const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short' });
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NovoAgendamentoForm } from './components/NovoAgendamentoForm';
import { DetalhesAgendamento } from './components/DetalhesAgendamento';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import { usePageTitle } from '@/hooks/usePageTitle';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { getStatusClasses, getStatusLabel } from '@/constants/statusConfig';

const CalendarPanel = lazy(() => import('./components/CalendarPanel'));

type ViewMode = 'list' | 'calendar';

const AgendamentosManager = () => {
  usePageTitle('Agenda');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const { agendamentos, loading, error, isEmpty, fetchAgendamentos, deleteAgendamento } = useAgendamentos();
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: '', label: '' });

  const filteredAgendamentos = useMemo(() => agendamentos.filter(agendamento => {
    const matchesSearch = agendamento.responsavel?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || false;
    const matchesStatus = !filterStatus || filterStatus === 'all' || agendamento.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [agendamentos, debouncedSearchTerm, filterStatus]);

  const getStatusColor = (status: string) => getStatusClasses('agendamentos', status);
  const getAgendamentoLabel = (status: string) => getStatusLabel('agendamentos', status);

  const handleRetry = () => {
    fetchAgendamentos();
  };

  const handleOpenDetails = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setIsDetalhesOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetalhesOpen(false);
    setSelectedAgendamento(null);
    fetchAgendamentos();
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="px-5 py-2 border-b border-border/50 flex-shrink-0">
          <div className="flex gap-3">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="flex-1 flex items-center justify-center px-5 py-4">
          <ErrorState title="Erro ao carregar agendamentos" message={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="flex-shrink-0 px-8 py-6 border-b border-border/5 bg-background">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                <Calendar className="w-3.5 h-3.5" />
                Operação Local
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Tarefas & Reuniões
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Organize sua agenda e da equipe jurídica em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setIsNovoAgendamentoOpen(true)} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
                <Plus className="h-4 w-4" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-4">
          <EmptyState
            icon={Calendar}
            title="Nenhum agendamento"
            description="Comece criando seu primeiro agendamento para organizar suas reuniões."
            action={{
              label: 'Criar primeiro agendamento',
              onClick: () => setIsNovoAgendamentoOpen(true),
            }}
            className="border-0 shadow-none"
          />
        </div>

        <Dialog open={isNovoAgendamentoOpen} onOpenChange={setIsNovoAgendamentoOpen}>
          <DialogContent className="w-[95vw] max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <NovoAgendamentoForm onClose={() => {
              setIsNovoAgendamentoOpen(false);
              fetchAgendamentos();
            }} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background fade-in">
      {/* Header Lex Obsidian */}
      <div className="flex-shrink-0 px-8 py-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
              <Calendar className="w-3.5 h-3.5" />
              Operação Local
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Tarefas & Reuniões
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Organize reuniões, audiências e prioridades da equipe em tempo real. ({agendamentos.length} abertos)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-muted/30 border border-border/10 rounded-[12px] overflow-hidden p-1 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={cn('h-9 px-4 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-2 transition-all', viewMode === 'list' ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="h-4 w-4" /> Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn('h-9 px-4 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-2 transition-all', viewMode === 'calendar' ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <CalendarDays className="h-4 w-4" /> Grade
              </button>
            </div>
            <Button variant="outline" size="icon" onClick={handleRetry} className="h-11 w-11 rounded-[12px] border-border/20 shadow-sm">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button onClick={() => setIsNovoAgendamentoOpen(true)} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <div className="flex-1 min-h-0 px-3 py-2">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          }>
            <CalendarPanel onNewAgendamento={() => setIsNovoAgendamentoOpen(true)} />
          </Suspense>
        </div>
      ) : (
      <>
      {/* Filters Area */}
      <div className="px-8 pb-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10 shadow-inner">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
            <Input
              placeholder="Buscar por responsável, nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px] focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Filtro: Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filtro: Todos os Status</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="reagendado">Reagendado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Body */}
      {/* Body List */}
      <div className="flex-1 overflow-y-auto px-8 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredAgendamentos.map((agendamento) => {
            const scColor = getStatusColor(agendamento.status ?? '');
            const scLabel = getAgendamentoLabel(agendamento.status ?? '');
            
            return (
              <div key={agendamento.id} className="group flex items-center gap-5 p-5 rounded-[20px] border border-border/10 bg-background hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-border/30 transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
                {/* Glow status */}
                <div className={`absolute -left-10 -top-10 w-24 h-24 blur-[40px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-30 ${scColor.split(' ')[0]?.replace('/10', '') || ''}`} />
                
                {/* Left: date badge */}
                <div className="w-16 h-16 rounded-[16px] bg-primary/10 flex flex-col items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner z-10">
                  <span className="text-xl font-black text-primary leading-none tracking-tighter">
                    {fmtDay(agendamento.data_hora)}
                  </span>
                  <span className="text-[10px] text-primary/70 font-bold uppercase tracking-widest mt-1">
                    {fmtMonth(agendamento.data_hora)}
                  </span>
                </div>

                {/* Middle: info */}
                <div className="flex-1 min-w-0 z-10 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0', scColor)}>
                      {scLabel}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {fmtMessageTime(agendamento.data_hora)}
                    </span>
                  </div>
                  <p className="text-[15px] font-bold text-foreground truncate max-w-[85%]">
                    {agendamento.responsavel || 'Reunião sem responsável'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate max-w-[85%] mt-1">
                    {agendamento.area_juridica ? <span className="mr-2 opacity-60 font-medium">[{agendamento.area_juridica}]</span> : ''}
                    {agendamento.observacoes || 'Sem detalhes adiconados.'}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-md rounded-[12px] p-2 border border-border/10 shadow-sm absolute right-4">
                  <button type="button" onClick={() => handleOpenDetails(agendamento)} className="h-8 w-8 flex items-center justify-center rounded-[8px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalhes">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleOpenDetails(agendamento)} className="h-8 w-8 flex items-center justify-center rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Editar">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ open: true, id: agendamento.id, label: agendamento.responsavel ?? fmtMessageTime(agendamento.data_hora) })}
                    className="h-8 w-8 flex items-center justify-center rounded-[8px] text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAgendamentos.length === 0 && searchTerm && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhum resultado encontrado para "{searchTerm}". Tente ajustar sua busca.
          </p>
        )}
      </div>
      </>
      )}

      <Dialog open={isNovoAgendamentoOpen} onOpenChange={setIsNovoAgendamentoOpen}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <NovoAgendamentoForm onClose={() => {
            setIsNovoAgendamentoOpen(false);
            fetchAgendamentos();
          }} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <DetalhesAgendamento agendamento={selectedAgendamento as unknown as Parameters<typeof DetalhesAgendamento>[0]['agendamento']} onClose={handleCloseDetails} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => setConfirmDelete(prev => ({ ...prev, open: v }))}
        title="Excluir agendamento?"
        description={`Esta ação não pode ser desfeita. O agendamento "${confirmDelete.label}" será removido permanentemente.`}
        onConfirm={() => {
          void deleteAgendamento(confirmDelete.id);
          setConfirmDelete({ open: false, id: '', label: '' });
        }}
        destructive
      />
    </div>
  );
};

export default AgendamentosManager;
