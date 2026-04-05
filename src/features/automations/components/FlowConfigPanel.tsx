import { X } from 'lucide-react';
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
import type { Node } from '@xyflow/react';
import { TRIGGER_TYPES } from './FlowToolbar';

const ACTION_TYPES = [
  { value: 'enviar_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'enviar_email', label: 'Enviar E-mail' },
  { value: 'atribuir_responsavel', label: 'Atribuir Responsavel' },
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
  { value: 'area_juridica', label: 'Area Juridica' },
  { value: 'departamento_id', label: 'Departamento' },
  { value: 'valor_causa', label: 'Valor da Causa' },
  { value: 'origem', label: 'Origem' },
];

const CONDITION_OPERATORS = [
  { value: 'igual', label: 'Igual a' },
  { value: 'diferente', label: 'Diferente de' },
  { value: 'contem', label: 'Contem' },
  { value: 'nao_contem', label: 'Nao contem' },
  { value: 'maior_que', label: 'Maior que' },
  { value: 'menor_que', label: 'Menor que' },
  { value: 'vazio', label: 'Vazio' },
  { value: 'nao_vazio', label: 'Nao vazio' },
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

export interface FlowConfigPanelProps {
  selectedNode: Node;
  onUpdateData: (key: string, value: unknown) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function FlowConfigPanel({ selectedNode, onUpdateData, onDelete, onClose }: FlowConfigPanelProps) {
  return (
    <div className="w-[280px] shrink-0 border-l border-border/10 bg-background/80 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Configuracao
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-[6px]"
          onClick={onClose}
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
            onChange={(e) => onUpdateData('label', e.target.value)}
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
              value={(selectedNode.data.triggerType as string) ?? 'novo'}
              onValueChange={(v) => onUpdateData('triggerType', v)}
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
              Tipo de Acao
            </Label>
            <Select
              value={(selectedNode.data.actionType as string) ?? 'enviar_whatsapp'}
              onValueChange={(v) => onUpdateData('actionType', v)}
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
                onValueChange={(v) => onUpdateData('campo', v)}
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
                onValueChange={(v) => onUpdateData('operador', v)}
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
                onChange={(e) => onUpdateData('valor', e.target.value)}
                placeholder="Valor para comparacao"
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
              onValueChange={(v) => onUpdateData('delay', v)}
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
            onClick={onDelete}
            className="w-full rounded-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
          >
            Remover no
          </Button>
        </div>
      </div>
    </div>
  );
}
