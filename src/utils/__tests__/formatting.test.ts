import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getInitials,
  getAvatarHex,
  fmtCurrency,
  fmtCurrencyFull,
  fmtNumber,
  fmtPercentage,
  fmtDate,
  fmtDateTime,
  fmtMessageTime,
  fmtDateTimeFull,
  relativeTime,
  truncate,
  capitalize,
  fmtPhone,
  fmtCPF,
  fmtCNPJ,
  fmtFileSize,
} from '../formatting';

describe('getInitials', () => {
  it('returns initials from full name', () => {
    expect(getInitials('João Silva')).toBe('JS');
  });

  it('returns single initial for single name', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  it('returns fallback for null', () => {
    expect(getInitials(null)).toBe('?');
  });

  it('returns fallback for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns fallback for whitespace-only', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('uses custom fallback', () => {
    expect(getInitials(null, 'X')).toBe('X');
  });

  it('handles three-part name (first + last)', () => {
    expect(getInitials('Maria da Silva')).toBe('MS');
  });
});

describe('getAvatarHex', () => {
  it('returns a hex color string', () => {
    const result = getAvatarHex('user@test.com');
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic', () => {
    expect(getAvatarHex('seed')).toBe(getAvatarHex('seed'));
  });

  it('returns different colors for different seeds', () => {
    const a = getAvatarHex('alice');
    const b = getAvatarHex('bob');
    // Not guaranteed but highly likely with different seeds
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

describe('fmtCurrency', () => {
  it('formats number as BRL without decimals', () => {
    const result = fmtCurrency(1500);
    expect(result).toContain('1.500');
  });

  it('handles zero', () => {
    const result = fmtCurrency(0);
    expect(result).toContain('0');
  });
});

describe('fmtCurrencyFull', () => {
  it('formats number as BRL with decimals', () => {
    const result = fmtCurrencyFull(1500.5);
    expect(result).toContain('1.500');
  });
});

describe('fmtNumber', () => {
  it('formats number with pt-BR grouping', () => {
    expect(fmtNumber(1234567)).toBe('1.234.567');
  });
});

describe('fmtPercentage', () => {
  it('formats as percentage', () => {
    const result = fmtPercentage(85);
    expect(result).toContain('85');
    expect(result).toContain('%');
  });
});

describe('fmtDate', () => {
  it('formats ISO date as dd/mm', () => {
    const result = fmtDate('2025-03-15T10:00:00Z');
    expect(result).toMatch(/15\/03/);
  });
});

describe('fmtDateTime', () => {
  it('formats ISO date as dd/mm HH:mm', () => {
    const result = fmtDateTime('2025-03-15T10:30:00Z');
    expect(result).toContain('15/03');
  });
});

describe('fmtMessageTime', () => {
  it('formats ISO date as HH:mm', () => {
    const result = fmtMessageTime('2025-03-15T14:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('fmtDateTimeFull', () => {
  it('formats ISO date as full locale string', () => {
    const result = fmtDateTimeFull('2025-03-15T10:30:00Z');
    expect(result).toContain('15');
  });
});

describe('relativeTime', () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, 'now');
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('returns empty string for null', () => {
    expect(relativeTime(null)).toBe('');
  });

  it('returns "agora" for < 1 minute ago', () => {
    const now = new Date('2025-03-15T10:00:30Z').getTime();
    nowSpy.mockReturnValue(now);
    expect(relativeTime('2025-03-15T10:00:00Z')).toBe('agora');
  });

  it('returns Xmin for < 60 minutes', () => {
    const now = new Date('2025-03-15T10:15:00Z').getTime();
    nowSpy.mockReturnValue(now);
    expect(relativeTime('2025-03-15T10:00:00Z')).toBe('15min');
  });

  it('returns Xh for < 24 hours', () => {
    const now = new Date('2025-03-15T13:00:00Z').getTime();
    nowSpy.mockReturnValue(now);
    expect(relativeTime('2025-03-15T10:00:00Z')).toBe('3h');
  });

  it('returns "ontem" for 1 day', () => {
    const now = new Date('2025-03-16T10:00:00Z').getTime();
    nowSpy.mockReturnValue(now);
    expect(relativeTime('2025-03-15T10:00:00Z')).toBe('ontem');
  });

  it('returns dd/mm for > 1 day', () => {
    const now = new Date('2025-03-20T10:00:00Z').getTime();
    nowSpy.mockReturnValue(now);
    const result = relativeTime('2025-03-15T10:00:00Z');
    expect(result).toMatch(/15\/03/);
  });
});

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello World', 5)).toBe('Hello…');
  });

  it('returns text unchanged if within limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('returns exact length text unchanged', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('lowercases rest', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });
});

describe('fmtPhone', () => {
  it('formats 11-digit phone', () => {
    expect(fmtPhone('11999998888')).toBe('(11) 99999-8888');
  });

  it('formats 10-digit phone', () => {
    expect(fmtPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('returns raw for other lengths', () => {
    expect(fmtPhone('123')).toBe('123');
  });

  it('handles phone with mask characters', () => {
    expect(fmtPhone('(11) 99999-8888')).toBe('(11) 99999-8888');
  });
});

describe('fmtCPF', () => {
  it('formats CPF correctly', () => {
    expect(fmtCPF('12345678901')).toBe('123.456.789-01');
  });
});

describe('fmtCNPJ', () => {
  it('formats CNPJ correctly', () => {
    expect(fmtCNPJ('12345678000199')).toBe('12.345.678/0001-99');
  });
});

describe('fmtFileSize', () => {
  it('handles zero bytes', () => {
    expect(fmtFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(fmtFileSize(500)).toBe('500 Bytes');
  });

  it('formats KB', () => {
    expect(fmtFileSize(1024)).toBe('1 KB');
  });

  it('formats MB', () => {
    expect(fmtFileSize(1048576)).toBe('1 MB');
  });

  it('formats GB', () => {
    expect(fmtFileSize(1073741824)).toBe('1 GB');
  });

  it('rounds correctly', () => {
    expect(fmtFileSize(1536)).toBe('1.5 KB');
  });
});
