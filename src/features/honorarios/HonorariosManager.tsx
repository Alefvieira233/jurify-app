import { useState, useMemo } from 'react';
import { Plus, Search, DollarSign, AlertCircle, RefreshCw, Edit, Trash2, TrendingUp } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHonorarios } from '@/hooks/useHonorarios';
import type { HonorarioWithOverdue } from '@/hooks/useHonorarios';
import PaginationControls from '@/components/PaginationControls';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import NovoHonorarioForm from './components/NovoHonorarioForm';
import type { HonorarioFormData } from '@/schemas/honorarioSchema';

const log = createLogger('HonorariosManager');

const STATUS_COLORS: Record<string, string> = {
  vigente: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  pago: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  inadimplente: 'bg-red-500/10 text-red-600 dark:text-red-300',
  cancelado: 'bg-slate-500/10 text-slate-500',
  disputado: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
};

const STATUS_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  pago: 'Pago',
  inadimplente: 'Inadimplente',
  cancelado: 'Cancelado',
  disputado: 'Disputado',
};

const TIPO_LABELS: Record<string, string> = {
  fixo: 'Fixo',
  hora: 'Por Hora',
  contingencia: 'Contingência',
  misto: 'Misto',
  retainer: 'Retainer',
};

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const HonorariosManager = () => {
  usePageTitle('Honorários');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHonorario, setSelectedHonorario] = useState<HonorarioWithOverdue | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(1);

  const { honorarios, totalRecebido, totalAcordado, totalCount, totalPages, hasNextPage, hasPrevPage, loading, error, isEmpty, fetchHonorarios, createHonorario, updateHonorario } = useHonorarios({ page });
  const { toast } = useToast();
  const { profile } = useAuth();
  const { can } = useRBAC();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  const handleMarcarInadimplente = async (id: string) => {
    const { error: updateError } = await supabase
      .from('honorarios')
      .update({ status: 'inadimplente' })
      .eq('id', id);
    if (updateError) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado', description: 'Honorário marcado como inadimplente.' });
      void queryClient.invalidateQueries({ queryKey: ['honorarios'] });
    }
  };

  const filteredHonorarios = useMemo(() => honorarios.filter(h => {
    const matchSearch = !debouncedSearch ||
      TIPO_LABELS[h.tipo]?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      h.observacoes?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = filterStatus === '' || h.status === filterStatus;
    return matchSearch && matchStatus;
  }), [honorarios, debouncedSearch, filterStatus]);

  const handleSubmitForm = async (data: HonorarioFormData): Promise<boolean> => {
    setFormLoading(true);
    try {
      let ok = false;
      if (selectedHonorario) {
        ok = await updateHonorario(selectedHonorario.id, data);
      } else {
        ok = await createHonorario({ ...data, tenant_id: tenantId });
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
        .from('honorarios')
        .delete()
        .eq('id', confirmDelete.id)
        .eq('tenant_id', tenantId);
      if (deleteError) throw deleteError;
      toast({ title: 'Honorário excluído' });
      fetchHonorarios();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir.';
      log.error('Erro ao excluir honorário', err);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card><CardHeader><CardTitle className="text-2xl">Honorários</CardTitle></CardHeader></Card>
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
              <CardTitle>Erro ao carregar honorários</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchHonorarios} variant="outline">
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
          icon={DollarSign}
          title="Nenhum Honorário"
          description="Não há honorários cadastrados. Adicione o primeiro honorário para controlar a receita do escritório."
          action={can('honorarios', 'create') ? {
            label: 'Novo Honorário',
            onClick: () => { setSelectedHonorario(null); setIsFormOpen(true); },
          } : undefined}
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Honorário</DialogTitle></DialogHeader>
            <NovoHonorarioForm onSubmit={handleSubmitForm} onCancel={() => setIsFormOpen(false)} loading={formLoading} />
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
              <CardTitle className="text-2xl">Honorários</CardTitle>
              <p className="text-muted-foreground">{filteredHonorarios.length} honorário{filteredHonorarios.length !== 1 ? 's' : ''}</p>
            </div>
            {can('honorarios', 'create') && (
              <Button onClick={() => { setSelectedHonorario(null); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Honorário
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* P&L Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Acordado</p>
            <p className="text-lg font-bold mt-1">{fmt(totalAcordado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recebido</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(totalRecebido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">A Receber</p>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
              {fmt(totalAcordado - totalRecebido)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
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
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3">
        {filteredHonorarios.map(h => (
          <Card key={h.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{TIPO_LABELS[h.tipo] ?? h.tipo}</Badge>
                    <Badge className={STATUS_COLORS[h.status] ?? ''}>{STATUS_LABELS[h.status] ?? h.status}</Badge>
                    {h.overdue && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span><span className="text-muted-foreground">Acordado:</span> <span className="font-medium">{fmt(h.valor_total_acordado)}</span></span>
                    <span><span className="text-muted-foreground">Recebido:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(h.valor_recebido)}</span></span>
                    {h.data_vencimento && (
                      <span><span className="text-muted-foreground">Vencimento:</span> <span className="font-medium">{new Date(h.data_vencimento).toLocaleDateString('pt-BR')}</span></span>
                    )}
                  </div>
                  {h.observacoes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{h.observacoes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {h.overdue && can('honorarios', 'update') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { void handleMarcarInadimplente(h.id); }}
                    >
                      Marcar Inadimplente
                    </Button>
                  )}
                  {can('honorarios', 'update') && (
                    <Button size="sm" variant="ghost" title="Editar"
                      onClick={() => { setSelectedHonorario(h); setIsFormOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {can('honorarios', 'delete') && (
                    <Button size="sm" variant="ghost" title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({ open: true, id: h.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => p + 1)}
        label="honorários"
      />

      {filteredHonorarios.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum honorário encontrado para os filtros aplicados.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedHonorario ? 'Editar Honorário' : 'Novo Honorário'}</DialogTitle>
          </DialogHeader>
          <NovoHonorarioForm
            onSubmit={handleSubmitForm}
            onCancel={() => setIsFormOpen(false)}
            loading={formLoading}
            initialData={selectedHonorario}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={v => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Honorário"
        description="Tem certeza que deseja excluir este honorário?"
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default HonorariosManager;
