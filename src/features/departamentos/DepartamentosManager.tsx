import { useState } from 'react';
import { Plus, Search, Building2, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import DepartamentoForm from './DepartamentoForm';
import MembrosSection from './MembrosSection';
import type { Departamento } from '@/types/crm-operacional';

const DepartamentosManager = () => {
  usePageTitle('Departamentos');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepto, setSelectedDepto] = useState<Departamento | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { departamentos, isLoading, deleteDepto } = useDepartamentos();
  const { can } = useRBAC();

  const canCreate = can('departamentos', 'create');
  const canDelete = can('departamentos', 'delete');

  const filtered = departamentos.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.nome.toLowerCase().includes(term) ||
      (d.descricao ?? '').toLowerCase().includes(term)
    );
  });

  const handleOpenCreate = () => {
    setSelectedDepto(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (depto: Departamento) => {
    setSelectedDepto(depto);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedDepto(null);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteDepto(confirmDelete.id);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: '', label: '' });
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Departamentos</CardTitle>
                <p className="text-muted-foreground">Organize sua equipe por departamentos</p>
              </div>
              <Skeleton className="h-10 w-44" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <CardTitle className="text-2xl">Departamentos</CardTitle>
              <p className="text-muted-foreground">
                Organize sua equipe por departamentos e gerencie permissões
              </p>
            </div>
            {canCreate && (
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Departamento
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {departamentos.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum departamento"
          description="Crie departamentos para organizar os membros da sua equipe e controlar permissões por área."
          action={canCreate ? { label: 'Novo Departamento', onClick: handleOpenCreate } : undefined}
        />
      ) : (
        <>
          {/* Search + count */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filtered.length} departamento{filtered.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((depto) => (
              <Card
                key={depto.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => handleOpenEdit(depto)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: depto.cor || '#6b7280' }}
                      />
                      <h3 className="font-semibold text-base truncate">{depto.nome}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(depto);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete({ open: true, id: depto.id, label: depto.nome });
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {depto.descricao && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {depto.descricao}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {depto.membros_count ?? 0} membro{(depto.membros_count ?? 0) !== 1 ? 's' : ''}
                    </Badge>
                    <Badge
                      variant={depto.ativo ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {depto.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && searchTerm && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum departamento encontrado para &quot;{searchTerm}&quot;.
                </p>
                <Button variant="ghost" className="mt-2" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Sheet for create/edit */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <DepartamentoForm departamento={selectedDepto} onClose={handleCloseSheet} />
          {selectedDepto && (
            <div className="mt-6 border-t pt-6">
              <MembrosSection departamentoId={selectedDepto.id} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Departamento"
        description={`Tem certeza que deseja excluir o departamento "${confirmDelete.label}"? Os membros serão desvinculados automaticamente.`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default DepartamentosManager;
