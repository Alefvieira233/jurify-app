import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PrazoProcessual } from '@/hooks/usePrazosProcessuais';

interface Props {
  tenantId: string;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDay = new Date(firstDay);
  startDay.setDate(1 - firstDay.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    days.push(d);
  }
  return days;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getPillColor(dataStr: string, status: string): string {
  if (status === 'cumprido') return 'bg-gray-200 text-gray-600';
  if (status === 'cancelado') return 'bg-gray-100 text-gray-400';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dataStr + 'T00:00:00');
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'bg-red-500 text-white';
  if (daysUntil <= 1) return 'bg-red-400 text-white';
  if (daysUntil <= 3) return 'bg-orange-400 text-white';
  if (daysUntil <= 7) return 'bg-amber-400 text-white';
  return 'bg-blue-400 text-white';
}

const TIPO_LABELS: Record<string, string> = {
  audiencia: 'Audiência',
  peticao: 'Petição',
  recurso: 'Recurso',
  manifestacao: 'Manifestação',
  prazo_fatal: 'Prazo Fatal',
  despacho: 'Despacho',
  sentenca: 'Sentença',
  outro: 'Outro',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function PrazosCalendario({ tenantId }: Props) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedPrazo, setSelectedPrazo] = useState<PrazoProcessual | null>(null);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente'>('todos');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: prazos = [] } = useQuery({
    queryKey: ['prazos-calendario', tenantId, currentYear, currentMonth, filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('prazos_processuais')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('data_prazo', startOfMonth)
        .lte('data_prazo', endOfMonth)
        .order('data_prazo', { ascending: true });
      if (filterStatus === 'pendente') q = q.eq('status', 'pendente');
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PrazoProcessual[];
    },
    enabled: !!tenantId,
  });

  const calendarDays = getCalendarDays(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); };

  const getPrazosForDay = (date: Date) => {
    const dateStr = formatDateStr(date);
    return prazos.filter(p => p.data_prazo === dateStr);
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth;
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const handleMarkCumprido = async (prazoId: string) => {
    const { error } = await supabase
      .from('prazos_processuais')
      .update({ status: 'cumprido', data_cumprimento: new Date().toISOString() })
      .eq('id', prazoId);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível marcar o prazo.', variant: 'destructive' });
    } else {
      toast({ title: 'Prazo cumprido', description: 'Prazo marcado como cumprido.' });
      void queryClient.invalidateQueries({ queryKey: ['prazos-calendario'] });
      void queryClient.invalidateQueries({ queryKey: ['prazos_processuais'] });
      setSelectedPrazo(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>&#8592;</Button>
          <span className="font-semibold text-lg w-44 text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>&#8594;</Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
        </div>
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'todos' | 'pendente')}
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendentes</option>
        </select>
      </div>

      {/* Calendar Grid - hidden on mobile */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground bg-muted border-b">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            const dayPrazos = getPrazosForDay(date);
            const visible = dayPrazos.slice(0, 3);
            const extra = dayPrazos.length - 3;
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] p-1 border-b border-r text-xs',
                  !isCurrentMonth(date) && 'bg-muted/30',
                  isToday(date) && 'bg-blue-50 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/30',
                )}
              >
                <div className={cn('text-right mb-1', !isCurrentMonth(date) && 'text-muted-foreground')}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {visible.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPrazo(p)}
                      className={cn(
                        'w-full text-left px-1 rounded truncate text-[10px] leading-4',
                        getPillColor(p.data_prazo, p.status),
                      )}
                    >
                      {TIPO_LABELS[p.tipo] ?? p.tipo}
                    </button>
                  ))}
                  {extra > 0 && (
                    <div className="text-muted-foreground text-[10px] pl-1">+{extra} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: list view */}
      <div className="sm:hidden space-y-2">
        {prazos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo neste mês.</p>
        )}
        {prazos.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPrazo(p)}
            className={cn('w-full text-left px-3 py-2 rounded text-sm', getPillColor(p.data_prazo, p.status))}
          >
            <div className="font-medium">{TIPO_LABELS[p.tipo] ?? p.tipo}</div>
            <div className="text-xs opacity-80">{p.data_prazo} — {p.descricao}</div>
          </button>
        ))}
      </div>

      {/* Detail Dialog */}
      {selectedPrazo && (
        <Dialog open={!!selectedPrazo} onOpenChange={() => setSelectedPrazo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Prazo</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <div><span className="font-medium">Tipo:</span> {TIPO_LABELS[selectedPrazo.tipo] ?? selectedPrazo.tipo}</div>
              <div><span className="font-medium">Descrição:</span> {selectedPrazo.descricao || '—'}</div>
              <div><span className="font-medium">Data:</span> {selectedPrazo.data_prazo}</div>
              <div><span className="font-medium">Status:</span> {selectedPrazo.status}</div>
              {selectedPrazo.observacoes && (
                <div><span className="font-medium">Observações:</span> {selectedPrazo.observacoes}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedPrazo(null)}>Fechar</Button>
              {selectedPrazo.status === 'pendente' && (
                <Button onClick={() => { void handleMarkCumprido(selectedPrazo.id); }}>
                  Marcar Cumprido
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
