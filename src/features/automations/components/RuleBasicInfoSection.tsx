import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EVENT_TYPE_LABELS } from '../types';

interface RuleBasicInfoSectionProps {
  nome: string;
  onNomeChange: (value: string) => void;
  descricao: string;
  onDescricaoChange: (value: string) => void;
  evento: string;
  onEventoChange: (value: string) => void;
  matchLogic: 'todos' | 'qualquer';
  onMatchLogicChange: (value: 'todos' | 'qualquer') => void;
}

const RuleBasicInfoSection = ({
  nome,
  onNomeChange,
  descricao,
  onDescricaoChange,
  evento,
  onEventoChange,
  matchLogic,
  onMatchLogicChange,
}: RuleBasicInfoSectionProps) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-3 py-1 rounded-full bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border border-border/10">
          Informações Básicas
        </span>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Regra</Label>
        <Input
          placeholder="Ex: Notificar equipe ao criar lead quente"
          value={nome}
          onChange={(e) => onNomeChange(e.target.value)}
          className="rounded-[10px] bg-background/80 border-border/10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</Label>
        <Textarea
          placeholder="Descreva o objetivo desta regra..."
          value={descricao}
          onChange={(e) => onDescricaoChange(e.target.value)}
          className="rounded-[10px] bg-background/80 border-border/10 min-h-[70px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Evento Gatilho</Label>
        <Select value={evento} onValueChange={onEventoChange}>
          <SelectTrigger className="rounded-[10px] bg-background/80 border-border/10">
            <SelectValue placeholder="Selecione o evento..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-[12px] bg-muted/30 border border-border/10 p-4">
        <div>
          <p className="text-sm font-medium">Lógica de correspondência</p>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
            {matchLogic === 'todos' ? 'Executar quando TODAS as condições forem atendidas' : 'Executar quando QUALQUER condição for atendida'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${matchLogic === 'todos' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            Todas
          </span>
          <Switch
            checked={matchLogic === 'qualquer'}
            onCheckedChange={(checked) => onMatchLogicChange(checked ? 'qualquer' : 'todos')}
          />
          <span className={`text-xs ${matchLogic === 'qualquer' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            Qualquer
          </span>
        </div>
      </div>
    </section>
  );
};

export default RuleBasicInfoSection;
