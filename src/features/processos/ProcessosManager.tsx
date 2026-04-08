import { useState, useCallback } from 'react';
import { Plus, Search, Scale, Eye, Edit, Trash2, XCircle, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileCard } from '@/components/ui/MobileCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProcessos } from '@/hooks/useProcessos';
import type { Processo } from '@/hooks/useProcessos';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import PaginationControls from '@/components/PaginationControls';
import { ScreenReaderAnnounce } from '@/components/ui/ScreenReaderAnnounce';
import NovoProcessoForm from './components/NovoProcessoForm';
import ProcessoDetalhes from './components/ProcessoDetalhes';
import { EncerrarProcessoDialog } from './components/EncerrarProcessoDialog';
import type { ProcessoFormData } from '@/schemas/processoSchema';
import { PROCESSO_STATUS_LABELS } from '@/schemas/processoSchema';
import { getStatusClasses } from '@/constants/statusConfig';
import ProcessoCard, { TIPO_LABELS } from './components/ProcessoCard';
import { ProcessosStats } from './components/ProcessosStats';

const log = createLogger('ProcessosManager');


const ProcessosManager = () => {
  usePageTitle('Processos');
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const [encerrarProcesso, setEncerrarProcesso] = useState<{ open: boolean; id: string; numero: string }>({
    open: false, id: '', numero: '',
  });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const {
    processos, loading, error, isEmpty, fetchProcessos, createProcesso, updateProcesso,
    currentPage, totalPages, totalCount, hasPrevPage, hasNextPage, prevPage, nextPage,
  } = useProcessos({
    enablePagination: true,
    filterStatus: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
    filterTipo: filterTipo && filterTipo !== 'all' ? filterTipo : undefined,
    search: debouncedSearch || undefined,
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const { can } = useRBAC();
  const tenantId = profile?.tenant_id ?? null;

  const canUpdateProcessos = can('processos', 'update');
  const canDeleteProcessos = can('processos', 'delete');

  const handleViewProcesso = useCallback((processo: Processo) => {
    setSelectedProcesso(processo);
    setIsDetalhesOpen(true);
  }, []);

  const handleEditProcesso = useCallback((processo: Processo) => {
    setSelectedProcesso(processo);
    setIsFormOpen(true);
  }, []);

  const handleEncerrarProcesso = useCallback((processo: Processo) => {
    setEncerrarProcesso({
      open: true,
      id: processo.id,
      numero: processo.numero_processo || 'processo',
    });
  }, []);

  const handleConfirmDelete = useCallback((processo: Processo) => {
    setConfirmDelete({
      open: true,
      id: processo.id,
      label: processo.numero_processo || 'processo',
    });
  }, []);

  // Stats queries
  const { prazosUrgentes } = usePrazosProcessuais();

  const { data: statsAtivos } = useQuery({
    queryKey: queryKeys.processos.statsAtivos(tenantId),
    queryFn: async () => {
      const { count, error: err } = await supabase
        .from('processos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('status', 'ativo');
      if (err) throw err;
      return count ?? 0;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: statsExito } = useQuery({
    queryKey: queryKeys.processos.statsExito(tenantId),
    queryFn: async () => {
      const statuses = ['encerrado_vitoria', 'encerrado_derrota', 'encerrado_acordo'];
      const counts = await Promise.all(
        statuses.map(async (s) => {
          const { count, error: err } = await supabase
            .from('processos')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId!)
            .eq('status', s);
          if (err) throw err;
          return count ?? 0;
        }),
      );
      const vitorias = counts[0] ?? 0;
      const derrotas = counts[1] ?? 0;
      const acordos = counts[2] ?? 0;
      const total = vitorias + derrotas + acordos;
      return total > 0 ? Math.round((vitorias / total) * 100) : 0;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  const handleSubmitForm = async (data: ProcessoFormData): Promise<boolean> => {
    setFormLoading(true);
    try {
      let ok = false;
      if (selectedProcesso) {
        ok = await updateProcesso(selectedProcesso.id, data);
      } else {
        ok = await createProcesso({ ...data, tenant_id: tenantId });
      }
      if (ok) setIsFormOpen(false);
      return ok;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { error: deleteError } = await supabase
        .from('processos')
        .delete()
        .eq('id', confirmDelete.id)
        .eq('tenant_id', tenantId);
      if (deleteError) throw deleteError;
      toast({ title: 'Processo excluído', description: 'Processo removido com sucesso!' });
      fetchProcessos();
    } catch (err: unknown) {
      log.error('Erro ao excluir processo', err);
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: '', label: '' });
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Processos Jurídicos</CardTitle>
                <p className="text-muted-foreground">Gerencie os processos e expedientes do escritório</p>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-6 w-64" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Erro ao carregar processos" message={error} onRetry={fetchProcessos} />
      </div>
    );
  }

  const hasFilter = debouncedSearch || (filterStatus && filterStatus !== 'all') || (filterTipo && filterTipo !== 'all');
  const filterAnnouncement = hasFilter
    ? `${totalCount} processo${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}`
    : '';

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {filterAnnouncement && <ScreenReaderAnnounce message={filterAnnouncement} />}
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Processos Jurídicos</CardTitle>
              <p className="text-muted-foreground">
                {isEmpty ? 'Gerencie os processos e expedientes do escritório' : (
                  <>{totalCount} processo{totalCount !== 1 ? 's' : ''}
                  {filterStatus || filterTipo || debouncedSearch ? ' (filtrados)' : ''}</>
                )}
              </p>
            </div>
            {can('processos', 'create') && (
              <Button onClick={() => { setSelectedProcesso(null); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Processo
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <ProcessosStats
        totalCount={totalCount}
        statsAtivos={statsAtivos ?? 0}
        statsExito={statsExito ?? 0}
        prazosUrgentesCount={prazosUrgentes.length}
      />

      {isEmpty ? (
        <EmptyState
          icon={Scale}
          title="Nenhum Processo"
          description="Não há processos cadastrados. Adicione o primeiro processo para começar a gerenciar seus expedientes."
          action={can('processos', 'create') ? {
            label: 'Novo Processo',
            onClick: () => { setSelectedProcesso(null); setIsFormOpen(true); },
          } : undefined}
        />
      ) : (
      <>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                aria-label="Buscar por número, tribunal, comarca..." placeholder="Buscar por número, tribunal, comarca..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(PROCESSO_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isMobile ? (
        <div className="space-y-3">
          {processos.map(processo => (
            <MobileCard
              key={processo.id}
              title={processo.numero_processo || 'Sem número'}
              subtitle={[processo.tribunal, processo.vara, processo.comarca].filter(Boolean).join(' \u2022 ') || 'Sem localização'}
              badge={
                <Badge className={getStatusClasses('processos', processo.status)}>
                  {PROCESSO_STATUS_LABELS[processo.status] ?? processo.status}
                </Badge>
              }
              details={[
                { label: 'Tipo', value: TIPO_LABELS[processo.tipo_acao] ?? processo.tipo_acao },
                { label: 'Fase', value: <span className="capitalize">{processo.fase_processual.replace(/_/g, ' ')}</span> },
                ...(processo.valor_causa ? [{ label: 'Valor', value: processo.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }] : []),
              ]}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full">
                      <MoreVertical className="w-4 h-4 mr-2" />
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewProcesso(processo)}>
                      <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                    </DropdownMenuItem>
                    {canUpdateProcessos && (
                      <DropdownMenuItem onClick={() => handleEditProcesso(processo)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    {canUpdateProcessos && (processo.status === 'ativo' || processo.status === 'suspenso') && (
                      <DropdownMenuItem onClick={() => handleEncerrarProcesso(processo)} className="text-amber-600">
                        <XCircle className="w-4 h-4 mr-2" /> Encerrar
                      </DropdownMenuItem>
                    )}
                    {canDeleteProcessos && (
                      <DropdownMenuItem onClick={() => handleConfirmDelete(processo)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
              onClick={() => handleViewProcesso(processo)}
            />
          ))}
        </div>
      ) : (
      <div className="grid gap-4">
        {processos.map(processo => (
          <ProcessoCard
            key={processo.id}
            processo={processo}
            canUpdate={canUpdateProcessos}
            canDelete={canDeleteProcessos}
            onView={handleViewProcesso}
            onEdit={handleEditProcesso}
            onEncerrar={handleEncerrarProcesso}
            onDelete={handleConfirmDelete}
          />
        ))}
      </div>
      )}

      {processos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum processo encontrado para os filtros aplicados.</p>
            <Button variant="ghost" className="mt-2" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterTipo('all'); }}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrev={prevPage}
        onNext={nextPage}
        label="processos"
      />
      </>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProcesso ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          </DialogHeader>
          <NovoProcessoForm
            onSubmit={handleSubmitForm}
            onCancel={() => setIsFormOpen(false)}
            loading={formLoading}
            initialData={selectedProcesso}
          />
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog — tabbed view */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProcesso?.numero_processo
                ? `Processo ${selectedProcesso.numero_processo}`
                : 'Detalhes do Processo'}
            </DialogTitle>
          </DialogHeader>
          {selectedProcesso && <ProcessoDetalhes processo={selectedProcesso} />}
        </DialogContent>
      </Dialog>

      {/* Encerrar Dialog */}
      <EncerrarProcessoDialog
        processoId={encerrarProcesso.id}
        processoNumero={encerrarProcesso.numero}
        open={encerrarProcesso.open}
        onClose={() => setEncerrarProcesso({ open: false, id: '', numero: '' })}
        onSuccess={fetchProcessos}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={v => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Processo"
        description={`Tem certeza que deseja excluir o processo "${confirmDelete.label}"? Esta ação também removerá os prazos e honorários associados.`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default ProcessosManager;
