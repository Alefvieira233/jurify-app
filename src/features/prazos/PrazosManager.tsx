import { useState } from 'react';
import { Plus, Search, Clock, AlertCircle, RefreshCw, Edit, Trash2, CheckCircle, List, CalendarDays } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';
import type { PrazoProcessual } from '@/hooks/usePrazosProcessuais';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import PaginationControls from '@/components/PaginationControls';
import PrazoAlertaBadge from './components/PrazoAlertaBadge';
import NovoPrazoForm from './components/NovoPrazoForm';
import { PrazosCalendario } from './components/PrazosCalendario';
import type { PrazoFormData } from '@/schemas/prazoSchema';

const log = createLogger('PrazosManager');

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

const PrazosManager = () => {
  usePageTitle('Prazos Processuais');
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('pendente');
  const [filterTipo, setFilterTipo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPrazo, setSelectedPrazo] = useState<PrazoProcessual | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const {
    prazos, prazosUrgentes, loading, error, isEmpty, fetchPrazos, createPrazo, updatePrazo, deletePrazo,
    currentPage, totalPages, totalCount, hasPrevPage, hasNextPage, prevPage, nextPage,
  } = usePrazosProcessuais({
    enablePagination: true,
    filterStatus: filterStatus || undefined,
    filterTipo: filterTipo || undefined,
    search: debouncedSearch || undefined,
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const { can } = useRBAC();
  const tenantId = profile?.tenant_id ?? null;

  // Filtering is now server-side via usePrazosProcessuais options
  const filteredPrazos = prazos;

  const handleSubmitForm = async (data: PrazoFormData): Promise<boolean> => {
    setFormLoading(true);
    try {
      let ok = false;
      if (selectedPrazo) {
        ok = await updatePrazo(selectedPrazo.id, data);
      } else {
        ok = await createPrazo({ ...data, tenant_id: tenantId });
      }
      if (ok) setIsFormOpen(false);
      return ok;
    } finally {
      setFormLoading(false);
    }
  };

  const handleMarcarCumprido = async (prazo: PrazoProcessual) => {
    const ok = await updatePrazo(prazo.id, {
      status: 'cumprido',
      data_cumprimento: new Date().toISOString(),
    });
    if (ok) toast({ title: 'Prazo cumprido', description: 'Prazo marcado como cumprido.' });
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deletePrazo(confirmDelete.id);
    } catch (err: unknown) {
      log.error('Erro ao excluir prazo', err);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: '', label: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Prazos Processuais</CardTitle>
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

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Erro ao carregar prazos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPrazos} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Clock}
          title="Nenhum Prazo"
          description="Não há prazos cadastrados. Adicione o primeiro prazo para controlar seus prazos processuais."
          action={can('prazos', 'create') ? {
            label: 'Novo Prazo',
            onClick: () => { setSelectedPrazo(null); setIsFormOpen(true); },
          } : undefined}
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Prazo</DialogTitle></DialogHeader>
            <NovoPrazoForm onSubmit={handleSubmitForm} onCancel={() => setIsFormOpen(false)} loading={formLoading} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Prazos Processuais</CardTitle>
              <p className="text-muted-foreground">
                {filteredPrazos.length} prazo{filteredPrazos.length !== 1 ? 's' : ''}
                {prazosUrgentes.length > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">• {prazosUrgentes.length} urgente{prazosUrgentes.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button
                  size="sm"
                  variant={view === 'lista' ? 'default' : 'ghost'}
                  onClick={() => setView('lista')}
                  title="Visualizar como lista"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={view === 'calendario' ? 'default' : 'ghost'}
                  onClick={() => setView('calendario')}
                  title="Visualizar como calendário"
                >
                  <CalendarDays className="w-4 h-4" />
                </Button>
              </div>
              {can('prazos', 'create') && (
                <Button onClick={() => { setSelectedPrazo(null); setIsFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Prazo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === 'calendario' && tenantId ? (
        <PrazosCalendario tenantId={tenantId} />
      ) : (
      <>
      {/* Urgentes warning */}
      {prazosUrgentes.length > 0 && filterStatus === 'pendente' && (
        <Card className="border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              ⚠️ {prazosUrgentes.length} prazo{prazosUrgentes.length !== 1 ? 's' : ''} venc{prazosUrgentes.length !== 1 ? 'em' : 'e'} em até 7 dias
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou tipo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="cumprido">Cumprido</option>
              <option value="perdido">Perdido</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3">
        {filteredPrazos.map(prazo => (
          <Card key={prazo.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{prazo.descricao}</h3>
                    <Badge variant="outline" className="text-xs">{TIPO_LABELS[prazo.tipo] ?? prazo.tipo}</Badge>
                    <PrazoAlertaBadge dataPrazo={prazo.data_prazo} status={prazo.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(prazo.data_prazo).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {prazo.observacoes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{prazo.observacoes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {prazo.status === 'pendente' && can('prazos', 'update') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Marcar como cumprido"
                      className="text-emerald-600 hover:text-emerald-600"
                      onClick={() => { void handleMarcarCumprido(prazo); }}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {can('prazos', 'update') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Editar"
                      onClick={() => { setSelectedPrazo(prazo); setIsFormOpen(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {can('prazos', 'delete') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({ open: true, id: prazo.id, label: prazo.descricao })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrazos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum prazo encontrado para os filtros aplicados.</p>
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
        label="prazos"
      />
      </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPrazo ? 'Editar Prazo' : 'Novo Prazo'}</DialogTitle>
          </DialogHeader>
          <NovoPrazoForm
            onSubmit={handleSubmitForm}
            onCancel={() => setIsFormOpen(false)}
            loading={formLoading}
            initialData={selectedPrazo}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={v => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Prazo"
        description={`Tem certeza que deseja excluir o prazo "${confirmDelete.label}"?`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default PrazosManager;
