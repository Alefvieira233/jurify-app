import { useState, useMemo } from 'react';
import { Plus, Search, Tags, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTags } from '@/hooks/useTags';
import { useRBAC } from '@/hooks/useRBAC';
import { TAG_CATEGORIAS } from '@/types/crm-operacional';
import type { Tag } from '@/types/crm-operacional';
import { TagForm } from '@/features/tags/TagForm';

const CATEGORIA_LABELS: Record<string, string> = {
  prioridade: 'Prioridade',
  temperatura: 'Temperatura',
  operacional: 'Operacional',
  qualificacao: 'Qualificação',
  acompanhamento: 'Acompanhamento',
  relacionamento: 'Relacionamento',
};

export function TagsManager() {
  usePageTitle('Tags');
  const { tags, isLoading, deleteTag } = useTags();
  const { can } = useRBAC();

  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can('tags', 'create');
  const canDelete = can('tags', 'delete');

  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      const matchesSearch = tag.nome.toLowerCase().includes(search.toLowerCase());
      const matchesCategoria =
        categoriaFilter === 'all' ||
        tag.categoria === categoriaFilter ||
        (!tag.categoria && categoriaFilter === 'all');
      return matchesSearch && matchesCategoria;
    });
  }, [tags, search, categoriaFilter]);

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTag(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTag(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTag(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as tags para classificar seus leads e contatos.
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nova Tag
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-8"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {TAG_CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORIA_LABELS[cat] ?? cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tags className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium">Nenhuma tag encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || categoriaFilter !== 'all'
              ? 'Tente ajustar os filtros de busca.'
              : 'Crie sua primeira tag para organizar seus leads.'}
          </p>
          {canCreate && !search && categoriaFilter === 'all' && (
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              Criar primeira tag
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: tag.cor }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{tag.nome}</span>
                    {!tag.ativo && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tag.categoria && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {CATEGORIA_LABELS[tag.categoria] ?? tag.categoria}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Ordem: {tag.ordem}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { handleEdit(tag); }}
                  aria-label={`Editar tag ${tag.nome}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { setDeleteTarget(tag); }}
                    aria-label={`Remover tag ${tag.nome}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Editar Tag' : 'Nova Tag'}
            </DialogTitle>
          </DialogHeader>
          <TagForm tag={editingTag} onClose={handleCloseForm} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Remover tag"
        description={`Tem certeza que deseja remover a tag "${deleteTarget?.nome ?? ''}"? Ela será desvinculada de todos os leads associados.`}
        onConfirm={() => { void handleDelete(); }}
        loading={isDeleting}
        destructive
      />
    </div>
  );
}

export default TagsManager;
