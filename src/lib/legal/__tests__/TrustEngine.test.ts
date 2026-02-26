import { describe, it, expect } from 'vitest';
import {
  validateCitations,
  getRAGSystemConstraints,
  TRUST_ENGINE_FALLBACK,
} from '../TrustEngine';

describe('TrustEngine', () => {
  // ─── validateCitations ────────────────────────────────────────
  describe('validateCitations', () => {
    it('passes when all citations are from the valid set', () => {
      const response = `
        Análise baseada em:
        - ID: STJ_SUM_479
        - ID: STJ_SUM_297
        
        Jurisprudência Mapeada:
        - STJ_SUM_479: Responsabilidade objetiva dos bancos
        - STJ_SUM_297: CDC aplicável a instituições financeiras
      `;
      const validIds = new Set(['STJ_SUM_479', 'STJ_SUM_297', 'STJ_SUM_385']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(true);
      expect(result.invalidCitations).toHaveLength(0);
    });

    it('detects citations outside the valid set', () => {
      const response = `
        Conforme STJ_SUM_479 e STJ_SUM_999 (inventada)
        E também RESP_1061134 que não estava no contexto
      `;
      const validIds = new Set(['STJ_SUM_479']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(false);
      expect(result.invalidCitations).toContain('STJ_SUM_999');
      expect(result.invalidCitations).toContain('RESP_1061134');
    });

    it('handles empty valid set gracefully', () => {
      const result = validateCitations('qualquer texto', new Set());
      expect(result.isValid).toBe(true);
      expect(result.invalidCitations).toHaveLength(0);
    });

    it('handles response with no citations', () => {
      const response = 'Este caso é viável com base no direito trabalhista.';
      const validIds = new Set(['STJ_SUM_479']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(true);
    });

    it('is case-insensitive for source IDs', () => {
      const response = 'Conforme stj_sum_479 e STJ_SUM_297';
      const validIds = new Set(['STJ_SUM_479', 'STJ_SUM_297']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(true);
    });

    it('detects TST, STF, LEI, TEMA patterns', () => {
      const response = `
        TST_SUM_338 indica ônus do empregador.
        STF_SUM_VINC_25 proíbe prisão civil.
        LEI_8078_ART42 sobre repetição de indébito.
        TEMA_1102_STF sobre revisão da vida toda.
      `;
      const validIds = new Set(['TST_SUM_338', 'STF_SUM_VINC_25']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(false);
      expect(result.invalidCitations).toContain('LEI_8078_ART42');
      expect(result.invalidCitations).toContain('TEMA_1102_STF');
    });
  });

  // ─── getRAGSystemConstraints ──────────────────────────────────
  describe('getRAGSystemConstraints', () => {
    it('returns strict no-context constraint when hasContext is false', () => {
      const constraints = getRAGSystemConstraints(false);
      expect(constraints).toContain('NÃO INVENTE');
      expect(constraints).toContain(TRUST_ENGINE_FALLBACK);
    });

    it('returns RAG enforcement constraints when hasContext is true', () => {
      const constraints = getRAGSystemConstraints(true);
      expect(constraints).toContain('EXCLUSIVAMENTE');
      expect(constraints).toContain('Jurisprudência Mapeada');
      expect(constraints).toContain('NÃO INVENTE');
      expect(constraints).not.toContain(TRUST_ENGINE_FALLBACK);
    });
  });

  // ─── TRUST_ENGINE_FALLBACK ────────────────────────────────────
  describe('TRUST_ENGINE_FALLBACK', () => {
    it('is a non-empty string with safe message', () => {
      expect(TRUST_ENGINE_FALLBACK).toBeTruthy();
      expect(TRUST_ENGINE_FALLBACK).toContain('Não há dados oficiais');
    });
  });
});
