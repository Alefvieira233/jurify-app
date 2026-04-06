import React, { useState, useCallback, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Plus, Workflow, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import type { FlowData } from './FlowEditor';
const FlowEditor = React.lazy(() => import('./FlowEditor').then(m => ({ default: m.FlowEditor })));
import { createLogger } from '@/lib/logger';
import type { Node, Edge } from '@xyflow/react';
import { FlowCard, type AutomationFlow, type FlowNode, type FlowEdge } from './FlowCard';

const logger = createLogger('FluxosManager');

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    refetch: refetchFlows,
  } = useQuery({
    queryKey: queryKeys.automationFlows.list(tenantId),
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('automation_flows')
        .select('id, tenant_id, nome, descricao, status, trigger_type, trigger_config, viewport, execucoes_total, ultima_execucao, created_by, created_at, updated_at')
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
    queryKey: queryKeys.automationFlows.detail(editingFlowId),
    queryFn: async () => {
      if (!editingFlowId) return null;
      const [flowRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from('automation_flows').select('id, tenant_id, nome, descricao, status, trigger_type, trigger_config, viewport, execucoes_total, ultima_execucao, created_by, created_at, updated_at').eq('id', editingFlowId).single(),
        supabase.from('automation_flow_nodes').select('id, flow_id, tipo, label, config, position_x, position_y').eq('flow_id', editingFlowId),
        supabase.from('automation_flow_edges').select('id, flow_id, source_node, target_node, source_handle, label').eq('flow_id', editingFlowId),
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
      const { error: err } = await supabase
        .from('automation_flows')
        .delete()
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automationFlows.all });
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

        await Promise.all([
          supabase.from('automation_flow_nodes').delete().eq('flow_id', flowId),
          supabase.from('automation_flow_edges').delete().eq('flow_id', flowId),
        ]);

        const resolvedFlowId = flowId ?? '';

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

        void queryClient.invalidateQueries({ queryKey: queryKeys.automationFlows.all });
        toast({ title: 'Fluxo salvo com sucesso' });
        setEditorMode('list');
        setEditingFlowId(null);
      } catch (err) {
        logger.error('Erro ao salvar fluxo:', err);
        toast({ title: 'Erro ao salvar fluxo', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    },
    [tenantId, profile?.id, queryClient, toast]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleEdit = useCallback((id: string) => {
    setEditingFlowId(id);
    setEditorMode('edit');
  }, []);

  const handleDelete = useCallback((id: string, label: string) => {
    setConfirmDelete({ open: true, id, label });
  }, []);

  // ─── Editor view ─────────────────────────────────────────────────────────

  if (editorMode === 'new') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <FlowEditor
          onSave={handleSave}
          onBack={() => { setEditorMode('list'); setEditingFlowId(null); }}
          saving={saving}
        />
      </Suspense>
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
      <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <FlowEditor
          initialData={editingFlowData}
          onSave={handleSave}
          onBack={() => { setEditorMode('list'); setEditingFlowId(null); }}
          saving={saving}
        />
      </Suspense>
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
        <ErrorState title="Erro ao carregar fluxos" onRetry={() => void refetchFlows()} />
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
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
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
