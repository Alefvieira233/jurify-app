import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Search, Users, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useStatusManager, type StatusStage } from '@/hooks/useStatusManager';
import StatusFormDialog from './StatusFormDialog';

export default function StatusManager() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StatusStage | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<StatusStage | null>(null);

  const { stages, leadCounts, isLoading, deleteStage, reorderStages } = useStatusManager();

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...stages];
    const temp = reordered[index - 1]!;
    reordered[index - 1] = reordered[index]!;
    reordered[index] = temp;
    reorderStages.mutate(reordered.map((s, i) => ({ id: s.id, position: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === stages.length - 1) return;
    const reordered = [...stages];
    const temp = reordered[index]!;
    reordered[index] = reordered[index + 1]!;
    reordered[index + 1] = temp;
    reorderStages.mutate(reordered.map((s, i) => ({ id: s.id, position: i })));
  };

  const filtered = stages.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingStage(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (stage: StatusStage) => {
    setEditingStage(stage);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDelete = (stage: StatusStage) => {
    setConfirmDeleteStage(stage);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os status dos seus atendimentos e defina fluxos de trabalho.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Criar Status
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nome
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Slug
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Contatos
                </span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Follow-ups
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ordem
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-2.5">
                    <Skeleton className="h-5 w-28" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Skeleton className="h-4 w-8" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Skeleton className="h-4 w-8" />
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {search
                    ? 'Nenhum status encontrado para esta pesquisa.'
                    : 'Nenhum status configurado. Clique em "Criar Status" para começar.'}
                </td>
              </tr>
            ) : (
              filtered.map((stage, idx) => {
                const stageLeads = leadCounts.get(stage.id) ?? 0;
                const stageType = stage.is_won
                  ? 'Ganho'
                  : stage.is_lost
                  ? 'Perdido'
                  : '-';

                return (
                  <tr key={stage.id} className="hover:bg-muted/20 cursor-pointer">
                    <td className="px-4 py-2.5">
                      <Badge
                        style={{ backgroundColor: stage.color }}
                        className="text-white text-xs font-medium"
                      >
                        {stage.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {stage.slug}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {stageType}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {stageLeads}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {stage.auto_followup_days ?? 0}
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === filtered.length - 1}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted">
                            {deleteStage.isPending && deleteStage.variables === stage.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(stage)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(stage)}
                            className="text-destructive focus:text-destructive"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isLoading ? '' : `${filtered.length} status`}
      </p>

      <StatusFormDialog
        stage={editingStage}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
      />

      <ConfirmDialog
        open={!!confirmDeleteStage}
        onOpenChange={(v) => { if (!v) setConfirmDeleteStage(null); }}
        title="Excluir status?"
        description={`O status "${confirmDeleteStage?.name ?? ''}" sera removido permanentemente. Esta acao nao pode ser desfeita.`}
        onConfirm={() => {
          if (confirmDeleteStage) deleteStage.mutate(confirmDeleteStage.id);
          setConfirmDeleteStage(null);
        }}
        destructive
      />
    </div>
  );
}
