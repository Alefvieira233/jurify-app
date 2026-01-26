import React, { useState, useMemo } from 'react';
import type { AgenteIA } from '@/hooks/useAgentesIA';

export type { AgenteIA };

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
  tipoFilter: string;
  areaFilter: string;
}

export const useAgentesIAFilters = (agentes: AgenteIA[] | null) => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: 'todos',
    tipoFilter: 'todos',
    areaFilter: 'todas'
  });

  // Debounced search term para melhor performance
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  const filteredAgentes = useMemo(() => {
    if (!agentes) return [];
    
    return agentes.filter(agente => {
      const matchesSearch = agente.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           agente.area_juridica?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           agente.descricao_funcao?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const status = agente.status ?? 'inativo';
      const matchesStatus = filters.statusFilter === 'todos' || status === filters.statusFilter;
      const matchesTipo = filters.tipoFilter === 'todos' || agente.tipo_agente === filters.tipoFilter;
      const matchesArea = filters.areaFilter === 'todas' || agente.area_juridica === filters.areaFilter;
      
      return matchesSearch && matchesStatus && matchesTipo && matchesArea;
    });
  }, [agentes, debouncedSearchTerm, filters.statusFilter, filters.tipoFilter, filters.areaFilter]);

  const agentesAtivos = useMemo(() => {
    return agentes?.filter(a => a.status === 'ativo').length || 0;
  }, [agentes]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: 'todos',
      tipoFilter: 'todos',
      areaFilter: 'todas'
    });
  };

  return {
    filters,
    filteredAgentes,
    agentesAtivos,
    updateFilter,
    clearFilters,
    totalAgentes: agentes?.length || 0,
    totalFiltrados: filteredAgentes.length
  };
};
