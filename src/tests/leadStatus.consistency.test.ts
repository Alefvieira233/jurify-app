/**
 * A1.2 (auditoria 2026-05-25): garante consistência entre as 3 fontes de
 * LEAD_STATUS_LABELS / PIPELINE_STAGES.
 *
 * Antes da consolidação, havia 3 declarações independentes:
 *   - src/constants/leadStatus.ts (canônica, alinhada com trigger SQL)
 *   - src/schemas/leadSchema.ts (duplicada — agora re-exporta)
 *   - src/features/pipeline/pipelineConfig.ts (derivada de PIPELINE_STAGES)
 *
 * Este teste falha se um label divergir, prevenindo o drift que motivou o P1.
 */

import { describe, it, expect } from 'vitest';
import { LEAD_STATUS_LABELS as CANONICAL } from '@/constants/leadStatus';
import { LEAD_STATUS_LABELS as FROM_SCHEMA } from '@/schemas/leadSchema';
import {
  LEAD_STATUS_LABELS as FROM_PIPELINE,
  PIPELINE_STAGES,
} from '@/features/pipeline/pipelineConfig';

describe('LEAD_STATUS_LABELS — fonte única (A1.2)', () => {
  it('schema re-exporta exatamente a fonte canônica', () => {
    expect(FROM_SCHEMA).toBe(CANONICAL);
  });

  it('pipelineConfig produz labels equivalentes para cada stage', () => {
    for (const stage of PIPELINE_STAGES) {
      const id = stage.id as keyof typeof CANONICAL;
      expect(FROM_PIPELINE[id], `pipelineConfig label divergente para ${stage.id}`).toBe(
        CANONICAL[id],
      );
    }
  });

  it('PIPELINE_STAGES cobre todas as chaves canônicas', () => {
    const stageIds = new Set(PIPELINE_STAGES.map((s) => s.id));
    for (const key of Object.keys(CANONICAL)) {
      expect(stageIds.has(key as never), `PIPELINE_STAGES não tem ${key}`).toBe(true);
    }
  });
});
