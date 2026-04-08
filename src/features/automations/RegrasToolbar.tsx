import { memo } from 'react';
import { Search, Filter, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EVENT_TYPE_LABELS } from './types';

interface RegrasToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterEvento: string;
  onFilterEventoChange: (value: string) => void;
}

export const RegrasToolbar = memo(function RegrasToolbar({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterEvento,
  onFilterEventoChange,
}: RegrasToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar regras..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10"
        />
      </div>

      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-[160px] rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10">
          <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="inativo">Inativo</SelectItem>
          <SelectItem value="rascunho">Rascunho</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterEvento} onValueChange={onFilterEventoChange}>
        <SelectTrigger className="w-[200px] rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10">
          <Activity className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os eventos</SelectItem>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

export default RegrasToolbar;
