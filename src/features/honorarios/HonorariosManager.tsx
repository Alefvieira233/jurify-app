import { useState, useCallback, memo } from 'react';
import { Plus, DollarSign, Edit, Trash2, TrendingUp, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileCard } from '@/components/ui/MobileCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CRUDManagerLayout } from '@/components/CRUDManagerLayout';
import HonorariosDashboard from './HonorariosDashboard';
import { useHonorarios } from '@/hooks/useHonorarios';
import type { HonorarioWithOverdue } from '@/hooks/useHonorarios';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import NovoHonorarioForm from './components/NovoHonorarioForm';
import type { HonorarioFormData } from '@/schemas/honorarioSchema';
import { HONORARIO_STATUS_LABELS } from '@/schemas/honorarioSchema';
import { getStatusClasses } from '@/constants/statusConfig';

const log = createLogger('HonorariosManager');

const TIPO_LABELS: Record<string, string> = {
  fixo: 'Fixo',
  hora: 'Por Hora',
  contingencia: 'Contingencia',
  misto: 'Misto',
  retainer: 'Retainer',
};

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '\u2014';

interface HonorarioCardProps {
  honorario: HonorarioWithOverdue;
  canUpdate: boolean;
  canDelete: boolean;
  onMarcarInadimplente: (id: string) => void | Promise<void>;
  onEdit: (h: HonorarioWithOverdue) => void;
  onDelete: (id: string, label: string) => void;
}

const HonorarioCard = memo(({ honorario: h, canUpdate, canDelete, onMarcarInadimplente, onEdit, onDelete }: HonorarioCardProps) => (
  <Card className="hover:border-primary/50 transition-colors">
    <CardContent className="p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{TIPO_LABELS[h.tipo] ?? h.tipo}</Badge>
            <Badge className={getStatusClasses('honorarios', h.status)}>{HONORARIO_STATUS_LABELS[h.status] ?? h.status}</Badge>
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
          {h.overdue && canUpdate && (
            <Button size="sm" variant="destructive" onClick={() => { void onMarcarInadimplente(h.id); }}>
              Marcar Inadimplente
            </Button>
          )}
          {canUpdate && (
            <Button size="sm" variant="ghost" title="Editar" onClick={() => onEdit(h)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" title="Excluir"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(h.id, TIPO_LABELS[h.tipo] ?? h.tipo)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
));
HonorarioCard.displayName = 'HonorarioCard';

const HonorariosManager = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista'>('lista');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHonorario, setSelectedHonorario] = useState<HonorarioWithOverdue | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(1);

  const { honorarios, totalRecebido, totalAcordado, totalCount, totalPages, hasNextPage, hasPrevPage, loading, error, isEmpty, fetchHonorarios, createHonorario, updateHonorario } = useHonorarios({ page });
  const { toast } = useToast();
  const { profile } = useAuth();
  const { can } = useRBAC();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  const canUpdateHonorarios = can('honorarios', 'update');
  const canDeleteHonorarios = can('honorarios', 'delete');

  const handleEditHonorario = useCallback((h: HonorarioWithOverdue) => {
    setSelectedHonorario(h);
    setIsFormOpen(true);
  }, []);

  const handleMarcarInadimplente = useCallback(async (id: string) => {
    const { error: updateError } = await supabase
      .from('honorarios')
      .update({ status: 'inadimplente' })
      .eq('id', id);
    if (updateError) {
      toast({ title: 'Erro', description: 'Nao foi possivel atualizar.', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado', description: 'Honorario marcado como inadimplente.' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.honorarios.all });
    }
  }, [toast, queryClient]);

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

  const handleDelete = async (id: string) => {
    if (!tenantId) throw new Error('Tenant nao encontrado');
    const { error: deleteError } = await supabase
      .from('honorarios')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (deleteError) throw deleteError;
    toast({ title: 'Honorario excluido' });
    fetchHonorarios();
  };

  // Filter function: search + status
  const filterFn = (h: HonorarioWithOverdue, search: string) => {
    const matchSearch = !search ||
      TIPO_LABELS[h.tipo]?.toLowerCase().includes(search.toLowerCase()) ||
      h.observacoes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || filterStatus === 'all' || h.status === filterStatus;
    return (matchSearch ?? true) && matchStatus;
  };

  return (
    <>
      <div className="p-6 space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dashboard' | 'lista')}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <HonorariosDashboard />
          </TabsContent>
          <TabsContent value="lista" className="mt-4">
            <CRUDManagerLayout<HonorarioWithOverdue>
              className="p-0 space-y-6"
        pageTitle="Honorarios"
        items={honorarios}
        isLoading={loading}
        error={error}
        onRetry={fetchHonorarios}
        isEmpty={isEmpty}
        emptyStateProps={{
          icon: DollarSign,
          title: 'Nenhum Honorario',
          description: 'Nao ha honorarios cadastrados. Adicione o primeiro honorario para controlar a receita do escritorio.',
          action: can('honorarios', 'create') ? {
            label: 'Novo Honorario',
            onClick: () => { setSelectedHonorario(null); setIsFormOpen(true); },
          } : undefined,
        }}
        searchPlaceholder="Buscar..."
        filterFn={filterFn}
        pagination={{
          currentPage: page,
          totalPages,
          totalCount,
          hasPrevPage,
          hasNextPage,
          onPrev: () => setPage((p) => Math.max(1, p - 1)),
          onNext: () => setPage((p) => p + 1),
          label: 'honorarios',
        }}
        deleteConfig={{
          title: 'Excluir Honorario',
          description: 'Tem certeza que deseja excluir este honorario?',
          onConfirm: async (id) => {
            try {
              await handleDelete(id);
            } catch (err: unknown) {
              log.error('Erro ao excluir honorario', err);
              toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
            }
          },
        }}
        renderHeader={(ctx) => (
          <>
            {/* Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl">Honorarios</CardTitle>
                    <p className="text-muted-foreground">{ctx.filteredItems.length} honorario{ctx.filteredItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  {can('honorarios', 'create') && (
                    <Button onClick={() => { setSelectedHonorario(null); setIsFormOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Honorario
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
          </>
        )}
        renderFilters={() => (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(HONORARIO_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        renderItems={(filteredHonorarios, ctx) => isMobile ? (
          <div className="space-y-3">
            {filteredHonorarios.map((h) => (
              <MobileCard
                key={h.id}
                title={TIPO_LABELS[h.tipo] ?? h.tipo}
                subtitle={h.observacoes ?? undefined}
                badge={
                  <div className="flex gap-1">
                    <Badge className={getStatusClasses('honorarios', h.status)}>{HONORARIO_STATUS_LABELS[h.status] ?? h.status}</Badge>
                    {h.overdue && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                  </div>
                }
                details={[
                  { label: 'Acordado', value: fmt(h.valor_total_acordado) },
                  { label: 'Recebido', value: <span className="text-emerald-600 dark:text-emerald-400">{fmt(h.valor_recebido)}</span> },
                  ...(h.data_vencimento ? [{ label: 'Vencimento', value: new Date(h.data_vencimento).toLocaleDateString('pt-BR') }] : []),
                ]}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">
                        <MoreVertical className="w-4 h-4 mr-2" />
                        Acoes
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdateHonorarios && (
                        <DropdownMenuItem onClick={() => handleEditHonorario(h)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      )}
                      {h.overdue && canUpdateHonorarios && (
                        <DropdownMenuItem onClick={() => { void handleMarcarInadimplente(h.id); }} className="text-destructive">
                          Marcar Inadimplente
                        </DropdownMenuItem>
                      )}
                      {canDeleteHonorarios && (
                        <DropdownMenuItem onClick={() => ctx.requestDelete(h.id, TIPO_LABELS[h.tipo] ?? h.tipo)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredHonorarios.map((h) => (
              <HonorarioCard
                key={h.id}
                honorario={h}
                canUpdate={canUpdateHonorarios}
                canDelete={canDeleteHonorarios}
                onMarcarInadimplente={handleMarcarInadimplente}
                onEdit={handleEditHonorario}
                onDelete={(id, label) => ctx.requestDelete(id, label)}
              />
            ))}
          </div>
        )}
        renderNoResults={() => (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum honorario encontrado para os filtros aplicados.</p>
            </CardContent>
          </Card>
        )}
      />
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedHonorario ? 'Editar Honorario' : 'Novo Honorario'}</DialogTitle>
          </DialogHeader>
          <NovoHonorarioForm
            onSubmit={handleSubmitForm}
            onCancel={() => setIsFormOpen(false)}
            loading={formLoading}
            initialData={selectedHonorario}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HonorariosManager;
