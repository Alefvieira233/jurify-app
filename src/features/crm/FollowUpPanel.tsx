
import { useState, useMemo } from 'react';
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, Pause,
  CalendarClock, Search, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowUps, type FollowUp, type FollowUpStatus } from '@/hooks/useFollowUps';
import { useDebounce } from '@/hooks/useDebounce';

/* ── Status config ── */
const STATUS_CFG: Record<FollowUpStatus, {
  label: string;
  icon:  React.ComponentType<{ className?: string }>;
  hex:   string;
}> = {
  pending:   { label: 'Pendente',  icon: Clock,         hex: '#d97706' },
  completed: { label: 'Concluído', icon: CheckCircle2,  hex: '#059669' },
  cancelled: { label: 'Cancelado', icon: XCircle,       hex: '#6b7280' },
  overdue:   { label: 'Atrasado',  icon: AlertTriangle, hex: '#e11d48' },
  snoozed:   { label: 'Adiado',    icon: Pause,         hex: '#2563eb' },
};

/* ── Priority config ── */
const PRIORITY_CFG: Record<string, { label: string; hex: string }> = {
  low:    { label: 'Baixa',   hex: '#6b7280' },
  medium: { label: 'Média',   hex: '#2563eb' },
  high:   { label: 'Alta',    hex: '#ea580c' },
  urgent: { label: 'Urgente', hex: '#e11d48' },
};

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

/* ── Section heading ── */
function SectionHeading({
  icon, title, count, hex,
}: { icon: React.ReactNode; title: string; count: number; hex: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-muted/20 border-y border-border/50">
      {icon}
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      <span
        className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
        style={{ background: hex + '1a', color: hex }}
      >
        {count}
      </span>
    </div>
  );
}

/* ── Follow-up row ── */
function FollowUpRow({ fu, onComplete, onSnooze, onCancel }: {
  fu:         FollowUp;
  onComplete: () => void;
  onSnooze:   () => void;
  onCancel:   () => void;
}) {
  const cfg      = STATUS_CFG[fu.status];
  const StatusIcon = cfg.icon;
  const prio     = PRIORITY_CFG[fu.priority] ?? PRIORITY_CFG.low!;

  return (
    <div className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-b-0">
      {/* Status icon */}
      <StatusIcon className="h-4 w-4 flex-shrink-0" style={{ color: cfg.hex }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {fu.title}
          </p>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: prio.hex + '1a', color: prio.hex }}
          >
            {prio.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 truncate">
          {fu.lead_name && <span className="font-medium">{fu.lead_name} · </span>}
          {fu.followup_type} · {fmtDateTime(fu.scheduled_at)}
        </p>
        {fu.description && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{fu.description}</p>
        )}
      </div>

      {/* Actions (pending / overdue only) */}
      {(fu.status === 'pending' || fu.status === 'overdue') && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={onComplete}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-emerald-500/10 transition-colors"
            title="Concluir"
            aria-label="Concluir follow-up"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
            title="Adiar 1 dia"
            aria-label="Adiar follow-up"
          >
            <Pause className="h-3.5 w-3.5 text-primary" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
            title="Cancelar"
            aria-label="Cancelar follow-up"
          >
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
const FollowUpPanel = () => {
  const { followUps, overdueCount, loading, completeFollowUp, cancelFollowUp, snoozeFollowUp } = useFollowUps();
  const [filterStatus,   setFilterStatus]   = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm,     setSearchTerm]     = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filtered = useMemo(() => followUps.filter(fu => {
    const matchStatus   = filterStatus   === 'all' || fu.status   === filterStatus;
    const matchPriority = filterPriority === 'all' || fu.priority === filterPriority;
    const matchSearch   = !debouncedSearch ||
      fu.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (fu.lead_name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  }), [followUps, filterStatus, filterPriority, debouncedSearch]);

  const grouped = useMemo(() => {
    const now = new Date();
    return {
      overdue:   filtered.filter(f => f.status === 'overdue'),
      today:     filtered.filter(f => f.status === 'pending' && new Date(f.scheduled_at).toDateString() === now.toDateString()),
      upcoming:  filtered.filter(f => f.status === 'pending' && new Date(f.scheduled_at) > now && new Date(f.scheduled_at).toDateString() !== now.toDateString()),
      completed: filtered.filter(f => f.status === 'completed'),
      rest:      filtered.filter(f => f.status === 'cancelled' || f.status === 'snoozed'),
    };
  }, [filtered]);

  const handleSnooze = async (id: string) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    await snoozeFollowUp(id, d.toISOString());
  };

  const hasFilter = filterStatus !== 'all' || filterPriority !== 'all' || searchTerm;

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
        </div>
        <div className="p-4 space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">Follow-ups</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {followUps.length} agendados
                {overdueCount > 0 && (
                  <span className="text-destructive font-semibold"> · {overdueCount} atrasados</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar follow-up..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 w-44 bg-muted/50 border border-border rounded-md pl-8 pr-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-8 bg-muted/50 border border-border rounded-md pl-7 pr-5 text-xs text-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Atrasados</option>
              <option value="snoozed">Adiados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="h-8 bg-muted/50 border border-border rounded-md px-2.5 text-xs text-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">Todas as prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {hasFilter && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPriority('all'); }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/30 transition-colors"
            >
              Limpar
            </button>
          )}

          <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline tabular-nums">
            {filtered.length}/{followUps.length} follow-ups
          </span>
        </div>
      </header>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum follow-up encontrado</p>
          </div>
        )}

        {/* Overdue */}
        {grouped.overdue.length > 0 && (
          <section>
            <SectionHeading
              icon={<AlertTriangle className="h-3.5 w-3.5" style={{ color: '#e11d48' }} />}
              title="Atrasados"
              count={grouped.overdue.length}
              hex="#e11d48"
            />
            {grouped.overdue.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                onComplete={() => void completeFollowUp(fu.id)}
                onSnooze={() => void handleSnooze(fu.id)}
                onCancel={() => void cancelFollowUp(fu.id)}
              />
            ))}
          </section>
        )}

        {/* Today */}
        {grouped.today.length > 0 && (
          <section>
            <SectionHeading
              icon={<Clock className="h-3.5 w-3.5" style={{ color: '#d97706' }} />}
              title="Hoje"
              count={grouped.today.length}
              hex="#d97706"
            />
            {grouped.today.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                onComplete={() => void completeFollowUp(fu.id)}
                onSnooze={() => void handleSnooze(fu.id)}
                onCancel={() => void cancelFollowUp(fu.id)}
              />
            ))}
          </section>
        )}

        {/* Upcoming */}
        {grouped.upcoming.length > 0 && (
          <section>
            <SectionHeading
              icon={<CalendarClock className="h-3.5 w-3.5 text-primary" />}
              title="Próximos"
              count={grouped.upcoming.length}
              hex="#2563eb"
            />
            {grouped.upcoming.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                onComplete={() => void completeFollowUp(fu.id)}
                onSnooze={() => void handleSnooze(fu.id)}
                onCancel={() => void cancelFollowUp(fu.id)}
              />
            ))}
          </section>
        )}

        {/* Completed */}
        {grouped.completed.length > 0 && (
          <section>
            <SectionHeading
              icon={<CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#059669' }} />}
              title="Concluídos"
              count={grouped.completed.length}
              hex="#059669"
            />
            {grouped.completed.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                onComplete={() => void completeFollowUp(fu.id)}
                onSnooze={() => void handleSnooze(fu.id)}
                onCancel={() => void cancelFollowUp(fu.id)}
              />
            ))}
          </section>
        )}

        {/* Cancelled / Snoozed */}
        {grouped.rest.length > 0 && (
          <section>
            <SectionHeading
              icon={<Pause className="h-3.5 w-3.5 text-muted-foreground" />}
              title="Outros"
              count={grouped.rest.length}
              hex="#6b7280"
            />
            {grouped.rest.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                onComplete={() => void completeFollowUp(fu.id)}
                onSnooze={() => void handleSnooze(fu.id)}
                onCancel={() => void cancelFollowUp(fu.id)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default FollowUpPanel;
