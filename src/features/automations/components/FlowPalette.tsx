import { useCallback, type DragEvent } from 'react';
import { Zap, GitBranch, Play, Clock, GripVertical } from 'lucide-react';

const PALETTE_ITEMS = [
  { type: 'trigger', label: 'Gatilho', icon: Zap, color: 'text-emerald-400 bg-emerald-500/15' },
  { type: 'condition', label: 'Condicao', icon: GitBranch, color: 'text-amber-400 bg-amber-500/15' },
  { type: 'action', label: 'Acao', icon: Play, color: 'text-primary bg-primary/15' },
  { type: 'delay', label: 'Espera', icon: Clock, color: 'text-purple-400 bg-purple-500/15' },
];

// eslint-disable-next-line react-refresh/only-export-components
export { PALETTE_ITEMS };

export default function FlowPalette() {
  const onDragStart = useCallback((event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
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
  );
}
