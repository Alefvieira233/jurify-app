import { Eye, Edit, Trash2, XCircle, MoreVertical } from 'lucide-react';
import { MobileCard } from '@/components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Processo } from '@/hooks/useProcessos';
import { PROCESSO_STATUS_LABELS } from '@/schemas/processoSchema';
import { getStatusClasses } from '@/constants/statusConfig';
import ProcessoCard, { TIPO_LABELS } from './ProcessoCard';

interface ProcessosListProps {
  processos: Processo[];
  isMobile: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onView: (processo: Processo) => void;
  onEdit: (processo: Processo) => void;
  onEncerrar: (processo: Processo) => void;
  onDelete: (processo: Processo) => void;
}

export const ProcessosList = ({
  processos,
  isMobile,
  canUpdate,
  canDelete,
  onView,
  onEdit,
  onEncerrar,
  onDelete,
}: ProcessosListProps) => {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {processos.map(processo => (
          <MobileCard
            key={processo.id}
            title={processo.numero_processo || 'Sem número'}
            subtitle={[processo.tribunal, processo.vara, processo.comarca].filter(Boolean).join(' \u2022 ') || 'Sem localização'}
            badge={
              <Badge className={getStatusClasses('processos', processo.status)}>
                {PROCESSO_STATUS_LABELS[processo.status] ?? processo.status}
              </Badge>
            }
            details={[
              { label: 'Tipo', value: TIPO_LABELS[processo.tipo_acao] ?? processo.tipo_acao },
              { label: 'Fase', value: <span className="capitalize">{processo.fase_processual.replace(/_/g, ' ')}</span> },
              ...(processo.valor_causa ? [{ label: 'Valor', value: processo.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }] : []),
            ]}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(processo)}>
                    <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                  </DropdownMenuItem>
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => onEdit(processo)}>
                      <Edit className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (processo.status === 'ativo' || processo.status === 'suspenso') && (
                    <DropdownMenuItem onClick={() => onEncerrar(processo)} className="text-amber-600">
                      <XCircle className="w-4 h-4 mr-2" /> Encerrar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={() => onDelete(processo)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            }
            onClick={() => onView(processo)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {processos.map(processo => (
        <ProcessoCard
          key={processo.id}
          processo={processo}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onView={onView}
          onEdit={onEdit}
          onEncerrar={onEncerrar}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
