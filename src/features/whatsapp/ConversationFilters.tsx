import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ConversationFilterState {
  tab: 'todos' | 'ia' | 'ativos' | 'pendentes';
  status: '' | 'ativo' | 'aguardando' | 'qualificado' | 'finalizado';
}

interface ConversationFiltersProps {
  value: ConversationFilterState;
  onChange: (next: ConversationFilterState) => void;
  stats: { total: number; active: number; pending: number; qualified: number };
}

export const ConversationFilters = ({ value, onChange, stats }: ConversationFiltersProps) => {
  return (
    <>
      {/* Tab bar */}
      <div className="px-4 pt-1 pb-2">
        <Tabs
          value={value.tab}
          onValueChange={(v) =>
            onChange({ ...value, tab: v as ConversationFilterState['tab'] })
          }
        >
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="todos" className="text-xs">
              Todos{stats.total > 0 ? ` (${stats.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs">
              IA
            </TabsTrigger>
            <TabsTrigger value="ativos" className="text-xs">
              Ativos{stats.active > 0 ? ` (${stats.active})` : ''}
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs">
              Pendentes{stats.pending > 0 ? ` (${stats.pending})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status filter bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Select
          value={value.status === '' ? '__all__' : value.status}
          onValueChange={(v) =>
            onChange({
              ...value,
              status: v === '__all__' ? '' : (v as ConversationFilterState['status']),
            })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              Todos os status
            </SelectItem>
            <SelectItem value="ativo" className="text-xs">
              Ativo
            </SelectItem>
            <SelectItem value="aguardando" className="text-xs">
              Aguardando
            </SelectItem>
            <SelectItem value="qualificado" className="text-xs">
              Agendado
            </SelectItem>
            <SelectItem value="finalizado" className="text-xs">
              Finalizado
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

ConversationFilters.displayName = 'ConversationFilters';
