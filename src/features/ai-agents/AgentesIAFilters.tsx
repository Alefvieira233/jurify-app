import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FilterState } from './hooks/useAgentesIAFilters';

interface AgentesIAFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  totalAgentes: number;
  totalFiltrados: number;
  agentesAtivos: number;
}

const areas = [
  'Direito Trabalhista',
  'Direito de Família', 
  'Direito Civil',
  'Direito Previdenciário',
  'Direito Criminal',
  'Direito Empresarial'
];

const tiposAgente = [
  { value: 'chat_interno', label: 'Chat Interno' },
  { value: 'analise_dados', label: 'Análise de Dados' },
  { value: 'api_externa', label: 'API Externa' }
];

export const AgentesIAFilters: React.FC<AgentesIAFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  totalAgentes,
  totalFiltrados,
  agentesAtivos
}) => {
  // Local state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(filters.searchTerm);
  const debouncedSearch = useDebounce(localSearch, 500);

  // Sync local state when external filters change (e.g. clear filters)
  useEffect(() => {
    if (filters.searchTerm !== debouncedSearch) {
       setLocalSearch(filters.searchTerm);
    }
  }, [filters.searchTerm]);

  // Trigger filter change when debounced value updates
  useEffect(() => {
    if (debouncedSearch !== filters.searchTerm) {
      onFilterChange('searchTerm', debouncedSearch);
    }
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          {/* Search Input */}
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
              Buscar Agentes
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                type="text"
                placeholder="Nome, área jurídica ou descrição..."
                value={localSearch}
                onChange={handleSearchChange}
                className="pl-10 bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
              Status
            </label>
            <Select
              value={filters.statusFilter}
              onValueChange={(value) => onFilterChange('statusFilter', value)}
            >
              <SelectTrigger className="bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo Filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
              Tipo
            </label>
            <Select
              value={filters.tipoFilter}
              onValueChange={(value) => onFilterChange('tipoFilter', value)}
            >
              <SelectTrigger className="bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposAgente.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area Filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
              Área Jurídica
            </label>
            <Select
              value={filters.areaFilter}
              onValueChange={(value) => onFilterChange('areaFilter', value)}
            >
              <SelectTrigger className="bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex flex-col">
            <div className="h-6"></div> {/* Spacer for alignment */}
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
          <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <span>
              <strong>{totalFiltrados}</strong> de <strong>{totalAgentes}</strong> agentes
            </span>
            <span className="text-emerald-200">
              <strong>{agentesAtivos}</strong> ativos
            </span>
            {(filters.searchTerm || 
              filters.statusFilter !== 'todos' || 
              filters.tipoFilter !== 'todos' || 
              filters.areaFilter !== 'todas') && (
              <span className="text-[hsl(var(--accent))]">
                <Filter className="inline h-3 w-3 mr-1" />
                Filtros aplicados
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

