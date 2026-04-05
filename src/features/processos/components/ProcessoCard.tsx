import { memo } from 'react';
import { Eye, Edit, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Processo } from '@/hooks/useProcessos';
import { PROCESSO_STATUS_LABELS } from '@/schemas/processoSchema';
import { getStatusClasses } from '@/constants/statusConfig';

const TIPO_LABELS: Record<string, string> = {
  civel: 'Civel',
  criminal: 'Criminal',
  trabalhista: 'Trabalhista',
  previdenciario: 'Previdenciario',
  familia: 'Familia',
  empresarial: 'Empresarial',
  tributario: 'Tributario',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

export { TIPO_LABELS };

export interface ProcessoCardProps {
  processo: Processo;
  canUpdate: boolean;
  canDelete: boolean;
  onView: (processo: Processo) => void;
  onEdit: (processo: Processo) => void;
  onEncerrar: (processo: Processo) => void;
  onDelete: (processo: Processo) => void;
}

const ProcessoCard = memo(({ processo, canUpdate, canDelete, onView, onEdit, onEncerrar, onDelete }: ProcessoCardProps) => (
  <Card className="hover:border-primary/50 transition-colors">
    <CardContent className="p-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">
              {processo.numero_processo || 'Sem numero'}
            </h3>
            <Badge className={getStatusClasses('processos', processo.status)}>
              {PROCESSO_STATUS_LABELS[processo.status] ?? processo.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {TIPO_LABELS[processo.tipo_acao] ?? processo.tipo_acao}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {[processo.tribunal, processo.vara, processo.comarca]
              .filter(Boolean).join(' \u2022 ') || 'Sem localiza\u00e7\u00e3o'}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Fase: <span className="font-medium capitalize">{processo.fase_processual.replace(/_/g, ' ')}</span></span>
            <span>Posi\u00e7\u00e3o: <span className="font-medium capitalize">{processo.posicao}</span></span>
            {processo.valor_causa && (
              <span>Valor: <span className="font-medium">
                {processo.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span></span>
            )}
          </div>
          {processo.observacoes && (
            <p className="text-sm text-muted-foreground mt-2 truncate max-w-xl">
              {processo.observacoes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            title="Ver detalhes"
            onClick={() => onView(processo)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canUpdate && (
            <Button
              size="sm"
              variant="ghost"
              title="Editar"
              onClick={() => onEdit(processo)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canUpdate && (processo.status === 'ativo' || processo.status === 'suspenso') && (
            <Button
              size="sm"
              variant="ghost"
              title="Encerrar"
              className="text-amber-600 hover:text-amber-700"
              onClick={() => onEncerrar(processo)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              title="Excluir"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(processo)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
));
ProcessoCard.displayName = 'ProcessoCard';

export default ProcessoCard;
