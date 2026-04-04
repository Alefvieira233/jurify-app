import { useState, useMemo } from 'react';
import { useTarefas, type Tarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, CheckCircle, Clock, AlertTriangle, MoreHorizontal, ListTodo } from 'lucide-react';
import { fmtDate } from '@/utils/formatting';
import ConfirmDialog from '@/components/ConfirmDialog';
import NovaTarefaForm from './NovaTarefaForm';
import EditTarefaDialog from './EditTarefaDialog';
import EmptyState from '@/components/EmptyState';

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
  const { tarefas, isLoading, updateTarefa, deleteTarefa } = useTarefas();
  const { members } = useTeamMembers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const memberMap = useMemo(
    () => new Map((members ?? []).map(m => [m.id, m.nome_completo || m.email])),
    [members],
  );

  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (statusFilter && statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (prioridadeFilter && prioridadeFilter !== 'all' && t.prioridade !== prioridadeFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!t.titulo.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [tarefas, search, statusFilter, prioridadeFilter]);

  const toggleStatus = (tarefa: Tarefa) => {
    const next = tarefa.status === 'pendente' ? 'em_andamento'
      : tarefa.status === 'em_andamento' ? 'concluida'
      : tarefa.status === 'concluida' ? 'pendente'
      : 'pendente';
    updateTarefa.mutate({ id: tarefa.id, status: next });
  };

  const handleEdit = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setEditOpen(true);
  };

  const handleDelete = (tarefa: Tarefa) => {
    setConfirmDelete(tarefa.id);
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluida</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todas as prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
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
              <TableHead className="text-xs uppercase tracking-wider w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={search || (statusFilter && statusFilter !== 'all') || (prioridadeFilter && prioridadeFilter !== 'all') ? Search : ListTodo}
                    title={search || (statusFilter && statusFilter !== 'all') || (prioridadeFilter && prioridadeFilter !== 'all') ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa criada ainda'}
                    description={search || (statusFilter && statusFilter !== 'all') || (prioridadeFilter && prioridadeFilter !== 'all')
                      ? 'Tente ajustar os filtros para encontrar suas tarefas.'
                      : 'Crie sua primeira tarefa para organizar o trabalho da equipe.'}
                    action={!(search || (statusFilter && statusFilter !== 'all') || (prioridadeFilter && prioridadeFilter !== 'all')) ? {
                      label: 'Nova Tarefa',
                      onClick: () => setFormOpen(true),
                    } : undefined}
                    className="border-0 shadow-none"
                  />
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(tarefa)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(tarefa)}
                            className="text-destructive focus:text-destructive"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NovaTarefaForm open={formOpen} onOpenChange={setFormOpen} />
      <EditTarefaDialog tarefa={editingTarefa} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}
        title="Excluir tarefa?"
        description="Esta tarefa sera removida permanentemente. Esta acao nao pode ser desfeita."
        onConfirm={() => {
          if (confirmDelete) deleteTarefa.mutate(confirmDelete);
          setConfirmDelete(null);
        }}
        destructive
      />
    </div>
  );
}
