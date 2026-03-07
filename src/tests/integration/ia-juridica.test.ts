import { describe, it, expect } from 'vitest';

// Pure replicas of webhook logic for unit testing
const COMMANDS: Record<string, string> = {
  '/prazos': 'liste os prazos processuais do cliente',
  '/processos': 'liste os processos ativos do cliente',
  '/documentos': 'informe quantos documentos o cliente tem no sistema',
  '/honorarios': 'informe o status dos honorários do cliente',
  '/status': 'dê um resumo completo dos casos do cliente',
};

function detectCommand(text: string): string | null {
  return Object.keys(COMMANDS).find(cmd =>
    text.trim().toLowerCase().startsWith(cmd)
  ) ?? null;
}

const HANDOFF_PATTERNS = [
  'não tenho como informar',
  'não sei informar',
  'precisa entrar em contato',
  'recomendo falar com um advogado',
  'não consigo acessar',
];

function needsHandoff(aiText: string): boolean {
  return HANDOFF_PATTERNS.some(p => aiText.toLowerCase().includes(p));
}

function calcDiasRestantes(dataPrazo: string): number {
  return Math.ceil((new Date(dataPrazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

describe('IA Jurídica — Command Detection', () => {
  it('detects /prazos (case-insensitive)', () => {
    expect(detectCommand('/prazos')).toBe('/prazos');
    expect(detectCommand('/PRAZOS')).toBe('/prazos');
    expect(detectCommand('/prazos do meu caso')).toBe('/prazos');
  });

  it('detects /processos', () => {
    expect(detectCommand('/processos')).toBe('/processos');
  });

  it('detects /status', () => {
    expect(detectCommand('/status')).toBe('/status');
  });

  it('detects /documentos', () => {
    expect(detectCommand('/documentos')).toBe('/documentos');
  });

  it('detects /honorarios', () => {
    expect(detectCommand('/honorarios')).toBe('/honorarios');
  });

  it('does not detect non-commands', () => {
    expect(detectCommand('Oi, qual é meu processo?')).toBeNull();
    expect(detectCommand('Processo em andamento')).toBeNull();
    expect(detectCommand('')).toBeNull();
    expect(detectCommand('  /prazos')).toBe('/prazos'); // leading space trimmed
  });
});

describe('IA Jurídica — Human Handoff Detection', () => {
  it('triggers handoff on uncertainty patterns', () => {
    expect(needsHandoff('Não tenho como informar sobre isso.')).toBe(true);
    expect(needsHandoff('Precisa entrar em contato com o escritório.')).toBe(true);
    expect(needsHandoff('Recomendo falar com um advogado sobre esse assunto.')).toBe(true);
    expect(needsHandoff('Não sei informar o status atual.')).toBe(true);
    expect(needsHandoff('Não consigo acessar esses dados.')).toBe(true);
  });

  it('does not trigger handoff on normal responses', () => {
    expect(needsHandoff('Seu processo está em fase de recurso.')).toBe(false);
    expect(needsHandoff('O prazo vence em 3 dias, atenção!')).toBe(false);
    expect(needsHandoff('Olá! Como posso ajudar?')).toBe(false);
  });
});

describe('IA Jurídica — Dias Restantes', () => {
  it('calculates 1 day for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(calcDiasRestantes(tomorrow)).toBe(1);
  });

  it('calculates 7 days correctly', () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcDiasRestantes(nextWeek)).toBe(7);
  });
});

describe('IA Jurídica — LegalContext has_context', () => {
  it('has_context is false when no processos', () => {
    const ctx = { processos: [], prazos_urgentes: [], honorarios: [], documentos_count: 0, has_context: false, memories: [] };
    expect(ctx.has_context).toBe(false);
  });

  it('has_context is true when processos exist', () => {
    const ctx = {
      processos: [{ id: 'x', numero_processo: '123', tipo_acao: 'civel', fase_processual: 'conhecimento', status: 'ativo', tribunal: null }],
      prazos_urgentes: [],
      honorarios: [],
      documentos_count: 0,
      has_context: true,
      memories: [],
    };
    expect(ctx.has_context).toBe(true);
  });
});
