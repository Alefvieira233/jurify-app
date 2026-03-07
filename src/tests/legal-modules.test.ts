/**
 * Comprehensive tests for the 4 legal modules:
 * Processos, Prazos Processuais, Honorários, Documentos Jurídicos
 *
 * Covers: Zod schema validation, exported constants, overdue logic,
 * query key factories, type exports.
 */
import { describe, it, expect } from 'vitest';

// ─── Schema imports ─────────────────────────────────────────────────────────

import {
  processoFormSchema,
  TIPOS_ACAO,
  FASES_PROCESSUAIS,
  POSICOES,
  STATUS_PROCESSO,
  TIPOS_HONORARIO_PROCESSO,
} from '../schemas/processoSchema';
import type { ProcessoFormData } from '../schemas/processoSchema';

import {
  prazoFormSchema,
  TIPOS_PRAZO,
  STATUS_PRAZO,
} from '../schemas/prazoSchema';
import type { PrazoFormData } from '../schemas/prazoSchema';

import {
  honorarioFormSchema,
  TIPOS_HONORARIO,
  STATUS_HONORARIO,
} from '../schemas/honorarioSchema';
import type { HonorarioFormData } from '../schemas/honorarioSchema';

import {
  documentoFormSchema,
  TIPOS_DOCUMENTO,
} from '../schemas/documentoSchema';
import type { DocumentoFormData } from '../schemas/documentoSchema';

// ─── Hook type / key imports ────────────────────────────────────────────────

import { processosQueryKey } from '../hooks/useProcessos';
import type { Processo, ProcessoInput } from '../hooks/useProcessos';

import { prazosQueryKey } from '../hooks/usePrazosProcessuais';
import type { PrazoProcessual, PrazoInput } from '../hooks/usePrazosProcessuais';

import { honorariosQueryKey } from '../hooks/useHonorarios';
import type { Honorario, HonorarioInput, HonorarioWithOverdue } from '../hooks/useHonorarios';

import { documentosQueryKey } from '../hooks/useDocumentosJuridicos';
import type { DocumentoJuridico, DocumentoInput, DocumentoWithSignedUrl } from '../hooks/useDocumentosJuridicos';

// ═══════════════════════════════════════════════════════════════════════════
// Section 1: Schema validation tests
// ═══════════════════════════════════════════════════════════════════════════

describe('processoFormSchema', () => {
  const validProcesso = {
    tipo_acao: 'civel' as const,
    fase_processual: 'conhecimento' as const,
    posicao: 'autor' as const,
    status: 'ativo' as const,
  };

  it('accepts minimal valid processo (only tipo_acao required)', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'civel' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid processo', () => {
    const result = processoFormSchema.safeParse({
      ...validProcesso,
      numero_processo: '1234567-89.2024.8.26.0100',
      tribunal: 'TJSP',
      vara: '1ª Vara Cível',
      comarca: 'São Paulo',
      valor_causa: 50000,
      valor_honorario_acordado: 15000,
      tipo_honorario: 'fixo',
      observacoes: 'Caso importante',
      partes_contrarias: ['Empresa X', 'João Silva'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing tipo_acao', () => {
    const result = processoFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid tipo_acao', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'invalido' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = processoFormSchema.safeParse({ ...validProcesso, status: 'nao_existe' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid numero_processo format', () => {
    const result = processoFormSchema.safeParse({ ...validProcesso, numero_processo: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('CNJ');
    }
  });

  it('accepts valid CNJ number', () => {
    const result = processoFormSchema.safeParse({
      ...validProcesso,
      numero_processo: '0001234-56.2024.8.26.0100',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for numero_processo (transforms to null)', () => {
    const result = processoFormSchema.safeParse({ ...validProcesso, numero_processo: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.numero_processo).toBeNull();
    }
  });

  it('rejects negative valor_causa', () => {
    const result = processoFormSchema.safeParse({ ...validProcesso, valor_causa: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero valor_causa', () => {
    const result = processoFormSchema.safeParse({ ...validProcesso, valor_causa: 0 });
    expect(result.success).toBe(false);
  });

  it('applies default fase_processual = conhecimento', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'trabalhista' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fase_processual).toBe('conhecimento');
    }
  });

  it('applies default posicao = autor', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'criminal' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.posicao).toBe('autor');
    }
  });

  it('applies default status = ativo', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'familia' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ativo');
    }
  });

  it('rejects observacoes exceeding 2000 chars', () => {
    const result = processoFormSchema.safeParse({
      ...validProcesso,
      observacoes: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid status values', () => {
    for (const status of STATUS_PROCESSO) {
      const result = processoFormSchema.safeParse({ ...validProcesso, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid tipo_acao values', () => {
    for (const tipo of TIPOS_ACAO) {
      const result = processoFormSchema.safeParse({ tipo_acao: tipo });
      expect(result.success, `tipo_acao "${tipo}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid fase_processual values', () => {
    for (const fase of FASES_PROCESSUAIS) {
      const result = processoFormSchema.safeParse({ ...validProcesso, fase_processual: fase });
      expect(result.success, `fase "${fase}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid posicao values', () => {
    for (const pos of POSICOES) {
      const result = processoFormSchema.safeParse({ ...validProcesso, posicao: pos });
      expect(result.success, `posicao "${pos}" should be valid`).toBe(true);
    }
  });
});

describe('prazoFormSchema', () => {
  const validPrazo = {
    processo_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo: 'audiencia' as const,
    descricao: 'Audiência de instrução',
    data_prazo: '2026-04-15',
    status: 'pendente' as const,
  };

  it('accepts valid prazo', () => {
    const result = prazoFormSchema.safeParse(validPrazo);
    expect(result.success).toBe(true);
  });

  it('rejects missing processo_id', () => {
    const { processo_id, ...noProcId } = validPrazo;
    const result = prazoFormSchema.safeParse(noProcId);
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid processo_id', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, processo_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing descricao', () => {
    const { descricao, ...noDesc } = validPrazo;
    const result = prazoFormSchema.safeParse(noDesc);
    expect(result.success).toBe(false);
  });

  it('rejects descricao shorter than 3 chars', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, descricao: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects descricao exceeding 500 chars', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, descricao: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects empty data_prazo', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, data_prazo: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tipo', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, tipo: 'inexistente' });
    expect(result.success).toBe(false);
  });

  it('applies default status = pendente', () => {
    const { status, ...noStatus } = validPrazo;
    const result = prazoFormSchema.safeParse(noStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pendente');
    }
  });

  it('applies default alertas_dias = [7, 3, 1]', () => {
    const result = prazoFormSchema.safeParse(validPrazo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertas_dias).toEqual([7, 3, 1]);
    }
  });

  it('accepts custom alertas_dias', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, alertas_dias: [14, 7, 3, 1] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertas_dias).toEqual([14, 7, 3, 1]);
    }
  });

  it('rejects non-positive alertas_dias values', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, alertas_dias: [0, -1] });
    expect(result.success).toBe(false);
  });

  it('accepts all valid tipo values', () => {
    for (const tipo of TIPOS_PRAZO) {
      const result = prazoFormSchema.safeParse({ ...validPrazo, tipo });
      expect(result.success, `tipo "${tipo}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid status values', () => {
    for (const status of STATUS_PRAZO) {
      const result = prazoFormSchema.safeParse({ ...validPrazo, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects observacoes exceeding 1000 chars', () => {
    const result = prazoFormSchema.safeParse({ ...validPrazo, observacoes: 'x'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});

describe('honorarioFormSchema', () => {
  const validHonorario = {
    tipo: 'fixo' as const,
    valor_total_acordado: 5000,
    status: 'vigente' as const,
  };

  it('accepts valid honorario', () => {
    const result = honorarioFormSchema.safeParse(validHonorario);
    expect(result.success).toBe(true);
  });

  it('accepts minimal honorario (defaults only)', () => {
    const result = honorarioFormSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe('fixo');
      expect(result.data.status).toBe('vigente');
    }
  });

  it('accepts full honorario with all fields', () => {
    const result = honorarioFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      lead_id: '550e8400-e29b-41d4-a716-446655440001',
      tipo: 'contingencia',
      valor_fixo: 1000,
      valor_hora: 200,
      taxa_contingencia: 30,
      horas_estimadas: 50,
      valor_total_acordado: 10000,
      valor_adiantamento: 2000,
      valor_recebido: 5000,
      data_vencimento: '2026-06-01',
      status: 'vigente',
      observacoes: 'Honorário contratual',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tipo', () => {
    const result = honorarioFormSchema.safeParse({ tipo: 'invalido' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, status: 'nao_existe' });
    expect(result.success).toBe(false);
  });

  it('rejects negative valor_fixo', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, valor_fixo: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects taxa_contingencia above 100', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, taxa_contingencia: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts taxa_contingencia = 0', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, taxa_contingencia: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts taxa_contingencia = 100', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, taxa_contingencia: 100 });
    expect(result.success).toBe(true);
  });

  it('rejects negative valor_adiantamento', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, valor_adiantamento: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts valor_adiantamento = 0', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, valor_adiantamento: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects observacoes exceeding 2000 chars', () => {
    const result = honorarioFormSchema.safeParse({ ...validHonorario, observacoes: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts all valid tipo values', () => {
    for (const tipo of TIPOS_HONORARIO) {
      const result = honorarioFormSchema.safeParse({ tipo });
      expect(result.success, `tipo "${tipo}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid status values', () => {
    for (const status of STATUS_HONORARIO) {
      const result = honorarioFormSchema.safeParse({ ...validHonorario, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });
});

describe('documentoFormSchema', () => {
  const validDocumento = {
    tipo_documento: 'peticao' as const,
  };

  it('accepts valid documento', () => {
    const result = documentoFormSchema.safeParse(validDocumento);
    expect(result.success).toBe(true);
  });

  it('rejects missing tipo_documento', () => {
    const result = documentoFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid tipo_documento', () => {
    const result = documentoFormSchema.safeParse({ tipo_documento: 'invalido' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid tipo_documento values', () => {
    for (const tipo of TIPOS_DOCUMENTO) {
      const result = documentoFormSchema.safeParse({ tipo_documento: tipo });
      expect(result.success, `tipo "${tipo}" should be valid`).toBe(true);
    }
  });

  it('accepts full documento with optional fields', () => {
    const result = documentoFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      lead_id: '550e8400-e29b-41d4-a716-446655440001',
      tipo_documento: 'contrato',
      descricao: 'Contrato de honorários',
      tags: ['urgente', 'confidencial'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts null tags', () => {
    const result = documentoFormSchema.safeParse({ ...validDocumento, tags: null });
    expect(result.success).toBe(true);
  });

  it('accepts empty tags array', () => {
    const result = documentoFormSchema.safeParse({ ...validDocumento, tags: [] });
    expect(result.success).toBe(true);
  });

  it('rejects descricao exceeding 500 chars', () => {
    const result = documentoFormSchema.safeParse({ ...validDocumento, descricao: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 2: Constants validation
// ═══════════════════════════════════════════════════════════════════════════

describe('Legal module constants', () => {
  it('TIPOS_ACAO has expected values', () => {
    expect(TIPOS_ACAO).toContain('civel');
    expect(TIPOS_ACAO).toContain('criminal');
    expect(TIPOS_ACAO).toContain('trabalhista');
    expect(TIPOS_ACAO).toContain('familia');
    expect(TIPOS_ACAO.length).toBe(9);
  });

  it('FASES_PROCESSUAIS has expected values', () => {
    expect(FASES_PROCESSUAIS).toContain('conhecimento');
    expect(FASES_PROCESSUAIS).toContain('recurso');
    expect(FASES_PROCESSUAIS).toContain('encerrado');
    expect(FASES_PROCESSUAIS.length).toBe(5);
  });

  it('POSICOES has expected values', () => {
    expect(POSICOES).toContain('autor');
    expect(POSICOES).toContain('reu');
    expect(POSICOES.length).toBe(4);
  });

  it('STATUS_PROCESSO has expected values', () => {
    expect(STATUS_PROCESSO).toContain('ativo');
    expect(STATUS_PROCESSO).toContain('arquivado');
    expect(STATUS_PROCESSO.length).toBe(6);
  });

  it('TIPOS_PRAZO has expected values', () => {
    expect(TIPOS_PRAZO).toContain('audiencia');
    expect(TIPOS_PRAZO).toContain('prazo_fatal');
    expect(TIPOS_PRAZO.length).toBe(8);
  });

  it('STATUS_PRAZO has expected values', () => {
    expect(STATUS_PRAZO).toContain('pendente');
    expect(STATUS_PRAZO).toContain('cumprido');
    expect(STATUS_PRAZO).toContain('perdido');
    expect(STATUS_PRAZO.length).toBe(4);
  });

  it('TIPOS_HONORARIO has expected values', () => {
    expect(TIPOS_HONORARIO).toContain('fixo');
    expect(TIPOS_HONORARIO).toContain('retainer');
    expect(TIPOS_HONORARIO.length).toBe(5);
  });

  it('STATUS_HONORARIO has expected values', () => {
    expect(STATUS_HONORARIO).toContain('vigente');
    expect(STATUS_HONORARIO).toContain('inadimplente');
    expect(STATUS_HONORARIO.length).toBe(5);
  });

  it('TIPOS_DOCUMENTO has expected values', () => {
    expect(TIPOS_DOCUMENTO).toContain('peticao');
    expect(TIPOS_DOCUMENTO).toContain('certidao');
    expect(TIPOS_DOCUMENTO.length).toBe(10);
  });

  it('TIPOS_HONORARIO_PROCESSO has expected values', () => {
    expect(TIPOS_HONORARIO_PROCESSO).toContain('fixo');
    expect(TIPOS_HONORARIO_PROCESSO).toContain('contingencia');
    expect(TIPOS_HONORARIO_PROCESSO.length).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 3: Query key factories
// ═══════════════════════════════════════════════════════════════════════════

describe('Query key factories', () => {
  describe('processosQueryKey', () => {
    it('returns correct key with tenant only', () => {
      const key = processosQueryKey('tenant-1');
      expect(key).toEqual(['processos', 'tenant-1', 1, '', '', '']);
    });

    it('returns correct key with all parameters', () => {
      const key = processosQueryKey('tenant-1', 3, 'ativo', 'civel', 'teste');
      expect(key).toEqual(['processos', 'tenant-1', 3, 'ativo', 'civel', 'teste']);
    });

    it('handles undefined tenant', () => {
      const key = processosQueryKey(undefined);
      expect(key[0]).toBe('processos');
      expect(key[1]).toBeUndefined();
    });
  });

  describe('prazosQueryKey', () => {
    it('returns correct key with tenant only', () => {
      const key = prazosQueryKey('tenant-1');
      expect(key).toEqual(['prazos_processuais', 'tenant-1', 1]);
    });

    it('returns correct key with page', () => {
      const key = prazosQueryKey('tenant-1', 5);
      expect(key).toEqual(['prazos_processuais', 'tenant-1', 5]);
    });
  });

  describe('honorariosQueryKey', () => {
    it('returns correct key', () => {
      const key = honorariosQueryKey('tenant-1');
      expect(key).toEqual(['honorarios', 'tenant-1']);
    });

    it('handles undefined tenant', () => {
      const key = honorariosQueryKey(undefined);
      expect(key).toEqual(['honorarios', undefined]);
    });
  });

  describe('documentosQueryKey', () => {
    it('returns correct key', () => {
      const key = documentosQueryKey('tenant-1');
      expect(key).toEqual(['documentos_juridicos', 'tenant-1']);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 4: Overdue computation logic (inline verification)
// ═══════════════════════════════════════════════════════════════════════════

describe('Honorario overdue logic', () => {
  // Mirrors the logic from useHonorarios queryFn:
  // overdue = h.data_vencimento != null && h.data_vencimento < today && h.status === 'vigente'
  function computeOverdue(dataVencimento: string | null, status: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return dataVencimento != null && dataVencimento < today && status === 'vigente';
  }

  it('marks vigente honorario past due date as overdue', () => {
    expect(computeOverdue('2020-01-01', 'vigente')).toBe(true);
  });

  it('does not mark pago honorario as overdue even if past due', () => {
    expect(computeOverdue('2020-01-01', 'pago')).toBe(false);
  });

  it('does not mark inadimplente honorario as overdue', () => {
    expect(computeOverdue('2020-01-01', 'inadimplente')).toBe(false);
  });

  it('does not mark vigente honorario with future date as overdue', () => {
    expect(computeOverdue('2099-12-31', 'vigente')).toBe(false);
  });

  it('does not mark honorario with null date as overdue', () => {
    expect(computeOverdue(null, 'vigente')).toBe(false);
  });

  it('does not mark cancelado honorario as overdue', () => {
    expect(computeOverdue('2020-01-01', 'cancelado')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 5: Prazos urgentes logic (inline verification)
// ═══════════════════════════════════════════════════════════════════════════

describe('Prazos urgentes logic', () => {
  // Mirrors usePrazosProcessuais.prazosUrgentes filter:
  // status === 'pendente' && dias <= 7 && dias >= 0
  function isPrazoUrgente(dataPrazo: string, status: string): boolean {
    if (status !== 'pendente') return false;
    const dias = Math.ceil((new Date(dataPrazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 7 && dias >= 0;
  }

  it('marks pendente prazo due in 3 days as urgente', () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isPrazoUrgente(inThreeDays, 'pendente')).toBe(true);
  });

  it('marks pendente prazo due today as urgente', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isPrazoUrgente(today, 'pendente')).toBe(true);
  });

  it('marks pendente prazo due in 7 days as urgente', () => {
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isPrazoUrgente(inSevenDays, 'pendente')).toBe(true);
  });

  it('does not mark pendente prazo due in 10 days as urgente', () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isPrazoUrgente(inTenDays, 'pendente')).toBe(false);
  });

  it('does not mark cumprido prazo as urgente', () => {
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isPrazoUrgente(tomorrow, 'cumprido')).toBe(false);
  });

  it('does not mark cancelado prazo as urgente', () => {
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isPrazoUrgente(tomorrow, 'cancelado')).toBe(false);
  });

  it('does not mark past-due pendente prazo as urgente (dias < 0)', () => {
    expect(isPrazoUrgente('2020-01-01', 'pendente')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 6: Type export smoke tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Type exports', () => {
  it('ProcessoFormData type aligns with schema output', () => {
    const result = processoFormSchema.safeParse({ tipo_acao: 'civel' });
    expect(result.success).toBe(true);
    if (result.success) {
      const data: ProcessoFormData = result.data;
      expect(data.tipo_acao).toBe('civel');
    }
  });

  it('PrazoFormData type aligns with schema output', () => {
    const result = prazoFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'audiencia',
      descricao: 'Audiência de instrução',
      data_prazo: '2026-04-15',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const data: PrazoFormData = result.data;
      expect(data.tipo).toBe('audiencia');
    }
  });

  it('HonorarioFormData type aligns with schema output', () => {
    const result = honorarioFormSchema.safeParse({ tipo: 'hora', valor_hora: 200 });
    expect(result.success).toBe(true);
    if (result.success) {
      const data: HonorarioFormData = result.data;
      expect(data.tipo).toBe('hora');
    }
  });

  it('DocumentoFormData type aligns with schema output', () => {
    const result = documentoFormSchema.safeParse({ tipo_documento: 'sentenca' });
    expect(result.success).toBe(true);
    if (result.success) {
      const data: DocumentoFormData = result.data;
      expect(data.tipo_documento).toBe('sentenca');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 7: Cross-module consistency
// ═══════════════════════════════════════════════════════════════════════════

describe('Cross-module consistency', () => {
  it('processo and honorario share the same tipo_honorario values (subset)', () => {
    // TIPOS_HONORARIO_PROCESSO should be a subset of TIPOS_HONORARIO
    for (const tipo of TIPOS_HONORARIO_PROCESSO) {
      expect(
        (TIPOS_HONORARIO as readonly string[]).includes(tipo),
        `"${tipo}" from processo should exist in honorario tipos`,
      ).toBe(true);
    }
  });

  it('prazo schema accepts processo_id linking to processos', () => {
    const result = prazoFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'recurso',
      descricao: 'Prazo recursal',
      data_prazo: '2026-05-01',
    });
    expect(result.success).toBe(true);
  });

  it('documento schema accepts processo_id linking to processos', () => {
    const result = documentoFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo_documento: 'recurso',
    });
    expect(result.success).toBe(true);
  });

  it('honorario schema accepts processo_id linking to processos', () => {
    const result = honorarioFormSchema.safeParse({
      processo_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'fixo',
    });
    expect(result.success).toBe(true);
  });
});
