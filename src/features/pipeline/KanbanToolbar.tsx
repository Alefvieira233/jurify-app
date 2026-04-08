import { useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { GroupBy, ProfileLike, ConexaoLike } from './useKanbanGrouping';
import { PIPELINE_STAGES } from './pipelineConfig';
import { PRIORIDADES } from '@/types/crm-operacional';
import type { KanbanFilters } from './kanbanFilters';
import { EMPTY_FILTERS, countExtraFilters, hasActiveFilters } from './kanbanFilters';

// ── Constants ──

const ALL = '__all__';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',       label: 'Por Status' },
  { value: 'departamento', label: 'Por Departamento' },
  { value: 'responsavel',  label: 'Por Responsável' },
  { value: 'origem',       label: 'Por Origem' },
  { value: 'prioridade',   label: 'Por Prioridade' },
  { value: 'conexao',      label: 'Por Conexão' },
];

// ── Props ──

interface KanbanToolbarProps {
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  search: string;
  onSearchChange: (s: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  filters: KanbanFilters;
  onFiltersChange: (f: KanbanFilters) => void;
  members: ProfileLike[];
  origens: string[];
  conexoes: ConexaoLike[];
}

// ── Helpers ──

/** Convert select value back to filter value (ALL → '') */
const fromSelect = (v: string): string => (v === ALL ? '' : v);

/** Convert filter value to select value ('' → ALL) */
const toSelect = (v: string): string => (v === '' ? ALL : v);

// ── Component ──

export function KanbanToolbar({
  groupBy,
  onGroupByChange,
  search,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
  filters,
  onFiltersChange,
  members,
  origens,
  conexoes,
}: KanbanToolbarProps) {
  const extraCount = useMemo(() => countExtraFilters(filters), [filters]);
  const anyActive = useMemo(() => hasActiveFilters(filters), [filters]);

  const patch = (partial: Partial<KanbanFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-background">
      {/* 1. Search */}
      <div className="relative min-w-[180px] max-w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar por nome ou telefone..." placeholder="Buscar por nome ou telefone..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* 2. Responsavel Select */}
      <Select
        value={toSelect(filters.responsavelId)}
        onValueChange={(v) => patch({ responsavelId: fromSelect(v) })}
        disabled={groupBy === 'responsavel'}
      >
        <SelectTrigger className="w-[170px] h-8 text-xs">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} className="text-xs">Todos</SelectItem>
          <SelectItem value="__none__" className="text-xs">Sem responsável</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id} className="text-xs">
              {m.nome_completo ?? 'Sem nome'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 3. Status Select */}
      <Select
        value={toSelect(filters.status)}
        onValueChange={(v) => patch({ status: fromSelect(v) })}
        disabled={groupBy === 'status'}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} className="text-xs">Todos</SelectItem>
          {PIPELINE_STAGES.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-xs">
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 4. Mais Filtros Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
            {extraCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px] leading-none">
                {extraCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] space-y-3" align="start">
          {/* Origem */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Origem</Label>
            <Select
              value={toSelect(filters.origem)}
              onValueChange={(v) => patch({ origem: fromSelect(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="text-xs">Todas</SelectItem>
                {origens.map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Prioridade</Label>
            <Select
              value={toSelect(filters.prioridade)}
              onValueChange={(v) => patch({ prioridade: fromSelect(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="text-xs">Todas</SelectItem>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conexao */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Conexão</Label>
            <Select
              value={toSelect(filters.conexaoId)}
              onValueChange={(v) => patch({ conexaoId: fromSelect(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="text-xs">Todas</SelectItem>
                {conexoes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {/* 5. Limpar button */}
      {anyActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1 text-muted-foreground"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}

      {/* 6. Spacer */}
      <div className="flex-1" />

      {/* 7. GroupBy Select */}
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

      {/* 8. Show archived toggle */}
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
