import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AutomationRule } from './RegrasManager';
import { EVENT_TYPE_LABELS } from './RegrasManager';

// ── Constants ──

const EVENT_TYPE_COLORS: Record<string, string> = {
  lead_criado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  lead_atualizado: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  status_alterado: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  departamento_alterado: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  prioridade_alterada: 'bg-red-500/15 text-red-400 border-red-500/20',
  tag_adicionada: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  tag_removida: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
  lead_arquivado: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  lead_reativado: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  agendamento_criado: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  ganho: 'bg-green-500/15 text-green-400 border-green-500/20',
  temperatura_alterada: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  inatividade: 'bg-muted/50 text-muted-foreground border-border',
};

// ── Helpers ──

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
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

export function RuleCard({ rule, onEdit, onDelete, onToggleStatus, togglePending }: RuleCardProps) {
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
              {condCount} {condCount === 1 ? 'condição' : 'condições'} • Quando{' '}
              {rule.match_logic === 'todos' ? 'TODAS' : 'QUALQUER'}
            </span>
            <span className="text-border/30">|</span>
            <span>
              {actCount} {actCount === 1 ? 'ação' : 'ações'}
            </span>
            <span className="text-border/30">|</span>
            <span>
              {rule.execucoes_total} {rule.execucoes_total === 1 ? 'execução' : 'execuções'}
            </span>
            {rule.ultima_execucao && (
              <>
                <span className="text-border/30">|</span>
                <span>Última: {formatDate(rule.ultima_execucao)}</span>
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
}
