import { useState, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Pause, CalendarClock, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowUps, type FollowUp, type FollowUpStatus } from '@/hooks/useFollowUps';
import { useDebounce } from '@/hooks/useDebounce';

const statusConfig: Record<FollowUpStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-yellow-500' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-gray-500' },
  overdue: { label: 'Atrasado', icon: AlertTriangle, color: 'text-red-500' },
  snoozed: { label: 'Adiado', icon: Pause, color: 'text-blue-500' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  medium: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  urgent: 'bg-red-500/15 text-red-300 border-red-400/30',
};

const FollowUpPanel = () => {
  const { followUps, overdueCount, loading, completeFollowUp, cancelFollowUp, snoozeFollowUp } = useFollowUps();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filtered = useMemo(() => {
    return followUps.filter(fu => {
      const matchesStatus = filterStatus === 'all' || fu.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || fu.priority === filterPriority;
      const matchesSearch = !debouncedSearch ||
        fu.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (fu.lead_name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [followUps, filterStatus, filterPriority, debouncedSearch]);

  const grouped = useMemo(() => {
    const overdue = filtered.filter(f => f.status === 'overdue');
    const today = filtered.filter(f => {
      if (f.status !== 'pending') return false;
      const d = new Date(f.scheduled_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    const upcoming = filtered.filter(f => {
      if (f.status !== 'pending') return false;
      const d = new Date(f.scheduled_at);
      const now = new Date();
      return d > now && d.toDateString() !== now.toDateString();
    });
    const completed = filtered.filter(f => f.status === 'completed');
    const rest = filtered.filter(f => f.status === 'cancelled' || f.status === 'snoozed');
    return { overdue, today, upcoming, completed, rest };
  }, [filtered]);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

  const handleComplete = async (id: string) => {
    await completeFollowUp(id);
  };

  const handleCancel = async (id: string) => {
    await cancelFollowUp(id);
  };

  const handleSnooze = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    await snoozeFollowUp(id, tomorrow.toISOString());
  };

  const renderFollowUpCard = (fu: FollowUp) => {
    const config = statusConfig[fu.status];
    const StatusIcon = config.icon;

    return (
      <div key={fu.id} className="flex items-center gap-4 p-4 rounded-lg bg-card border hover:shadow-md transition-all">
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{fu.title}</p>
            <Badge variant="outline" className={`text-[10px] ${priorityColors[fu.priority] || ''}`}>
              {fu.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fu.lead_name} &middot; {fu.followup_type} &middot; {formatDate(fu.scheduled_at)}
          </p>
          {fu.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{fu.description}</p>
          )}
        </div>

        {(fu.status === 'pending' || fu.status === 'overdue') && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:text-green-600" onClick={() => void handleComplete(fu.id)} title="Concluir">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600" onClick={() => void handleSnooze(fu.id)} title="Adiar 1 dia">
              <Pause className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600" onClick={() => void handleCancel(fu.id)} title="Cancelar">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, items: FollowUp[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground px-1">
          {icon} {title} ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map(renderFollowUpCard)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Follow-ups
          </h1>
          <p className="text-muted-foreground mt-1">
            {followUps.length} follow-ups &middot; {overdueCount > 0 && <span className="text-destructive font-medium">{overdueCount} atrasados</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar follow-ups..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="snoozed">Adiados</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups List */}
      <div className="space-y-6">
        {renderSection('Atrasados', grouped.overdue, <AlertTriangle className="h-4 w-4 text-red-500" />)}
        {renderSection('Hoje', grouped.today, <Clock className="h-4 w-4 text-yellow-500" />)}
        {renderSection('Próximos', grouped.upcoming, <CalendarClock className="h-4 w-4 text-blue-500" />)}
        {renderSection('Concluídos', grouped.completed, <CheckCircle2 className="h-4 w-4 text-green-500" />)}
        {renderSection('Outros', grouped.rest, <Pause className="h-4 w-4 text-gray-500" />)}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum follow-up encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpPanel;
