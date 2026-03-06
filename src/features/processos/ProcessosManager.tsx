import { useState, useMemo } from 'react';
import { Plus, Search, Scale, AlertCircle, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProcessos } from '@/hooks/useProcessos';
import type { Processo } from '@/hooks/useProcessos';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import NovoProcessoForm from './components/NovoProcessoForm';
import type { ProcessoFormData } from '@/schemas/processoSchema';

const log = createLogger('ProcessosManager');

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  suspenso: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  encerrado_vitoria: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  encerrado_derrota: 'bg-red-500/10 text-red-600 dark:text-red-300',
  encerrado_acordo: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
  arquivado: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado_vitoria: 'Encerrado — Vitória',
  encerrado_derrota: 'Encerrado — Derrota',
  encerrado_acordo: 'Encerrado — Acordo',
  arquivado: 'Arquivado',
};

const TIPO_LABELS: Record<string, string> = {
  civel: 'Cível',
  criminal: 'Criminal',
  trabalhista: 'Trabalhista',
  previdenciario: 'Previdenciário',
  familia: 'Família',
  empresarial: 'Empresarial',
  tributario: 'Tributário',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

const ProcessosManager = () => {
  usePageTitle('Processos');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { processos, loading, error, isEmpty, fetchProcessos, createProcesso, updateProcesso } = useProcessos();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { can } = useRBAC();
  const tenantId = profile?.tenant_id ?? null;

  const filteredProcessos = useMemo(() => processos.filter(p => {
    const matchSearch = !debouncedSearch ||
      p.numero_processo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.tribunal?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.comarca?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.observacoes?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = filterStatus === '' || p.status === filterStatus;
    const matchTipo = filterTipo === '' || p.tipo_acao === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  }), [processos, debouncedSearch, filterStatus, filterTipo]);

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
      const message = err instanceof Error ? err.message : 'Não foi possível excluir o processo.';
      log.error('Erro ao excluir processo', err);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Erro ao carregar processos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchProcessos} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Scale}
          title="Nenhum Processo"
          description="Não há processos cadastrados. Adicione o primeiro processo para começar a gerenciar seus expedientes."
          action={can('processos', 'create') ? {
            label: 'Novo Processo',
            onClick: () => { setSelectedProcesso(null); setIsFormOpen(true); },
          } : undefined}
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Processo</DialogTitle>
            </DialogHeader>
            <NovoProcessoForm
              onSubmit={handleSubmitForm}
              onCancel={() => setIsFormOpen(false)}
              loading={formLoading}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Processos Jurídicos</CardTitle>
              <p className="text-muted-foreground">
                {filteredProcessos.length} processo{filteredProcessos.length !== 1 ? 's' : ''}
                {filterStatus || filterTipo || debouncedSearch ? ' (filtrados)' : ''}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, tribunal, comarca..."
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
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
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
      <div className="grid gap-4">
        {filteredProcessos.map(processo => (
          <Card key={processo.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">
                      {processo.numero_processo || 'Sem número'}
                    </h3>
                    <Badge className={STATUS_COLORS[processo.status] ?? 'bg-muted text-muted-foreground'}>
                      {STATUS_LABELS[processo.status] ?? processo.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {TIPO_LABELS[processo.tipo_acao] ?? processo.tipo_acao}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[processo.tribunal, processo.vara, processo.comarca]
                      .filter(Boolean).join(' • ') || 'Sem localização'}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Fase: <span className="font-medium capitalize">{processo.fase_processual.replace(/_/g, ' ')}</span></span>
                    <span>Posição: <span className="font-medium capitalize">{processo.posicao}</span></span>
                    {processo.valor_causa && (
                      <span>Valor: <span className="font-medium">
                        {processo.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span></span>
                    )}
                  </div>
                  {processo.observacoes && (
                    <p className="text-sm text-muted-foreground mt-2 truncate max-w-xl">
                      {processo.observacoes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Ver detalhes"
                    onClick={() => { setSelectedProcesso(processo); setIsDetalhesOpen(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {can('processos', 'update') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Editar"
                      onClick={() => { setSelectedProcesso(processo); setIsFormOpen(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {can('processos', 'delete') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({
                        open: true,
                        id: processo.id,
                        label: processo.numero_processo || 'processo',
                      })}
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

      {filteredProcessos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum processo encontrado para os filtros aplicados.</p>
            <Button variant="ghost" className="mt-2" onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterTipo(''); }}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Detalhes Dialog */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Processo</DialogTitle>
          </DialogHeader>
          {selectedProcesso && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">Número:</span> <span className="ml-1">{selectedProcesso.numero_processo || '—'}</span></div>
                <div><span className="font-medium text-muted-foreground">Tipo:</span> <span className="ml-1">{TIPO_LABELS[selectedProcesso.tipo_acao] ?? selectedProcesso.tipo_acao}</span></div>
                <div><span className="font-medium text-muted-foreground">Tribunal:</span> <span className="ml-1">{selectedProcesso.tribunal || '—'}</span></div>
                <div><span className="font-medium text-muted-foreground">Vara:</span> <span className="ml-1">{selectedProcesso.vara || '—'}</span></div>
                <div><span className="font-medium text-muted-foreground">Comarca:</span> <span className="ml-1">{selectedProcesso.comarca || '—'}</span></div>
                <div><span className="font-medium text-muted-foreground">Fase:</span> <span className="ml-1 capitalize">{selectedProcesso.fase_processual.replace(/_/g, ' ')}</span></div>
                <div><span className="font-medium text-muted-foreground">Posição:</span> <span className="ml-1 capitalize">{selectedProcesso.posicao}</span></div>
                <div><span className="font-medium text-muted-foreground">Status:</span> <span className="ml-1">{STATUS_LABELS[selectedProcesso.status] ?? selectedProcesso.status}</span></div>
                {selectedProcesso.valor_causa && (
                  <div><span className="font-medium text-muted-foreground">Valor da Causa:</span> <span className="ml-1">{selectedProcesso.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                )}
                {selectedProcesso.data_distribuicao && (
                  <div><span className="font-medium text-muted-foreground">Distribuição:</span> <span className="ml-1">{new Date(selectedProcesso.data_distribuicao).toLocaleDateString('pt-BR')}</span></div>
                )}
              </div>
              {selectedProcesso.observacoes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/50 rounded p-3">{selectedProcesso.observacoes}</p>
                </div>
              )}
              {selectedProcesso.partes_contrarias && selectedProcesso.partes_contrarias.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Partes Contrárias</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProcesso.partes_contrarias.map((parte, i) => (
                      <Badge key={i} variant="outline">{parte}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
