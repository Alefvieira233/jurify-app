import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TRIGGER_TYPES = [
  { value: 'novo', label: 'Novo Lead' },
  { value: 'status_alterado', label: 'Status Alterado' },
  { value: 'departamento_alterado', label: 'Departamento Alterado' },
  { value: 'lead_quente', label: 'Lead Quente' },
  { value: 'agendamento_criado', label: 'Agendamento Criado' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
  { value: 'timer', label: 'Timer' },
];

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', color: 'text-slate-600 dark:text-slate-400' },
  { value: 'ativo', label: 'Ativo', color: 'text-emerald-400' },
  { value: 'pausado', label: 'Pausado', color: 'text-amber-400' },
];

// eslint-disable-next-line react-refresh/only-export-components
export { TRIGGER_TYPES };

export interface FlowToolbarProps {
  nome: string;
  onNomeChange: (value: string) => void;
  triggerType: string;
  onTriggerTypeChange: (value: string) => void;
  status: 'rascunho' | 'ativo' | 'pausado';
  onStatusChange: (value: 'rascunho' | 'ativo' | 'pausado') => void;
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
}

export default function FlowToolbar({
  nome, onNomeChange, triggerType, onTriggerTypeChange,
  status, onStatusChange, onBack, onSave, saving,
}: FlowToolbarProps) {
  return (
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
        onChange={(e) => onNomeChange(e.target.value)}
        placeholder="Nome do fluxo..."
        className="max-w-[280px] rounded-[10px] bg-muted/30 border-border/10 text-sm"
      />

      <Select value={triggerType} onValueChange={onTriggerTypeChange}>
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
        <Select value={status} onValueChange={(v) => onStatusChange(v as typeof status)}>
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
          onClick={onSave}
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
  );
}
