import { useState, useMemo } from 'react';
import { Plus, Search, Building2, Trash2, Edit, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import DepartamentoForm from './DepartamentoForm';
import MembrosSection from './MembrosSection';
import EmptyState from '@/components/EmptyState';
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

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return departamentos;
    const term = searchTerm.toLowerCase();
    return departamentos.filter(
      (d) =>
        d.nome.toLowerCase().includes(term) ||
        (d.descricao ?? '').toLowerCase().includes(term)
    );
  }, [departamentos, searchTerm]);

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
      <div className="space-y-8 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-44 rounded-[12px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12">
      {/* Header Premium (Lex Obsidian) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Estrutura Operacional
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Departamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Gerencie as áreas da sua operação, organize sua equipe em esquadrões e direcione o fluxo de trabalho (Kanban) para os responsáveis adequados.
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
            <Plus className="h-4 w-4" />
            Novo Departamento
          </Button>
        )}
      </div>

      {/* Dashboard Metrics / Quick Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar departamento ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
          />
        </div>
        <div className="flex items-center gap-6 px-4">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Áreas</p>
            <p className="text-xl font-black">{departamentos.length}</p>
          </div>
          <div className="w-px h-8 bg-border/20"></div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Membros Alocados</p>
            <p className="text-xl font-black text-primary">
              {departamentos.reduce((acc, d) => acc + (d.membros_count || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {departamentos.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum departamento criado"
          description="Crie departamentos para dividir sua esteira operacional (ex: Comercial, Jurídico Cível, Financeiro) e distribua seus leads."
          action={canCreate ? {
            label: 'Criar Primeira Área',
            onClick: handleOpenCreate,
          } : undefined}
        />
      ) : (
        <>
          {/* Grid de Departamentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((depto) => (
              <div
                key={depto.id}
                onClick={() => handleOpenEdit(depto)}
                className="group relative bg-background border border-border/10 rounded-[24px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                {/* Glow effect matching department color */}
                <div 
                  className="absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40" 
                  style={{ backgroundColor: depto.cor || '#3b82f6' }} 
                />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: `${depto.cor || '#3b82f6'}20`, color: depto.cor || '#3b82f6' }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground leading-tight">
                        {depto.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={depto.ativo ? 'default' : 'secondary'} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0 ${depto.ativo ? 'bg-primary/10 text-primary hover:bg-primary/20 text-xs' : ''}`}>
                          {depto.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-[12px]">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(depto);
                        }}
                        className="rounded-[8px] cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Área
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive rounded-[8px] cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ open: true, id: depto.id, label: depto.nome });
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Área
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground mt-4 line-clamp-2 min-h-[40px] relative z-10">
                  {depto.descricao || 'Nenhuma descrição fornecida.'}
                </p>

                <div className="flex items-center justify-between border-t border-border/5 pt-4 mt-6 relative z-10">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tamanho da Equipe</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/40 text-xs font-semibold text-foreground border border-border/10">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {depto.membros_count ?? 0} {(depto.membros_count ?? 0) === 1 ? 'membro' : 'membros'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && searchTerm && (
            <EmptyState
              icon={Search}
              title="Nenhum departamento encontrado"
              description={`Nenhum departamento encontrado para "${searchTerm}".`}
              action={{
                label: 'Limpar busca',
                onClick: () => setSearchTerm(''),
              }}
            />
          )}
        </>
      )}

      {/* Sheet for create/edit */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-border/10 shadow-2xl">
          <div className="p-6">
            <DepartamentoForm departamento={selectedDepto} onClose={handleCloseSheet} />
            {selectedDepto && (
              <div className="mt-8 border-t border-border/10 pt-8">
                <MembrosSection departamentoId={selectedDepto.id} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Departamento"
        description={`Tem certeza que deseja excluir a área "${confirmDelete.label}"? A operação será afetada e os membros vinculados a ele ficarão sem departamento.`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default DepartamentosManager;
