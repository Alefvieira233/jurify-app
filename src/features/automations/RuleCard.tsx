import { memo } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AutomationRule } from './types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from './types';

// ── Helpers ──

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

// ── Component ──

interface RuleCardProps {
  rule: AutomationRule;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (id: string, label: string) => void;
  onToggleStatus: (rule: AutomationRule) => void;
  togglePending: boolean;
}

export const RuleCard = memo(function RuleCard({ rule, onEdit, onDelete, onToggleStatus, togglePending }: RuleCardProps) {
  const condCount = rule.conditions?.length ?? 0;
  const actCount = rule.actions?.length ?? 0;
  const isActive = rule.status === 'ativo';

  return (
    <div className="group relative rounded-[20px] border border-border/10 bg-background/95 backdrop-blur-xl p-6 transition-all hover:border-border/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-4">
        {/* Status Toggle */}
        <div className="pt-1">
          <Switch
            checked={isActive}
            onCheckedChange={() => onToggleStatus(rule)}
            disabled={togglePending}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-base font-semibold truncate">{rule.nome}</h3>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold tracking-wider border ${
                EVENT_TYPE_COLORS[rule.evento] ?? 'bg-muted/30 text-muted-foreground border-border/10'
              }`}
            >
              {EVENT_TYPE_LABELS[rule.evento] ?? rule.evento}
            </Badge>
            {rule.status === 'rascunho' && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                Rascunho
              </Badge>
            )}
          </div>

          {rule.descricao && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {rule.descricao}
            </p>
          )}

          <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <span>
              {condCount} {condCount === 1 ? 'condi\u00e7\u00e3o' : 'condi\u00e7\u00f5es'} \u2022 Quando{' '}
              {rule.match_logic === 'todos' ? 'TODAS' : 'QUALQUER'}
            </span>
            <span className="text-border/30">|</span>
            <span>
              {actCount} {actCount === 1 ? 'a\u00e7\u00e3o' : 'a\u00e7\u00f5es'}
            </span>
            <span className="text-border/30">|</span>
            <span>
              {rule.execucoes_total} {rule.execucoes_total === 1 ? 'execu\u00e7\u00e3o' : 'execu\u00e7\u00f5es'}
            </span>
            {rule.ultima_execucao && (
              <>
                <span className="text-border/30">|</span>
                <span>\u00daltima: {formatDate(rule.ultima_execucao)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-[10px] hover:bg-muted/30"
            onClick={() => onEdit(rule)}
            aria-label="Editar regra"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-[10px] hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(rule.id, rule.nome)}
            aria-label="Excluir regra"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active indicator glow */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-[20px] bg-primary shadow-lg shadow-primary/40" />
      )}
    </div>
  );
});

export default RuleCard;
