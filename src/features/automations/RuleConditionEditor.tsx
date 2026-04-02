import { Plus, Trash2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ConditionDraft } from './types';
import {
  FIELD_OPTIONS, OPERATOR_OPTIONS, NO_VALUE_OPERATORS,
  isEnumField, getEnumOptions,
} from './types';

interface RuleConditionEditorProps {
  conditions: ConditionDraft[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, field: keyof ConditionDraft, value: string) => void;
}

const RuleConditionEditor = ({
  conditions,
  onAdd,
  onRemove,
  onUpdate,
}: RuleConditionEditorProps) => {

  const renderConditionValue = (cond: ConditionDraft) => {
    if (NO_VALUE_OPERATORS.includes(cond.operador)) return null;

    if (isEnumField(cond.campo)) {
      const options = getEnumOptions(cond.campo);
      return (
        <Select
          value={cond.valor}
          onValueChange={(v) => onUpdate(cond._key, 'valor', v)}
        >
          <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
            <SelectValue placeholder="Valor..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        placeholder="Valor..."
        value={cond.valor}
        onChange={(e) => onUpdate(cond._key, 'valor', e.target.value)}
        className="flex-1 rounded-[10px] bg-background/80 border-border/10"
        type={['valor_causa'].includes(cond.campo) ? 'number' : 'text'}
      />
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[10px] uppercase font-bold text-blue-400 tracking-wider border border-blue-500/20">
          Condições
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="rounded-[10px] gap-1 text-xs hover:bg-muted/30"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Condição
        </Button>
      </div>

      {conditions.length === 0 && (
        <div className="text-center py-6 rounded-[16px] border border-dashed border-border/10 bg-muted/20">
          <GitBranch className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma condição definida</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">
            A regra será executada sempre que o evento ocorrer
          </p>
        </div>
      )}

      {conditions.map((cond, idx) => (
        <div
          key={cond._key}
          className="rounded-[16px] border border-border/10 bg-muted/20 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Condição {idx + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-[8px] hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemove(cond._key)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Field */}
            <Select
              value={cond.campo}
              onValueChange={(v) => onUpdate(cond._key, 'campo', v)}
            >
              <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Campo..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator */}
            <Select
              value={cond.operador}
              onValueChange={(v) => onUpdate(cond._key, 'operador', v)}
            >
              <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Operador..." />
              </SelectTrigger>
              <SelectContent>
                {OPERATOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value */}
            {renderConditionValue(cond)}
          </div>
        </div>
      ))}
    </section>
  );
};

export default RuleConditionEditor;
