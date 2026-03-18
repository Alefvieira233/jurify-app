import { useMemo } from 'react';
import type { Lead } from '@/hooks/useLeads';

export type GroupBy = 'status' | 'departamento' | 'responsavel' | 'origem' | 'prioridade';

export interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  leads: Lead[];
  count: number;
}

const STATUS_CONFIG: { id: string; label: string; color: string }[] = [
  { id: 'novo',        label: 'Novo',        color: '#2563eb' },
  { id: 'em_contato',  label: 'Em Contato',  color: '#0891b2' },
  { id: 'qualificado', label: 'Qualificado', color: '#d97706' },
  { id: 'proposta',    label: 'Proposta',    color: '#4f46e5' },
  { id: 'negociacao',  label: 'Negociacao',  color: '#7c3aed' },
  { id: 'ganho',       label: 'Ganho',       color: '#059669' },
  { id: 'perdido',     label: 'Perdido',     color: '#e11d48' },
];

const PRIORIDADE_CONFIG: { id: string; label: string; color: string }[] = [
  { id: 'urgente', label: 'Urgente', color: '#dc2626' },
  { id: 'alta',    label: 'Alta',    color: '#ea580c' },
  { id: 'media',   label: 'Media',   color: '#d97706' },
  { id: 'baixa',   label: 'Baixa',   color: '#6b7280' },
];

const DYNAMIC_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#9333ea', '#0d9488',
  '#d97706', '#4f46e5', '#059669', '#e11d48',
];

interface DepartamentoLike {
  id: string;
  nome: string;
}

interface ProfileLike {
  id: string;
  nome_completo?: string | null;
}

export function useKanbanGrouping(
  leads: Lead[],
  groupBy: GroupBy,
  departamentos?: DepartamentoLike[],
  profiles?: ProfileLike[],
): { columns: KanbanColumn[] } {
  const columns = useMemo(() => {
    switch (groupBy) {
      case 'status': {
        return STATUS_CONFIG.map((cfg) => {
          const matched = leads.filter((l) => l.status === cfg.id);
          return { id: cfg.id, label: cfg.label, color: cfg.color, leads: matched, count: matched.length };
        });
      }

      case 'departamento': {
        const nullCol: KanbanColumn = {
          id: '__sem_departamento__',
          label: 'Sem departamento',
          color: '#6b7280',
          leads: leads.filter((l) => !l.departamento_id),
          count: 0,
        };
        nullCol.count = nullCol.leads.length;

        const deptCols: KanbanColumn[] = (departamentos ?? []).map((dept, i) => {
          const matched = leads.filter((l) => l.departamento_id === dept.id);
          return {
            id: dept.id,
            label: dept.nome,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        // Also pick up departments not in the list
        const knownIds = new Set([...deptCols.map((c) => c.id), '__sem_departamento__']);
        const extraIds = [...new Set(leads.map((l) => l.departamento_id).filter((id): id is string => !!id && !knownIds.has(id)))];
        const extraCols: KanbanColumn[] = extraIds.map((id, i) => {
          const matched = leads.filter((l) => l.departamento_id === id);
          return {
            id,
            label: id,
            color: DYNAMIC_COLORS[(deptCols.length + i) % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        return [nullCol, ...deptCols, ...extraCols];
      }

      case 'responsavel': {
        const nullCol: KanbanColumn = {
          id: '__sem_responsavel__',
          label: 'Sem responsavel',
          color: '#6b7280',
          leads: leads.filter((l) => !l.responsavel_id),
          count: 0,
        };
        nullCol.count = nullCol.leads.length;

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.nome_completo ?? p.id]));
        const responsavelIds = [...new Set(leads.map((l) => l.responsavel_id).filter((id): id is string => !!id))];

        const respCols: KanbanColumn[] = responsavelIds.map((id, i) => {
          const matched = leads.filter((l) => l.responsavel_id === id);
          return {
            id,
            label: profileMap.get(id) ?? id,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        return [nullCol, ...respCols];
      }

      case 'origem': {
        const origemSet = [...new Set(leads.map((l) => l.origem ?? '__sem_origem__'))];
        return origemSet.map((origem, i) => {
          const isNull = origem === '__sem_origem__';
          const matched = leads.filter((l) => isNull ? !l.origem : l.origem === origem);
          return {
            id: origem,
            label: isNull ? 'Sem origem' : origem,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });
      }

      case 'prioridade': {
        return PRIORIDADE_CONFIG.map((cfg) => {
          const matched = leads.filter((l) => l.prioridade === cfg.id);
          return { id: cfg.id, label: cfg.label, color: cfg.color, leads: matched, count: matched.length };
        });
      }

      default:
        return [];
    }
  }, [leads, groupBy, departamentos, profiles]);

  return { columns };
}
