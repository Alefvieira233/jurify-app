/**
 * Edge function shared module — `_shared/schedule-parser.ts`
 *
 * Testa o parser PT-BR de data/hora usado pelo whatsapp-webhook para agendar
 * reuniões autônomas quando o lead solicita. Qualquer mudança em regex,
 * timezone ou heurística de confidence deve ser refletida aqui.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseScheduleFromText,
  detectScheduleIntent,
  formatScheduleForLead,
  validateBusinessHours,
  BUSINESS_HOUR_START,
  BUSINESS_HOUR_END,
} from '../../../../supabase/functions/_shared/schedule-parser.ts';

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Helper: hora UTC a partir de componentes BRT. */
function brtToUTC(year: number, month: number, day: number, hour: number, minute = 0) {
  const brt = new Date(year, month - 1, day, hour, minute, 0, 0);
  return new Date(brt.getTime() + BRT_OFFSET_MS);
}

describe('schedule-parser', () => {
  beforeEach(() => {
    // Congela "agora" em segunda-feira 10/03/2025 12h00 BRT (15h UTC)
    vi.useFakeTimers();
    vi.setSystemTime(brtToUTC(2025, 3, 10, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('detectScheduleIntent', () => {
    it('detecta pedidos explícitos de agendamento', () => {
      expect(detectScheduleIntent('quero marcar uma reunião')).toBe(true);
      expect(detectScheduleIntent('gostaria de agendar uma consulta')).toBe(true);
      expect(detectScheduleIntent('podemos marcar um horário?')).toBe(true);
      expect(detectScheduleIntent('preciso agendar atendimento')).toBe(true);
    });

    it('não confunde conversa geral com pedido de agendamento', () => {
      expect(detectScheduleIntent('obrigado pelas informações')).toBe(false);
      expect(detectScheduleIntent('qual o valor?')).toBe(false);
      expect(detectScheduleIntent('')).toBe(false);
    });
  });

  describe('parseScheduleFromText', () => {
    it('extrai "quinta às 14h" na mesma semana futura', () => {
      const parsed = parseScheduleFromText('quero marcar reunião na quinta às 14h');
      expect(parsed).not.toBeNull();
      expect(parsed!.confidence).toBeGreaterThanOrEqual(1);
      const brt = new Date(parsed!.dateTimeUTC.getTime() - BRT_OFFSET_MS);
      expect(brt.getDay()).toBe(4); // quinta
      expect(brt.getHours()).toBe(14);
      expect(brt.getMinutes()).toBe(0);
    });

    it('extrai "amanhã às 10h"', () => {
      const parsed = parseScheduleFromText('pode ser amanhã às 10h?');
      expect(parsed).not.toBeNull();
      const brt = new Date(parsed!.dateTimeUTC.getTime() - BRT_OFFSET_MS);
      expect(brt.getDate()).toBe(11); // dia seguinte a 10/03
      expect(brt.getHours()).toBe(10);
    });

    it('extrai "15/03 às 9h30" com minutos', () => {
      const parsed = parseScheduleFromText('marca dia 15/03 às 9h30');
      expect(parsed).not.toBeNull();
      const brt = new Date(parsed!.dateTimeUTC.getTime() - BRT_OFFSET_MS);
      expect(brt.getDate()).toBe(15);
      expect(brt.getHours()).toBe(9);
      expect(brt.getMinutes()).toBe(30);
    });

    it('interpreta "2 da tarde" como 14h', () => {
      const parsed = parseScheduleFromText('amanhã 2 da tarde');
      expect(parsed).not.toBeNull();
      const brt = new Date(parsed!.dateTimeUTC.getTime() - BRT_OFFSET_MS);
      expect(brt.getHours()).toBe(14);
    });

    it('rejeita data no passado', () => {
      const parsed = parseScheduleFromText('ontem às 10h');
      expect(parsed).toBeNull();
    });

    it('rejeita mensagem sem nenhuma âncora de data/hora', () => {
      expect(parseScheduleFromText('oi tudo bem')).toBeNull();
      expect(parseScheduleFromText('')).toBeNull();
    });

    it('confidence 0.5 quando só tem hora (usa dia atual)', () => {
      // 16h é futuro em relação a 12h travado
      const parsed = parseScheduleFromText('pode ser às 16h?');
      expect(parsed).not.toBeNull();
      expect(parsed!.confidence).toBe(0.5);
    });
  });

  describe('validateBusinessHours', () => {
    it('aceita seg-sex entre 8h e 20h', () => {
      const valid = validateBusinessHours(brtToUTC(2025, 3, 11, 14, 0)); // terça 14h
      expect(valid.valid).toBe(true);
    });

    it('rejeita sábado', () => {
      const result = validateBusinessHours(brtToUTC(2025, 3, 15, 10, 0)); // sábado
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('weekend');
      expect(result.message).toMatch(/segunda a sexta/i);
    });

    it('rejeita domingo', () => {
      const result = validateBusinessHours(brtToUTC(2025, 3, 16, 10, 0));
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('weekend');
    });

    it('rejeita antes das 8h', () => {
      const result = validateBusinessHours(brtToUTC(2025, 3, 11, 7, 0));
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('out_of_hours');
    });

    it('rejeita 20h em diante', () => {
      const result = validateBusinessHours(brtToUTC(2025, 3, 11, 20, 0));
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('out_of_hours');
    });

    it('rejeita data no passado', () => {
      const result = validateBusinessHours(brtToUTC(2025, 3, 10, 10, 0)); // antes do now travado
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('past');
    });

    it('constantes exportadas batem com lógica', () => {
      expect(BUSINESS_HOUR_START).toBe(8);
      expect(BUSINESS_HOUR_END).toBe(20);
    });
  });

  describe('formatScheduleForLead', () => {
    it('formata data com dia da semana em PT-BR', () => {
      const out = formatScheduleForLead(brtToUTC(2025, 3, 13, 14, 30)); // quinta
      expect(out).toBe('quinta-feira, 13/03 às 14h30');
    });

    it('formata domingo corretamente', () => {
      const out = formatScheduleForLead(brtToUTC(2025, 3, 16, 9, 0));
      expect(out).toBe('domingo, 16/03 às 09h00');
    });
  });
});
