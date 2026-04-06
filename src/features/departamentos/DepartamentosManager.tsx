import { useState } from 'react';
import { Plus, Search, Building2, Trash2, Edit, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CRUDManagerLayout } from '@/components/CRUDManagerLayout';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useRBAC } from '@/hooks/useRBAC';
import EmptyState from '@/components/EmptyState';
import DepartamentoForm from './DepartamentoForm';
import MembrosSection from './MembrosSection';
import type { Departamento } from '@/types/crm-operacional';

const DepartamentosManager = () => {
  const [selectedDepto, setSelectedDepto] = useState<Departamento | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { departamentos, isLoading, isError, refetch, deleteDepto } = useDepartamentos();
  const { can } = useRBAC();

  const canCreate = can('departamentos', 'create');
  const canDelete = can('departamentos', 'delete');

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

  return (
    <>
      <CRUDManagerLayout<Departamento>
        pageTitle="Departamentos"
        items={departamentos}
        isLoading={isLoading}
        error={isError ? 'Erro ao carregar departamentos' : null}
        onRetry={() => void refetch()}
        isEmpty={departamentos.length === 0 && !isLoading && !isError}
        emptyStateProps={{
          icon: Building2,
          title: 'Nenhum departamento criado',
          description: 'Crie departamentos para dividir sua esteira operacional (ex: Comercial, Juridico Civel, Financeiro) e distribua seus leads.',
          action: canCreate ? { label: 'Criar Primeira Area', onClick: handleOpenCreate } : undefined,
        }}
        searchPlaceholder="Buscar departamento ou descricao..."
        searchDebounceMs={0}
        filterFn={(d, search) =>
          d.nome.toLowerCase().includes(search.toLowerCase()) ||
          (d.descricao ?? '').toLowerCase().includes(search.toLowerCase())
        }
        skeletonConfig={{ count: 3, height: 'h-48', gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' }}
        className="space-y-8 pb-12"
        deleteConfig={{
          title: 'Excluir Departamento',
          description: (label) =>
            `Tem certeza que deseja excluir a area "${label}"? A operacao sera afetada e os membros vinculados a ele ficarao sem departamento.`,
          onConfirm: (id) => deleteDepto(id),
        }}
        renderHeader={(_ctx) => (
          <>
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
                  Gerencie as areas da sua operacao, organize sua equipe em esquadroes e direcione o fluxo de trabalho (Kanban) para os responsaveis adequados.
                </p>
              </div>
              {canCreate && (
                <Button onClick={handleOpenCreate} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
                  <Plus className="h-4 w-4" />
                  Novo Departamento
                </Button>
              )}
            </div>

            {/* Dashboard Metrics */}
            <div className="flex items-center gap-6 px-4">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Areas</p>
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
          </>
        )}
        renderItems={(filtered, ctx) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((depto) => (
              <div
                key={depto.id}
                onClick={() => handleOpenEdit(depto)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenEdit(depto); } }}
                role="button"
                tabIndex={0}
                className="group relative bg-background border border-border/10 rounded-[24px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                {/* Glow effect */}
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
                        <Badge variant={depto.ativo ? 'default' : 'secondary'} className={`text-xs font-bold uppercase tracking-wider px-2 py-0 ${depto.ativo ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}`}>
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
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(depto); }}
                        className="rounded-[8px] cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Area
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive rounded-[8px] cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            ctx.requestDelete(depto.id, depto.nome);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Area
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground mt-4 line-clamp-2 min-h-[40px] relative z-10">
                  {depto.descricao || 'Nenhuma descricao fornecida.'}
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
        )}
        renderNoResults={(ctx) => (
          <EmptyStateForSearch searchTerm={ctx.searchTerm} onClear={() => ctx.setSearchTerm('')} />
        )}
      />

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
    </>
  );
};

/** Small helper for the "no results" state */
function EmptyStateForSearch({ searchTerm, onClear }: { searchTerm: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Nenhum departamento encontrado"
      description={`Nenhum departamento encontrado para "${searchTerm}".`}
      action={{ label: 'Limpar busca', onClick: onClear }}
    />
  );
}

export default DepartamentosManager;
