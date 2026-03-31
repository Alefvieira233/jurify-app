import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal } from 'lucide-react';
import type { ConversationFilterState } from './conversationFilterTypes';

interface ConversationFiltersProps {
  value: ConversationFilterState;
  onChange: (next: ConversationFilterState) => void;
  stats: { total: number; active: number; pending: number; qualified: number };
  members: { id: string; nome_completo: string | null }[];
  areasJuridicas: string[];
}

const ConversationFilters = ({ value, onChange, stats, members, areasJuridicas }: ConversationFiltersProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Count active "more filters"
  const moreFiltersCount = [value.areaJuridica].filter(Boolean).length;

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

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {/* Responsavel Select */}
        <Select
          value={value.responsavelId === '' ? '__all__' : value.responsavelId}
          onValueChange={(v) =>
            onChange({
              ...value,
              responsavelId: v === '__all__' ? '' : v,
            })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
            <SelectValue placeholder="Todos responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              Todos responsáveis
            </SelectItem>
            <SelectItem value="__none__" className="text-xs">
              Sem responsável
            </SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.nome_completo || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Select */}
        <Select
          value={value.status === '' ? '__all__' : value.status}
          onValueChange={(v) =>
            onChange({
              ...value,
              status: v === '__all__' ? '' : (v as ConversationFilterState['status']),
            })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
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

        {/* Mais Filtros Popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 text-xs gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {moreFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
                  {moreFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="end">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Área Jurídica</Label>
                <Select
                  value={value.areaJuridica === '' ? '__all__' : value.areaJuridica}
                  onValueChange={(v) =>
                    onChange({
                      ...value,
                      areaJuridica: v === '__all__' ? '' : v,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-xs">
                      Todas as áreas
                    </SelectItem>
                    {areasJuridicas.map((area) => (
                      <SelectItem key={area} value={area} className="text-xs">
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

ConversationFilters.displayName = 'ConversationFilters';

export default ConversationFilters;
