import { useState, useCallback, useRef, useMemo, useSyncExternalStore, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronDown } from 'lucide-react';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { DelayNode } from './nodes/DelayNode';
import FlowToolbar from './components/FlowToolbar';
import FlowPalette from './components/FlowPalette';
import FlowConfigPanel from './components/FlowConfigPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowData {
  id?: string;
  nome: string;
  descricao?: string | null;
  status: 'rascunho' | 'ativo' | 'pausado' | 'arquivado';
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  viewport?: { x: number; y: number; zoom: number };
  nodes: Node[];
  edges: Edge[];
}

interface FlowEditorProps {
  initialData?: FlowData;
  onSave: (data: FlowData) => Promise<void>;
  onBack: () => void;
  saving?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
};

// ─── Dark mode detection ────────────────────────────────────────────────────

function subscribeToClassList(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getIsDark() {
  return document.documentElement.classList.contains('dark');
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowEditor({ initialData, onSave, onBack, saving }: FlowEditorProps) {
  const isDark = useSyncExternalStore(subscribeToClassList, getIsDark);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reactFlowInstance, setReactFlowInstance] = useState<Record<string, any> | null>(null);

  // Flow metadata
  const [nome, setNome] = useState(initialData?.nome ?? '');
  const [status, setStatus] = useState<'rascunho' | 'ativo' | 'pausado'>(
    (initialData?.status as 'rascunho' | 'ativo' | 'pausado') ?? 'rascunho'
  );
  const [triggerType, setTriggerType] = useState(initialData?.trigger_type ?? 'novo');

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges ?? []);

  // Selected node for config panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  // ─── Connections ─────────────────────────────────────────────────────────

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // ─── Node selection ──────────────────────────────────────────────────────

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // ─── Drag & Drop from palette ────────────────────────────────────────────

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = `${type}-${Date.now()}`;
      const defaultLabels: Record<string, string> = {
        trigger: 'Novo Gatilho',
        condition: 'Nova Condição',
        action: 'Nova Ação',
        delay: 'Aguardar',
      };

      const newNode: Node = {
        id,
        type,
        position,
        data: {
          label: defaultLabels[type] ?? type,
          ...(type === 'trigger' ? { triggerType: 'novo', active: true } : {}),
          ...(type === 'action' ? { actionType: 'enviar_whatsapp' } : {}),
          ...(type === 'delay' ? { delay: '1h' } : {}),
          ...(type === 'condition' ? { campo: 'status', operador: 'igual', valor: '' } : {}),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [reactFlowInstance, setNodes]
  );

  // ─── Update selected node data ───────────────────────────────────────────

  const updateNodeData = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: { ...n.data, [key]: value } }
            : n
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const vp = reactFlowInstance ? reactFlowInstance.getViewport() : { x: 0, y: 0, zoom: 1 };
    await onSave({
      id: initialData?.id,
      nome: nome || 'Fluxo sem nome',
      status,
      trigger_type: triggerType,
      trigger_config: {},
      viewport: vp,
      nodes,
      edges,
    });
  }, [initialData?.id, nome, status, triggerType, nodes, edges, reactFlowInstance, onSave]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      {/* Top bar */}
      <FlowToolbar
        nome={nome}
        onNomeChange={setNome}
        triggerType={triggerType}
        onTriggerTypeChange={setTriggerType}
        status={status}
        onStatusChange={setStatus}
        onBack={onBack}
        onSave={() => { void handleSave(); }}
        saving={saving}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <FlowPalette />

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            colorMode={isDark ? 'dark' : 'light'}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(var(--muted-foreground) / 0.15)"
            />
            <Controls
              className="!bg-background/80 !border-border/10 !rounded-[12px] !backdrop-blur-xl [&>button]:!bg-muted/30 [&>button]:!border-border/10 [&>button]:!rounded-[8px]"
            />
            <MiniMap
              className="!bg-background/80 !border-border/10 !rounded-[12px]"
              nodeColor="hsl(var(--primary) / 0.6)"
              maskColor="hsl(var(--background) / 0.8)"
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 text-center">
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-[16px] bg-muted/30 border border-border/10 backdrop-blur-xl">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Arraste componentes do painel esquerdo para o canvas
                    </span>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right config panel */}
        {selectedNode && (
          <FlowConfigPanel
            selectedNode={selectedNode}
            onUpdateData={updateNodeData}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

export default FlowEditor;
