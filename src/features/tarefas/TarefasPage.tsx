import { useState, useMemo } from 'react';
import { useTarefas, type Tarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { fmtDate } from '@/utils/formatting';
import NovaTarefaForm from './NovaTarefaForm';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: AlertTriangle },
  concluida: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

export default function TarefasPage() {
  usePageTitle('Tarefas');
  const { tarefas, isLoading, updateTarefa } = useTarefas();
  const { members } = useTeamMembers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const memberMap = useMemo(
    () => new Map((members ?? []).map(m => [m.id, m.nome_completo || m.email])),
    [members],
  );

  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!t.titulo.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [tarefas, search, statusFilter]);

  const toggleStatus = (tarefa: Tarefa) => {
    const next = tarefa.status === 'pendente' ? 'em_andamento'
      : tarefa.status === 'em_andamento' ? 'concluida'
      : tarefa.status === 'concluida' ? 'pendente'
      : 'pendente';
    updateTarefa.mutate({ id: tarefa.id, status: next });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Tarefa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider w-8" />
              <TableHead className="text-xs uppercase tracking-wider">Título</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Prazo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">PTS</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Responsável</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Prioridade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search || statusFilter ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa criada ainda'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(tarefa => {
                const cfg = STATUS_CONFIG[tarefa.status] ?? { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock };
                return (
                  <TableRow key={tarefa.id} className="hover:bg-accent/50 transition-colors">
                    <TableCell>
                      <button
                        onClick={() => toggleStatus(tarefa)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          tarefa.status === 'concluida'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {tarefa.status === 'concluida' && <CheckCircle className="h-3 w-3" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${tarefa.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                        {tarefa.titulo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tarefa.prazo ? fmtDate(tarefa.prazo) : '\u2014'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {tarefa.pontos ?? '\u2014'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tarefa.responsavel_id ? (memberMap.get(tarefa.responsavel_id) ?? '\u2014') : '\u2014'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[11px] ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[11px] ${PRIORIDADE_COLORS[tarefa.prioridade] ?? ''}`}>
                        {tarefa.prioridade.charAt(0).toUpperCase() + tarefa.prioridade.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NovaTarefaForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
