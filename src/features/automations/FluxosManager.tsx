import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Workflow, Loader2, Zap, Clock,
  Edit, Trash2, AlertCircle, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { FlowEditor, type FlowData } from './FlowEditor';
import type { Node, Edge } from '@xyflow/react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AutomationFlow {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'rascunho' | 'ativo' | 'pausado' | 'arquivado';
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  viewport: { x: number; y: number; zoom: number };
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FlowNode {
  id: string;
  flow_id: string;
  tipo: string;
  label: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
}

interface FlowEdge {
  id: string;
  flow_id: string;
  source_node: string;
  target_node: string;
  source_handle: string | null;
  label: string | null;
}

// FlowData is imported from FlowEditor

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  novo: 'Novo Lead',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Dept. Alterado',
  lead_quente: 'Lead Quente',
  agendamento_criado: 'Agendamento',
  ganho: 'Ganho',
  webhook: 'Webhook',
  manual: 'Manual',
  timer: 'Timer',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  ativo: {
    label: 'Ativo',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  pausado: {
    label: 'Pausado',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  arquivado: {
    label: 'Arquivado',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dbNodesToReactFlow(dbNodes: FlowNode[]): Node[] {
  return dbNodes.map((n) => ({
    id: n.id,
    type: n.tipo,
    position: { x: n.position_x, y: n.position_y },
    data: { label: n.label, ...n.config },
  }));
}

function dbEdgesToReactFlow(dbEdges: FlowEdge[]): Edge[] {
  return dbEdges.map((e) => ({
    id: e.id,
    source: e.source_node,
    target: e.target_node,
    sourceHandle: e.source_handle,
    label: e.label ?? undefined,
    type: 'smoothstep',
    animated: true,
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FluxosManager() {
  usePageTitle('Fluxos de Automação');
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  // View state
  const [editorMode, setEditorMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });
  const [saving, setSaving] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const {
    data: flows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['automation-flows', tenantId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('automation_flows')
        .select('*')
        .order('updated_at', { ascending: false });
      if (err) throw err;
      return (data ?? []) as AutomationFlow[];
    },
    enabled: !!tenantId,
  });

  // Load a single flow with nodes + edges for the editor
  const {
    data: editingFlowData,
    isLoading: loadingEditor,
  } = useQuery({
    queryKey: ['automation-flow-detail', editingFlowId],
    queryFn: async () => {
      if (!editingFlowId) return null;
      const [flowRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from('automation_flows').select('*').eq('id', editingFlowId).single(),
        supabase.from('automation_flow_nodes').select('*').eq('flow_id', editingFlowId),
        supabase.from('automation_flow_edges').select('*').eq('flow_id', editingFlowId),
      ]);
      if (flowRes.error) throw flowRes.error;
      const flow = flowRes.data as AutomationFlow;
      const nodes = dbNodesToReactFlow((nodesRes.data ?? []) as FlowNode[]);
      const edges = dbEdgesToReactFlow((edgesRes.data ?? []) as FlowEdge[]);
      return { ...flow, nodes, edges };
    },
    enabled: !!editingFlowId && editorMode === 'edit',
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Cascade deletes nodes/edges via FK
      const { error: err } = await supabase
        .from('automation_flows')
        .delete()
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast({ title: 'Fluxo excluído com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir fluxo', variant: 'destructive' });
    },
  });

  // ─── Save handler ────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: FlowData) => {
      if (!tenantId || !profile?.id) return;
      setSaving(true);
      try {
        let flowId = data.id;

        if (flowId) {
          // Update existing flow
          const { error: updateErr } = await supabase
            .from('automation_flows')
            .update({
              nome: data.nome,
              descricao: data.descricao ?? null,
              status: data.status,
              trigger_type: data.trigger_type,
              trigger_config: data.trigger_config ?? {},
              viewport: data.viewport ?? { x: 0, y: 0, zoom: 1 },
            })
            .eq('id', flowId);
          if (updateErr) throw updateErr;
        } else {
          // Insert new flow
          const { data: inserted, error: insertErr } = await supabase
            .from('automation_flows')
            .insert({
              tenant_id: tenantId,
              nome: data.nome,
              descricao: data.descricao ?? null,
              status: data.status,
              trigger_type: data.trigger_type,
              trigger_config: data.trigger_config ?? {},
              viewport: data.viewport ?? { x: 0, y: 0, zoom: 1 },
              created_by: profile.id,
            })
            .select('id')
            .single();
          if (insertErr) throw insertErr;
          flowId = (inserted as { id: string }).id;
        }

        // Delete old nodes and edges, then re-insert
        await Promise.all([
          supabase.from('automation_flow_nodes').delete().eq('flow_id', flowId),
          supabase.from('automation_flow_edges').delete().eq('flow_id', flowId),
        ]);

        const resolvedFlowId = flowId ?? '';

        // Insert nodes
        if (data.nodes.length > 0) {
          const dbNodes = data.nodes.map((n) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nodeData = n.data as any;
            const { label: nodeLabel, ...config } = nodeData as Record<string, unknown>;
            return {
              id: n.id,
              flow_id: resolvedFlowId,
              tipo: n.type ?? 'action',
              label: typeof nodeLabel === 'string' ? nodeLabel : '',
              config,
              position_x: n.position.x,
              position_y: n.position.y,
            };
          });
          const { error: nodesErr } = await supabase
            .from('automation_flow_nodes')
            .insert(dbNodes);
          if (nodesErr) throw nodesErr;
        }

        // Insert edges
        if (data.edges.length > 0) {
          const dbEdges = data.edges.map((e) => ({
            id: e.id,
            flow_id: resolvedFlowId,
            source_node: e.source,
            target_node: e.target,
            source_handle: e.sourceHandle ?? null,
            label: typeof e.label === 'string' ? e.label : null,
          }));
          const { error: edgesErr } = await supabase
            .from('automation_flow_edges')
            .insert(dbEdges);
          if (edgesErr) throw edgesErr;
        }

        void queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
        toast({ title: 'Fluxo salvo com sucesso' });
        setEditorMode('list');
        setEditingFlowId(null);
      } catch (err) {
        console.error('Erro ao salvar fluxo:', err);
        toast({ title: 'Erro ao salvar fluxo', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    },
    [tenantId, profile?.id, queryClient, toast]
  );

  // ─── Editor view ─────────────────────────────────────────────────────────

  if (editorMode === 'new') {
    return (
      <FlowEditor
        onSave={handleSave}
        onBack={() => { setEditorMode('list'); setEditingFlowId(null); }}
        saving={saving}
      />
    );
  }

  if (editorMode === 'edit') {
    if (loadingEditor || !editingFlowData) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <FlowEditor
        initialData={editingFlowData}
        onSave={handleSave}
        onBack={() => { setEditorMode('list'); setEditingFlowId(null); }}
        saving={saving}
      />
    );
  }

  // ─── List view ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/15 shadow-lg shadow-primary/20">
              <Workflow className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Fluxos de Automação
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-wider px-3"
            >
              Visual Workflow Builder
            </Badge>
            <span className="text-sm text-muted-foreground">
              Crie fluxos visuais para automatizar ações no seu escritório
            </span>
          </div>
        </div>

        <Button
          onClick={() => setEditorMode('new')}
          className="rounded-[10px] gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          Novo Fluxo
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={`skeleton-${i}`}
              className="h-[180px] rounded-[20px] bg-muted/30"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-[16px] border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Erro ao carregar fluxos. Tente novamente mais tarde.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && flows.length === 0 && (
        <EmptyState
          icon={Workflow}
          title="Nenhum fluxo de automação"
          description="Crie seu primeiro fluxo visual para automatizar processos do escritório como follow-ups, notificações e atribuições."
          action={{ label: 'Criar Primeiro Fluxo', onClick: () => setEditorMode('new') }}
        />
      )}

      {/* Flow cards */}
      {!isLoading && flows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flows.map((flow) => {
            const statusBadge = STATUS_BADGES[flow.status] ?? { label: 'Rascunho', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

            return (
              <div
                key={flow.id}
                className="group relative rounded-[20px] border border-border/10 bg-background/95 backdrop-blur-xl
                           p-5 hover:border-border/20 transition-all duration-200 cursor-pointer"
                onClick={() => {
                  setEditingFlowId(flow.id);
                  setEditorMode('edit');
                }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] rounded-full ${statusBadge.className}`}
                  >
                    {flow.status === 'ativo' && (
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    {statusBadge.label}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/30 text-muted-foreground border-border/10 rounded-full"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {TRIGGER_LABELS[flow.trigger_type] ?? flow.trigger_type}
                  </Badge>
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold text-foreground mb-1 truncate">
                  {flow.nome}
                </h3>
                {flow.descricao && (
                  <p className="text-[11px] text-muted-foreground truncate mb-3">
                    {flow.descricao}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-auto pt-3 border-t border-border/5">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>{flow.execucoes_total} execuções</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(flow.ultima_execucao)}</span>
                  </div>
                </div>

                {/* Action buttons (visible on hover) */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-[8px] bg-muted/30 hover:bg-muted/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFlowId(flow.id);
                      setEditorMode('edit');
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-[8px] bg-muted/30 hover:bg-red-500/20 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ open: true, id: flow.id, label: flow.nome });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => { if (!v) setConfirmDelete({ open: false, id: '', label: '' }); }}
        title="Excluir fluxo"
        description={`Tem certeza que deseja excluir o fluxo "${confirmDelete.label}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          void deleteMutation.mutateAsync(confirmDelete.id);
          setConfirmDelete({ open: false, id: '', label: '' });
        }}
        loading={deleteMutation.isPending}
        destructive
      />
    </div>
  );
}

export default FluxosManager;
