import { useMemo } from 'react';
import type { Lead } from '@/hooks/useLeads';
import { PIPELINE_STAGES, STAGE_COLORS } from './pipelineConfig';
import { PRIORIDADES } from '@/types/crm-operacional';

export type GroupBy = 'status' | 'departamento' | 'responsavel' | 'origem' | 'prioridade' | 'conexao';

export interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  leads: Lead[];
  count: number;
}

/** Build STATUS_CONFIG from unified pipelineConfig */
const STATUS_CONFIG = PIPELINE_STAGES.map((stage) => ({
  id: stage.id,
  label: stage.title,
  color: STAGE_COLORS[stage.color]?.hex ?? '#6b7280',
}));

/** Build PRIORIDADE_CONFIG from canonical PRIORIDADES (high→low for Kanban columns) */
const PRIORIDADE_CONFIG = [...PRIORIDADES].reverse().map((p) => ({
  id: p.value,
  label: p.label,
  color: p.cor,
}));

const DYNAMIC_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#9333ea', '#0d9488',
  '#d97706', '#4f46e5', '#059669', '#e11d48',
];

export interface DepartamentoLike {
  id: string;
  nome: string;
  cor?: string;
}

export interface ProfileLike {
  id: string;
  nome_completo?: string | null;
}

export interface ConexaoLike {
  id: string;
  nome: string;
}

export function useKanbanGrouping(
  leads: Lead[],
  groupBy: GroupBy,
  departamentos?: DepartamentoLike[],
  profiles?: ProfileLike[],
  conexoes?: ConexaoLike[],
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
            color: dept.cor ?? DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
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
            label: `Departamento (${id.slice(0, 6)})`,
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
          label: 'Sem responsável',
          color: '#6b7280',
          leads: leads.filter((l) => !l.responsavel_id),
          count: 0,
        };
        nullCol.count = nullCol.leads.length;

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.nome_completo ?? 'Sem nome']));
        const responsavelIds = [...new Set(leads.map((l) => l.responsavel_id).filter((id): id is string => !!id))];

        const respCols: KanbanColumn[] = responsavelIds.map((id, i) => {
          const matched = leads.filter((l) => l.responsavel_id === id);
          return {
            id,
            label: profileMap.get(id) ?? `Membro (${id.slice(0, 6)})`,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        return [nullCol, ...respCols];
      }

      case 'origem': {
        const nullLeads = leads.filter((l) => !l.origem);
        const origens = [...new Set(leads.map((l) => l.origem).filter((o): o is string => !!o))];

        const cols: KanbanColumn[] = origens.map((origem, i) => {
          const matched = leads.filter((l) => l.origem === origem);
          return {
            id: origem,
            label: origem,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        if (nullLeads.length > 0 || cols.length === 0) {
          cols.unshift({
            id: '__sem_origem__',
            label: 'Sem origem',
            color: '#6b7280',
            leads: nullLeads,
            count: nullLeads.length,
          });
        }

        return cols;
      }

      case 'prioridade': {
        return PRIORIDADE_CONFIG.map((cfg) => {
          const matched = leads.filter((l) => l.prioridade === cfg.id);
          return { id: cfg.id, label: cfg.label, color: cfg.color, leads: matched, count: matched.length };
        });
      }

      case 'conexao': {
        const nullCol: KanbanColumn = {
          id: '__sem_conexao__',
          label: 'Sem conexão',
          color: '#6b7280',
          leads: leads.filter((l) => !l.conexao_id),
          count: 0,
        };
        nullCol.count = nullCol.leads.length;

        const conexaoMap = new Map((conexoes ?? []).map((c) => [c.id, c.nome]));
        const conexaoIds = [...new Set(leads.map((l) => l.conexao_id).filter((id): id is string => !!id))];

        const conexaoCols: KanbanColumn[] = conexaoIds.map((id, i) => {
          const matched = leads.filter((l) => l.conexao_id === id);
          return {
            id,
            label: conexaoMap.get(id) ?? `Conexão (${id.slice(0, 6)})`,
            color: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length]!,
            leads: matched,
            count: matched.length,
          };
        });

        return [nullCol, ...conexaoCols];
      }

      default:
        return [];
    }
  }, [leads, groupBy, departamentos, profiles, conexoes]);

  return { columns };
}
