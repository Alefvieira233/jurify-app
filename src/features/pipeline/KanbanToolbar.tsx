import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroupBy } from './useKanbanGrouping';

interface KanbanToolbarProps {
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  search: string;
  onSearchChange: (s: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',       label: 'Por Status' },
  { value: 'departamento', label: 'Por Departamento' },
  { value: 'responsavel',  label: 'Por Responsável' },
  { value: 'origem',       label: 'Por Origem' },
  { value: 'prioridade',   label: 'Por Prioridade' },
  { value: 'conexao',      label: 'Por Conexão' },
];

export function KanbanToolbar({
  groupBy,
  onGroupByChange,
  search,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
}: KanbanToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-background">
      {/* Group by selector */}
      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Agrupar por..." />
        </SelectTrigger>
        <SelectContent>
          {GROUP_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Show archived toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-archived"
          checked={showArchived}
          onCheckedChange={onShowArchivedChange}
        />
        <Label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">
          Mostrar arquivados
        </Label>
      </div>
    </div>
  );
}

export default KanbanToolbar;
