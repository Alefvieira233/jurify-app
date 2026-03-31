// ── Filter types ──

export interface KanbanFilters {
  responsavelId: string; // '' = all, '__none__' = unassigned, uuid = specific
  status: string;        // '' = all, or pipeline status id
  origem: string;        // '' = all, or origem string
  prioridade: string;    // '' = all, or prioridade value
  conexaoId: string;     // '' = all, or conexao uuid
}

export const EMPTY_FILTERS: KanbanFilters = {
  responsavelId: '',
  status: '',
  origem: '',
  prioridade: '',
  conexaoId: '',
};

// ── Helpers ──

/** Count how many "extra" filters (inside Mais Filtros popover) are active */
export function countExtraFilters(f: KanbanFilters): number {
  let n = 0;
  if (f.origem) n++;
  if (f.prioridade) n++;
  if (f.conexaoId) n++;
  return n;
}

/** Are ANY filters active? */
export function hasActiveFilters(f: KanbanFilters): boolean {
  return !!(f.responsavelId || f.status || f.origem || f.prioridade || f.conexaoId);
}
