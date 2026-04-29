import { renderHook, act } from '@testing-library/react';
import { useAgentesIAFilters, type AgenteIA } from './useAgentesIAFilters';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useAgentesIAFilters', () => {
  const mockAgentes: AgenteIA[] = [
    {
      id: '1',
      nome: 'Agente 1',
      status: 'ativo',
      tipo_agente: 'legal',
      area_juridica: 'Cível',
      tenant_id: 't1',
      created_at: '',
      updated_at: '',
      descricao_funcao: 'Função 1'
    } as AgenteIA,
    {
      id: '2',
      nome: 'Agente 2',
      status: 'inativo',
      tipo_agente: 'commercial',
      area_juridica: 'Trabalhista',
      tenant_id: 't1',
      created_at: '',
      updated_at: '',
      descricao_funcao: 'Função 2'
    } as AgenteIA,
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with default filters and return all agents', () => {
    const { result } = renderHook(() => useAgentesIAFilters(mockAgentes));
    expect(result.current.filteredAgentes).toHaveLength(2);
    expect(result.current.agentesAtivos).toBe(1);
  });

  it('should filter agents by search term after debounce', () => {
    const { result } = renderHook(() => useAgentesIAFilters(mockAgentes));

    act(() => {
      result.current.updateFilter('searchTerm', 'Agente 1');
    });

    // Before timer
    expect(result.current.filteredAgentes).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredAgentes).toHaveLength(1);
    expect(result.current.filteredAgentes[0].nome).toBe('Agente 1');
  });

  it('should filter agents by status', () => {
    const { result } = renderHook(() => useAgentesIAFilters(mockAgentes));

    act(() => {
      result.current.updateFilter('statusFilter', 'inativo');
    });

    // Wait for memo to recompute if needed, though statusFilter is not debounced
    expect(result.current.filteredAgentes).toHaveLength(1);
    expect(result.current.filteredAgentes[0].status).toBe('inativo');
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useAgentesIAFilters(mockAgentes));

    act(() => {
      result.current.updateFilter('statusFilter', 'inativo');
    });

    expect(result.current.filteredAgentes).toHaveLength(1);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.statusFilter).toBe('todos');
    expect(result.current.filteredAgentes).toHaveLength(2);
  });
});
