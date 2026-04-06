import { useState } from 'react';
import { Plus, Pencil, Tags, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { CRUDManagerLayout } from '@/components/CRUDManagerLayout';
import { useTags } from '@/hooks/useTags';
import { useRBAC } from '@/hooks/useRBAC';
import { TAG_CATEGORIAS } from '@/types/crm-operacional';
import type { Tag } from '@/types/crm-operacional';
import { TagForm } from '@/features/tags/TagForm';

const CATEGORIA_LABELS: Record<string, string> = {
  prioridade: 'Prioridade',
  temperatura: 'Temperatura',
  operacional: 'Operacional',
  qualificacao: 'Qualificacao',
  acompanhamento: 'Acompanhamento',
  relacionamento: 'Relacionamento',
};

export function TagsManager() {
  const { tags, isLoading, isError, refetch, deleteTag } = useTags();
  const { can } = useRBAC();

  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const canCreate = can('tags', 'create');
  const canDelete = can('tags', 'delete');

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

  // Extended filter: search + categoria
  const filterFn = (tag: Tag, search: string) => {
    const matchesSearch = tag.nome.toLowerCase().includes(search.toLowerCase());
    const matchesCategoria =
      categoriaFilter === 'all' ||
      tag.categoria === categoriaFilter ||
      (!tag.categoria && categoriaFilter === 'all');
    return matchesSearch && matchesCategoria;
  };

  return (
    <>
      <CRUDManagerLayout<Tag>
        pageTitle="Tags"
        items={tags}
        isLoading={isLoading}
        error={isError ? 'Erro ao carregar tags' : null}
        onRetry={() => void refetch()}
        isEmpty={tags.length === 0 && !isLoading && !isError}
        emptyStateProps={{
          icon: Tags,
          title: 'Nenhuma tag encontrada',
          description: 'Crie sua primeira tag para organizar seus leads.',
          action: canCreate ? { label: 'Criar primeira tag', onClick: handleCreate } : undefined,
        }}
        searchPlaceholder="Buscar por nome..."
        filterFn={filterFn}
        skeletonConfig={{ count: 6, height: 'h-24', gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' }}
        deleteConfig={{
          title: 'Remover tag',
          description: (label) => `Tem certeza que deseja remover a tag "${label}"? Ela sera desvinculada de todos os leads associados.`,
          onConfirm: (id) => deleteTag(id),
        }}
        renderHeader={(_ctx) => (
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
        )}
        renderFilters={() => (
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
        )}
        renderItems={(filteredTags, ctx) => (
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
                      onClick={() => { ctx.requestDelete(tag.id, tag.nome); }}
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
        renderNoResults={(ctx) => (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tags className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium">Nenhuma tag encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {ctx.searchTerm || categoriaFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira tag para organizar seus leads.'}
            </p>
            {canCreate && !ctx.searchTerm && categoriaFilter === 'all' && (
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-1" />
                Criar primeira tag
              </Button>
            )}
          </div>
        )}
      />

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
    </>
  );
}

export default TagsManager;
