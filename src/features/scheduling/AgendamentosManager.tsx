
import { useState, useMemo } from 'react';
import { Plus, Search, Calendar, AlertCircle, RefreshCw, Eye, Edit } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import type { Agendamento } from '@/hooks/useAgendamentos';
import { fmtMessageTime } from '@/utils/formatting';

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit' });
const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short' });
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NovoAgendamentoForm } from '@/components/NovoAgendamentoForm';
import { DetalhesAgendamento } from '@/components/DetalhesAgendamento';
import { cn } from '@/lib/utils';

const AgendamentosManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const { agendamentos, loading, error, isEmpty, fetchAgendamentos } = useAgendamentos();

  const filteredAgendamentos = useMemo(() => agendamentos.filter(agendamento => {
    const matchesSearch = agendamento.responsavel?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || false;
    const matchesStatus = filterStatus === '' || agendamento.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [agendamentos, debouncedSearchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      agendado: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      confirmado: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      reagendado: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      cancelado: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      realizado: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      agendado: 'Agendado',
      confirmado: 'Confirmado',
      reagendado: 'Reagendado',
      cancelado: 'Cancelado',
      realizado: 'Realizado',
    };
    return labels[status] || status;
  };

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
      <div className="flex flex-col h-screen">
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
      <div className="flex flex-col h-screen">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Agendamentos</h1>
                <p className="text-[11px] text-muted-foreground">Gerencie reunioes e compromissos</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-4">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Erro ao carregar agendamentos</h3>
            <p className="text-[11px] text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={handleRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Tentar novamente
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Recarregar pagina
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Agendamentos</h1>
                <p className="text-[11px] text-muted-foreground">Gerencie reunioes e compromissos</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsNovoAgendamentoOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Agendamento
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-4">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum agendamento</h3>
            <p className="text-[11px] text-muted-foreground mb-4">Comece criando seu primeiro agendamento para organizar suas reunioes.</p>
            <Button size="sm" onClick={() => setIsNovoAgendamentoOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Criar primeiro agendamento
            </Button>
          </div>
        </div>

        <Dialog open={isNovoAgendamentoOpen} onOpenChange={setIsNovoAgendamentoOpen}>
          <DialogContent className="max-w-3xl">
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

  // Main Content
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Agendamentos</h1>
              <p className="text-[11px] text-muted-foreground">
                {agendamentos.length} agendamentos no total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setIsNovoAgendamentoOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Agendamento
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-2 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-3.5 w-3.5" />
            <Input
              placeholder="Buscar por responsavel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-3 text-xs border border-border rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
          >
            <option value="">Todos os Status</option>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="reagendado">Reagendado</option>
            <option value="cancelado">Cancelado</option>
            <option value="realizado">Realizado</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {filteredAgendamentos.map((agendamento) => (
          <div key={agendamento.id} className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
            {/* Left: date badge */}
            <div className="w-10 h-10 rounded-lg bg-primary/8 flex flex-col items-center justify-center flex-shrink-0 border border-primary/15">
              <span className="text-[10px] font-bold text-primary leading-none">
                {fmtDay(agendamento.data_hora)}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase leading-none mt-0.5">
                {fmtMonth(agendamento.data_hora)}
              </span>
            </div>

            {/* Middle: info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground truncate">
                  {fmtMessageTime(agendamento.data_hora)}
                  {agendamento.responsavel ? ` \u00b7 ${agendamento.responsavel}` : ''}
                </p>
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0', getStatusColor(agendamento.status ?? ''))}>
                  {getStatusLabel(agendamento.status ?? '')}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                {agendamento.area_juridica ?? ''}
                {agendamento.observacoes ? ` \u00b7 ${agendamento.observacoes}` : ''}
              </p>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => handleOpenDetails(agendamento)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleOpenDetails(agendamento)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors">
                <Edit className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredAgendamentos.length === 0 && searchTerm && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhum resultado encontrado para "{searchTerm}". Tente ajustar sua busca.
          </p>
        )}
      </div>

      <Dialog open={isNovoAgendamentoOpen} onOpenChange={setIsNovoAgendamentoOpen}>
        <DialogContent className="max-w-3xl">
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <DetalhesAgendamento agendamento={selectedAgendamento as unknown as Parameters<typeof DetalhesAgendamento>[0]['agendamento']} onClose={handleCloseDetails} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendamentosManager;
