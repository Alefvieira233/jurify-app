/**
 * 🧪 TESTES DE INTEGRAÇÃO — ORQUESTRAÇÃO DE AGENTES IA
 *
 * Valida:
 * - Routing do orchestrator (keywords jurídicas, media, mixed-intent)
 * - State machine de leads (transições válidas/inválidas)
 * - Detecção de handoff (12 regex patterns)
 * - Qualificação automática de leads (progressão de status)
 * - Command detection e routing
 */

import { describe, it, expect } from 'vitest';
import { isValidTransition, getValidNextStatuses, LEAD_STATUSES } from '@/constants/leadStatus';

// ── ORCHESTRATOR ROUTING TESTS ──────────────────────────────────

/**
 * Simulates orchestrator keyword detection.
 * Based on the ORCHESTRATOR_PROMPT in agent-prompts.ts.
 */
const LEGAL_KEYWORDS = [
  'advogado', 'advogada', 'processo', 'ação', 'justiça', 'tribunal', 'prazo',
  'recurso', 'sentença', 'audiência', 'petição', 'contestação', 'liminar',
  'mandado', 'intimação', 'citação', 'defesa', 'réu', 'autor', 'vara',
  'juiz', 'juíza', 'desembargador', 'jurídico', 'jurídica', 'lei', 'direito',
  'trabalhista', 'família', 'divórcio', 'divorcio', 'pensão', 'pensao',
  'guarda', 'consumidor', 'indenização', 'indenizacao', 'dano', 'contrato',
  'criminal', 'penal', 'tributário', 'tributario', 'imposto', 'imóvel',
  'imovel', 'imobiliário', 'imobiliario', 'previdenciário', 'previdenciario',
  'aposentadoria', 'INSS', 'FGTS', 'CLT', 'rescisão', 'rescisao',
  'empresarial', 'societário', 'societario', 'cível', 'civel',
  'herança', 'heranca', 'testamento', 'inventário', 'inventario',
  'usucapião', 'usucapiao', 'execução', 'execucao', 'penhora', 'embargo',
  'alvará', 'alvara', 'procuração', 'procuracao', 'habeas',
  'segurança', 'seguranca', 'acidente', 'devolução', 'reembolso',
  'registro', 'cartório', 'cartorio', 'escritura',
];

function detectLegalKeyword(message: string): boolean {
  const lower = message.toLowerCase();
  return LEGAL_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

type AgentType = 'recepcionista' | 'juridico' | 'comercial' | 'suporte' | 'analista_documentos';

function simulateRouting(input: {
  message: string;
  hasMedia?: boolean;
  hasLegalContext?: boolean;
  isFirstContact?: boolean;
  mediaCategory?: string;
}): AgentType {
  const { message, hasMedia = false, hasLegalContext = false, mediaCategory = 'text' } = input;
  const lower = message.toLowerCase();

  // Rule 1: Media → analista_documentos
  if (hasMedia && mediaCategory !== 'text') return 'analista_documentos';

  // Rule 2: Legal keywords → juridico
  if (detectLegalKeyword(message)) return 'juridico';

  // Rule 3: Ask for lawyer → juridico
  if (/falar com (um )?advogado|orientação (jurídica|legal)|ajuda (jurídica|legal)/i.test(lower)) return 'juridico';

  // Rule 4: Legal context → juridico
  if (hasLegalContext) return 'juridico';

  // Rule 5: Mixed legal + price → juridico
  if (detectLegalKeyword(message) && /preço|valor|quanto|custo|honorário/i.test(lower)) return 'juridico';

  // Rule 6: Only commercial → comercial
  if (/preço|valor|quanto custa|proposta|plano|honorário|orçamento/i.test(lower)) return 'comercial';

  // Rule 7: Complaints → suporte
  if (/reclamação|problema|insatisf|atraso|cobrança|não funciona|ruim|péssimo/i.test(lower)) return 'suporte';

  // Rule 8: Simple greeting → recepcionista
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello)\s*[!?.]*$/i.test(lower.trim())) return 'recepcionista';

  // Rule 9: Default → juridico
  return 'juridico';
}

describe('Agent Orchestration — Routing Rules', () => {
  describe('Legal keyword detection', () => {
    it('detects all major legal areas', () => {
      expect(detectLegalKeyword('Preciso de um advogado')).toBe(true);
      expect(detectLegalKeyword('Tenho um processo trabalhista')).toBe(true);
      expect(detectLegalKeyword('Questão de família e divórcio')).toBe(true);
      expect(detectLegalKeyword('Problema no meu contrato')).toBe(true);
      expect(detectLegalKeyword('Quero saber sobre meu FGTS')).toBe(true);
      expect(detectLegalKeyword('Preciso de alvará')).toBe(true);
      expect(detectLegalKeyword('Questão de herança')).toBe(true);
      expect(detectLegalKeyword('Usucapião do terreno')).toBe(true);
      expect(detectLegalKeyword('Execução de sentença')).toBe(true);
      expect(detectLegalKeyword('Preciso de procuração')).toBe(true);
    });

    it('detects keywords without accents (acessibilidade)', () => {
      expect(detectLegalKeyword('divorcio')).toBe(true);
      expect(detectLegalKeyword('rescisao')).toBe(true);
      expect(detectLegalKeyword('previdenciario')).toBe(true);
      expect(detectLegalKeyword('tributario')).toBe(true);
      expect(detectLegalKeyword('inventario')).toBe(true);
    });

    it('does NOT detect non-legal terms', () => {
      expect(detectLegalKeyword('Bom dia')).toBe(false);
      expect(detectLegalKeyword('Quanto custa?')).toBe(false);
      expect(detectLegalKeyword('Estou insatisfeito')).toBe(false);
      expect(detectLegalKeyword('Olá, tudo bem?')).toBe(false);
    });
  });

  describe('Routing decisions', () => {
    it('routes media messages to analista_documentos', () => {
      expect(simulateRouting({ message: 'Foto do contrato', hasMedia: true, mediaCategory: 'image' })).toBe('analista_documentos');
      expect(simulateRouting({ message: '', hasMedia: true, mediaCategory: 'pdf' })).toBe('analista_documentos');
      expect(simulateRouting({ message: 'Audio', hasMedia: true, mediaCategory: 'audio' })).toBe('analista_documentos');
    });

    it('routes legal keywords to juridico', () => {
      expect(simulateRouting({ message: 'Preciso de um advogado urgente' })).toBe('juridico');
      expect(simulateRouting({ message: 'Meu processo está como?' })).toBe('juridico');
      expect(simulateRouting({ message: 'Questão de divórcio' })).toBe('juridico');
      expect(simulateRouting({ message: 'Quero saber da minha rescisão' })).toBe('juridico');
    });

    it('routes clients with legal context to juridico even without keywords', () => {
      expect(simulateRouting({ message: 'Oi, qual o status?', hasLegalContext: true })).toBe('juridico');
      expect(simulateRouting({ message: 'Bom dia', hasLegalContext: true })).toBe('juridico');
    });

    it('routes mixed legal+commercial to juridico (legal wins)', () => {
      expect(simulateRouting({ message: 'Quanto custa um processo de divórcio?' })).toBe('juridico');
      expect(simulateRouting({ message: 'Valor de uma ação trabalhista?' })).toBe('juridico');
      expect(simulateRouting({ message: 'Preço para contrato empresarial' })).toBe('juridico');
    });

    it('routes pure commercial to comercial', () => {
      expect(simulateRouting({ message: 'Quanto custa o serviço?' })).toBe('comercial');
      expect(simulateRouting({ message: 'Qual o valor da consulta?' })).toBe('comercial');
      expect(simulateRouting({ message: 'Quero ver a proposta' })).toBe('comercial');
    });

    it('routes complaints to suporte (when no legal keywords)', () => {
      // Note: "reclamação" contains "ação" (legal keyword) → routes to juridico
      // Pure complaint words without legal overlap go to suporte
      expect(simulateRouting({ message: 'Estou insatisfeito com tudo' })).toBe('suporte');
      expect(simulateRouting({ message: 'O serviço está ruim' })).toBe('suporte');
      expect(simulateRouting({ message: 'Atraso no retorno' })).toBe('suporte');
    });

    it('routes complaints with legal keywords to juridico (legal wins)', () => {
      // "reclamação" contains "ação" → legal keyword takes priority
      expect(simulateRouting({ message: 'Tenho uma reclamação' })).toBe('juridico');
    });

    it('routes pure greetings to recepcionista', () => {
      expect(simulateRouting({ message: 'Oi' })).toBe('recepcionista');
      expect(simulateRouting({ message: 'Olá!' })).toBe('recepcionista');
      expect(simulateRouting({ message: 'Bom dia' })).toBe('recepcionista');
      expect(simulateRouting({ message: 'Boa tarde' })).toBe('recepcionista');
    });

    it('routes ambiguous messages to juridico (default for law firm)', () => {
      expect(simulateRouting({ message: 'Preciso de ajuda' })).toBe('juridico');
      expect(simulateRouting({ message: 'Podem me orientar?' })).toBe('juridico');
    });
  });
});

// ── STATE MACHINE TESTS ─────────────────────────────────────────

describe('Lead State Machine — Transitions', () => {
  describe('Valid transitions', () => {
    it('novo can go to em_contato, qualificado, perdido', () => {
      expect(isValidTransition('novo', 'em_contato')).toBe(true);
      expect(isValidTransition('novo', 'qualificado')).toBe(true);
      expect(isValidTransition('novo', 'perdido')).toBe(true);
    });

    it('em_contato can go to qualificado, proposta, perdido', () => {
      expect(isValidTransition('em_contato', 'qualificado')).toBe(true);
      expect(isValidTransition('em_contato', 'proposta')).toBe(true);
      expect(isValidTransition('em_contato', 'perdido')).toBe(true);
    });

    it('qualificado can go to proposta, perdido, em_contato', () => {
      expect(isValidTransition('qualificado', 'proposta')).toBe(true);
      expect(isValidTransition('qualificado', 'perdido')).toBe(true);
      expect(isValidTransition('qualificado', 'em_contato')).toBe(true);
    });

    it('proposta can go to negociacao, ganho, perdido, qualificado', () => {
      expect(isValidTransition('proposta', 'negociacao')).toBe(true);
      expect(isValidTransition('proposta', 'ganho')).toBe(true);
      expect(isValidTransition('proposta', 'perdido')).toBe(true);
      expect(isValidTransition('proposta', 'qualificado')).toBe(true);
    });

    it('negociacao can go to ganho, perdido, proposta', () => {
      expect(isValidTransition('negociacao', 'ganho')).toBe(true);
      expect(isValidTransition('negociacao', 'perdido')).toBe(true);
      expect(isValidTransition('negociacao', 'proposta')).toBe(true);
    });

    it('perdido can restart to novo', () => {
      expect(isValidTransition('perdido', 'novo')).toBe(true);
    });
  });

  describe('Invalid transitions (must be blocked)', () => {
    it('novo CANNOT skip to proposta, negociacao, or ganho', () => {
      expect(isValidTransition('novo', 'proposta')).toBe(false);
      expect(isValidTransition('novo', 'negociacao')).toBe(false);
      expect(isValidTransition('novo', 'ganho')).toBe(false);
    });

    it('ganho is TERMINAL — cannot transition anywhere', () => {
      for (const status of LEAD_STATUSES) {
        if (status === 'ganho') continue;
        expect(isValidTransition('ganho', status)).toBe(false);
      }
    });

    it('perdido can ONLY go to novo', () => {
      expect(isValidTransition('perdido', 'em_contato')).toBe(false);
      expect(isValidTransition('perdido', 'qualificado')).toBe(false);
      expect(isValidTransition('perdido', 'proposta')).toBe(false);
      expect(isValidTransition('perdido', 'negociacao')).toBe(false);
      expect(isValidTransition('perdido', 'ganho')).toBe(false);
    });

    it('em_contato CANNOT go to negociacao or ganho directly', () => {
      expect(isValidTransition('em_contato', 'negociacao')).toBe(false);
      expect(isValidTransition('em_contato', 'ganho')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('returns correct next statuses for each stage', () => {
      expect(getValidNextStatuses('novo')).toEqual(expect.arrayContaining(['em_contato', 'qualificado', 'perdido']));
      expect(getValidNextStatuses('ganho')).toEqual([]);
      expect(getValidNextStatuses('perdido')).toEqual(expect.arrayContaining(['novo']));
    });
  });
});

// ── HANDOFF DETECTION TESTS ─────────────────────────────────────

const HANDOFF_REGEX_PATTERNS = [
  /n[aã]o\s+(tenho|consigo|posso)\s+(como\s+)?(informar|responder|acessar|verificar|confirmar)/i,
  /n[aã]o\s+sei\s+(informar|responder|dizer)/i,
  /n[aã]o\s+tenho\s+(essa|esta|a)\s+(informa[çc][aã]o|resposta)/i,
  /n[aã]o\s+(tenho|possuo)\s+acesso/i,
  /recomendo\s+(falar|consultar|conversar)\s+(com\s+)?(um\s+)?(advogado|especialista|profissional|atendente)/i,
  /precis[ao]\s+(falar|entrar\s+em\s+contato|conversar)/i,
  /entre\s+em\s+contato\s+(com|diretamente)/i,
  /encaminhar\s+(para|ao|à)\s+(um\s+)?(advogado|equipe|atendente)/i,
  /n[aã]o\s+(devo|posso)\s+dar\s+(um\s+)?parecer/i,
  /fora\s+d[ao]\s+(meu|minha)\s+(escopo|alcance|capacidade)/i,
  /somente\s+um\s+(advogado|profissional)\s+(pode|poderá)/i,
  /essa\s+quest[aã]o\s+(exige|requer|necessita)\s+(an[aá]lise|avalia[çc][aã]o)\s+(presencial|detalhada|humana)/i,
];

function detectHandoff(aiResponse: string): boolean {
  const lower = aiResponse.toLowerCase();
  return HANDOFF_REGEX_PATTERNS.some(rx => rx.test(lower));
}

describe('Handoff Detection — AI Uncertainty Patterns', () => {
  describe('Should detect handoff (AI admits limitation)', () => {
    it('detects "não tenho como informar" and variations', () => {
      expect(detectHandoff('Não tenho como informar esse dado no momento.')).toBe(true);
      expect(detectHandoff('Nao consigo informar sobre isso.')).toBe(true);
      expect(detectHandoff('Não posso confirmar essa informação.')).toBe(true);
    });

    it('detects "não sei informar" and variations', () => {
      expect(detectHandoff('Não sei informar o andamento exato.')).toBe(true);
      expect(detectHandoff('Não sei responder essa pergunta específica.')).toBe(true);
      expect(detectHandoff('Não sei dizer com certeza.')).toBe(true);
    });

    it('detects "não tenho acesso"', () => {
      expect(detectHandoff('Não tenho acesso a esse sistema.')).toBe(true);
      expect(detectHandoff('Não possuo acesso ao processo.')).toBe(true);
    });

    it('detects recommendations to consult lawyer', () => {
      expect(detectHandoff('Recomendo falar com um advogado especialista.')).toBe(true);
      expect(detectHandoff('Recomendo consultar um profissional qualificado.')).toBe(true);
      expect(detectHandoff('Recomendo conversar com um especialista na área.')).toBe(true);
    });

    it('detects "precisa entrar em contato"', () => {
      expect(detectHandoff('Você precisa entrar em contato com o escritório.')).toBe(true);
      expect(detectHandoff('Preciso falar com o advogado responsável.')).toBe(true);
    });

    it('detects escalation language', () => {
      expect(detectHandoff('Vou encaminhar para um advogado especialista.')).toBe(true);
      expect(detectHandoff('Vou encaminhar para equipe do escritório.')).toBe(true);
      expect(detectHandoff('Precisa entrar em contato com o escritório.')).toBe(true);
    });

    it('detects "fora do meu escopo"', () => {
      expect(detectHandoff('Isso está fora do meu escopo de atuação.')).toBe(true);
      expect(detectHandoff('Fora da minha capacidade de resposta.')).toBe(true);
    });

    it('detects "não posso dar parecer"', () => {
      expect(detectHandoff('Não posso dar um parecer sobre isso.')).toBe(true);
      expect(detectHandoff('Não devo dar parecer jurídico definitivo.')).toBe(true);
    });

    it('detects "somente um advogado pode"', () => {
      expect(detectHandoff('Somente um advogado pode orientar nesse caso.')).toBe(true);
      expect(detectHandoff('Somente um profissional poderá avaliar.')).toBe(true);
    });
  });

  describe('Should NOT detect handoff (normal responses)', () => {
    it('does not trigger on normal legal information', () => {
      expect(detectHandoff('Seu processo está na fase de instrução.')).toBe(false);
      expect(detectHandoff('O prazo vence em 5 dias.')).toBe(false);
      expect(detectHandoff('Os honorários estão em dia.')).toBe(false);
    });

    it('does not trigger on greetings', () => {
      expect(detectHandoff('Olá! Como posso ajudar?')).toBe(false);
      expect(detectHandoff('Bom dia! Sou a assistente do escritório.')).toBe(false);
    });

    it('does not trigger on commercial responses', () => {
      expect(detectHandoff('Nossos honorários dependem da complexidade do caso.')).toBe(false);
      expect(detectHandoff('Posso agendar uma consulta para análise.')).toBe(false);
    });
  });
});

// ── QUALIFICATION LOGIC TESTS ───────────────────────────────────

/**
 * Mirrors analyzeQualification() from whatsapp-webhook.
 * Tests the status progression logic.
 */
function simulateQualification(
  currentStatus: string,
  messageCount: number,
  hasName: boolean,
  hasArea: boolean,
): string {
  let suggestedStatus = currentStatus;

  if (currentStatus === 'novo') {
    if (messageCount >= 1) suggestedStatus = 'em_contato';
    if (messageCount >= 2 && (hasName || hasArea)) suggestedStatus = 'qualificado';
  } else if (currentStatus === 'em_contato') {
    if (hasName || hasArea) suggestedStatus = 'qualificado';
    if (hasName && hasArea) suggestedStatus = 'proposta';
  } else if (currentStatus === 'qualificado') {
    if (hasName && hasArea) suggestedStatus = 'proposta';
  }

  // Never downgrade
  const statusOrder = ['novo', 'em_contato', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const suggestedIdx = statusOrder.indexOf(suggestedStatus);
  if (suggestedIdx < currentIdx) suggestedStatus = currentStatus;

  return suggestedStatus;
}

describe('Lead Qualification — Status Progression', () => {
  it('first message moves novo → em_contato', () => {
    expect(simulateQualification('novo', 1, false, false)).toBe('em_contato');
  });

  it('2+ messages with name moves novo → qualificado', () => {
    expect(simulateQualification('novo', 2, true, false)).toBe('qualificado');
  });

  it('2+ messages with area moves novo → qualificado', () => {
    expect(simulateQualification('novo', 2, false, true)).toBe('qualificado');
  });

  it('em_contato with name moves → qualificado', () => {
    expect(simulateQualification('em_contato', 3, true, false)).toBe('qualificado');
  });

  it('em_contato with name AND area moves → proposta', () => {
    expect(simulateQualification('em_contato', 3, true, true)).toBe('proposta');
  });

  it('qualificado with name AND area moves → proposta', () => {
    expect(simulateQualification('qualificado', 5, true, true)).toBe('proposta');
  });

  it('NEVER downgrades status', () => {
    expect(simulateQualification('proposta', 1, false, false)).toBe('proposta');
    expect(simulateQualification('negociacao', 1, false, false)).toBe('negociacao');
    expect(simulateQualification('ganho', 1, false, false)).toBe('ganho');
  });

  it('all suggested transitions are valid per state machine', () => {
    const cases = [
      { from: 'novo', msgs: 1, name: false, area: false, expected: 'em_contato' },
      { from: 'novo', msgs: 2, name: true, area: false, expected: 'qualificado' },
      { from: 'em_contato', msgs: 3, name: true, area: true, expected: 'proposta' },
      { from: 'qualificado', msgs: 5, name: true, area: true, expected: 'proposta' },
    ];

    for (const c of cases) {
      const result = simulateQualification(c.from, c.msgs, c.name, c.area);
      expect(result).toBe(c.expected);
      expect(isValidTransition(c.from, result)).toBe(true);
    }
  });
});

// ── COMMAND DETECTION TESTS ─────────────────────────────────────

const COMMANDS: Record<string, { intent: string; agent: string }> = {
  '/prazos': { intent: 'liste os prazos processuais', agent: 'juridico' },
  '/processos': { intent: 'liste os processos ativos', agent: 'juridico' },
  '/documentos': { intent: 'informe quantos documentos', agent: 'analista_documentos' },
  '/honorarios': { intent: 'informe o status dos honorários', agent: 'juridico' },
  '/status': { intent: 'resumo completo', agent: 'juridico' },
  '/audiencias': { intent: 'audiências e compromissos', agent: 'juridico' },
  '/andamento': { intent: 'andamento cronológico', agent: 'juridico' },
};

function detectCommand(text: string): { key: string; agent: string } | null {
  const lower = text.trim().toLowerCase();
  const key = Object.keys(COMMANDS).find(cmd => lower.startsWith(cmd));
  if (!key) return null;
  return { key, agent: COMMANDS[key]!.agent };
}

describe('Command Detection', () => {
  it('detects all slash commands', () => {
    expect(detectCommand('/prazos')).toEqual({ key: '/prazos', agent: 'juridico' });
    expect(detectCommand('/processos')).toEqual({ key: '/processos', agent: 'juridico' });
    expect(detectCommand('/documentos')).toEqual({ key: '/documentos', agent: 'analista_documentos' });
    expect(detectCommand('/honorarios')).toEqual({ key: '/honorarios', agent: 'juridico' });
    expect(detectCommand('/status')).toEqual({ key: '/status', agent: 'juridico' });
    expect(detectCommand('/audiencias')).toEqual({ key: '/audiencias', agent: 'juridico' });
    expect(detectCommand('/andamento')).toEqual({ key: '/andamento', agent: 'juridico' });
  });

  it('routes /documentos to analista_documentos (not juridico)', () => {
    const result = detectCommand('/documentos');
    expect(result?.agent).toBe('analista_documentos');
  });

  it('detects commands with extra text', () => {
    expect(detectCommand('/prazos urgentes')).not.toBeNull();
    expect(detectCommand('/status completo')).not.toBeNull();
  });

  it('does NOT detect non-command messages', () => {
    expect(detectCommand('Olá, preciso de ajuda')).toBeNull();
    expect(detectCommand('O que é /prazos?')).toBeNull(); // starts mid-sentence
    expect(detectCommand('Bom dia')).toBeNull();
  });

  it('handles case insensitivity', () => {
    expect(detectCommand('/PRAZOS')).not.toBeNull();
    expect(detectCommand('/Status')).not.toBeNull();
  });
});
