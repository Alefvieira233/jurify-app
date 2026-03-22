import { useState, useCallback, useRef, useMemo, type DragEvent } from 'react';
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
import {
  ArrowLeft, Save, Zap, GitBranch, Play, Clock, Loader2, X,
  ChevronDown, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { DelayNode } from './nodes/DelayNode';

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

const TRIGGER_TYPES = [
  { value: 'novo_lead', label: 'Novo Lead' },
  { value: 'status_alterado', label: 'Status Alterado' },
  { value: 'departamento_alterado', label: 'Departamento Alterado' },
  { value: 'lead_quente', label: 'Lead Quente' },
  { value: 'agendamento_criado', label: 'Agendamento Criado' },
  { value: 'contrato_assinado', label: 'Contrato Assinado' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
  { value: 'timer', label: 'Timer' },
];

const ACTION_TYPES = [
  { value: 'enviar_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'enviar_email', label: 'Enviar E-mail' },
  { value: 'atribuir_responsavel', label: 'Atribuir Responsável' },
  { value: 'alterar_status', label: 'Alterar Status' },
  { value: 'alterar_prioridade', label: 'Alterar Prioridade' },
  { value: 'adicionar_tag', label: 'Adicionar Tag' },
  { value: 'mover_departamento', label: 'Mover Departamento' },
  { value: 'criar_agendamento', label: 'Criar Agendamento' },
  { value: 'executar_agente', label: 'Executar Agente IA' },
  { value: 'chamar_webhook', label: 'Chamar Webhook' },
  { value: 'notificar_equipe', label: 'Notificar Equipe' },
];

const CONDITION_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'area_juridica', label: 'Área Jurídica' },
  { value: 'departamento_id', label: 'Departamento' },
  { value: 'valor_causa', label: 'Valor da Causa' },
  { value: 'origem', label: 'Origem' },
];

const CONDITION_OPERATORS = [
  { value: 'igual', label: 'Igual a' },
  { value: 'diferente', label: 'Diferente de' },
  { value: 'contem', label: 'Contém' },
  { value: 'nao_contem', label: 'Não contém' },
  { value: 'maior_que', label: 'Maior que' },
  { value: 'menor_que', label: 'Menor que' },
  { value: 'vazio', label: 'Vazio' },
  { value: 'nao_vazio', label: 'Não vazio' },
  { value: 'mudou_para', label: 'Mudou para' },
  { value: 'mudou_de', label: 'Mudou de' },
];

const DELAY_OPTIONS = [
  { value: '5min', label: '5 minutos' },
  { value: '15min', label: '15 minutos' },
  { value: '30min', label: '30 minutos' },
  { value: '1h', label: '1 hora' },
  { value: '2h', label: '2 horas' },
  { value: '6h', label: '6 horas' },
  { value: '12h', label: '12 horas' },
  { value: '24h', label: '24 horas' },
  { value: '48h', label: '48 horas' },
  { value: '72h', label: '72 horas' },
];

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', color: 'text-slate-400' },
  { value: 'ativo', label: 'Ativo', color: 'text-emerald-400' },
  { value: 'pausado', label: 'Pausado', color: 'text-amber-400' },
];

const PALETTE_ITEMS = [
  { type: 'trigger', label: 'Gatilho', icon: Zap, color: 'text-emerald-400 bg-emerald-500/15' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'text-amber-400 bg-amber-500/15' },
  { type: 'action', label: 'Ação', icon: Play, color: 'text-primary bg-primary/15' },
  { type: 'delay', label: 'Espera', icon: Clock, color: 'text-purple-400 bg-purple-500/15' },
];

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowEditor({ initialData, onSave, onBack, saving }: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reactFlowInstance, setReactFlowInstance] = useState<Record<string, any> | null>(null);

  // Flow metadata
  const [nome, setNome] = useState(initialData?.nome ?? '');
  const [status, setStatus] = useState<'rascunho' | 'ativo' | 'pausado'>(
    (initialData?.status as 'rascunho' | 'ativo' | 'pausado') ?? 'rascunho'
  );
  const [triggerType, setTriggerType] = useState(initialData?.trigger_type ?? 'novo_lead');

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
          ...(type === 'trigger' ? { triggerType: 'novo_lead', active: true } : {}),
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

  const onDragStart = useCallback((event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10 bg-background/95 backdrop-blur-xl shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-[10px] shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do fluxo..."
          className="max-w-[280px] rounded-[10px] bg-muted/30 border-border/10 text-sm"
        />

        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger className="w-[180px] rounded-[10px] bg-muted/30 border-border/10 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
            {TRIGGER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[130px] rounded-[10px] bg-muted/30 border-border/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  <span className={s.color}>{s.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => { void handleSave(); }}
            disabled={saving || !nome.trim()}
            className="rounded-[10px] gap-2 shadow-lg shadow-primary/20"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-[200px] shrink-0 border-r border-border/10 bg-background/80 backdrop-blur-xl p-4 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
            Componentes
          </span>
          {PALETTE_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-border/10
                         bg-muted/30 cursor-grab active:cursor-grabbing hover:bg-muted/50
                         transition-colors select-none"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-[6px] ${item.color}`}>
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium text-foreground">{item.label}</span>
              <GripVertical className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
          ))}
        </div>

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
            colorMode="dark"
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
          <div className="w-[280px] shrink-0 border-l border-border/10 bg-background/80 backdrop-blur-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Configuração
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-[6px]"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Label */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Nome
                </Label>
                <Input
                  value={(selectedNode.data.label as string) ?? ''}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                  className="rounded-[10px] bg-muted/30 border-border/10 text-sm"
                />
              </div>

              {/* Trigger config */}
              {selectedNode.type === 'trigger' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tipo de Gatilho
                  </Label>
                  <Select
                    value={(selectedNode.data.triggerType as string) ?? 'novo_lead'}
                    onValueChange={(v) => updateNodeData('triggerType', v)}
                  >
                    <SelectTrigger className="rounded-[10px] bg-muted/30 border-border/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
                      {TRIGGER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Action config */}
              {selectedNode.type === 'action' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tipo de Ação
                  </Label>
                  <Select
                    value={(selectedNode.data.actionType as string) ?? 'enviar_whatsapp'}
                    onValueChange={(v) => updateNodeData('actionType', v)}
                  >
                    <SelectTrigger className="rounded-[10px] bg-muted/30 border-border/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value} className="text-xs">
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Condition config */}
              {selectedNode.type === 'condition' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Campo
                    </Label>
                    <Select
                      value={(selectedNode.data.campo as string) ?? 'status'}
                      onValueChange={(v) => updateNodeData('campo', v)}
                    >
                      <SelectTrigger className="rounded-[10px] bg-muted/30 border-border/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
                        {CONDITION_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Operador
                    </Label>
                    <Select
                      value={(selectedNode.data.operador as string) ?? 'igual'}
                      onValueChange={(v) => updateNodeData('operador', v)}
                    >
                      <SelectTrigger className="rounded-[10px] bg-muted/30 border-border/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
                        {CONDITION_OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Valor
                    </Label>
                    <Input
                      value={(selectedNode.data.valor as string) ?? ''}
                      onChange={(e) => updateNodeData('valor', e.target.value)}
                      placeholder="Valor para comparação"
                      className="rounded-[10px] bg-muted/30 border-border/10 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Delay config */}
              {selectedNode.type === 'delay' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tempo de Espera
                  </Label>
                  <Select
                    value={(selectedNode.data.delay as string) ?? '1h'}
                    onValueChange={(v) => updateNodeData('delay', v)}
                  >
                    <SelectTrigger className="rounded-[10px] bg-muted/30 border-border/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px] bg-background/95 backdrop-blur-xl border-border/10">
                      {DELAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delete node */}
              <div className="pt-3 border-t border-border/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteSelectedNode}
                  className="w-full rounded-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                >
                  Remover nó
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowEditor;
