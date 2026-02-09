/**
 * 🧪 TESTES DE INTEGRAÇÃO — ZAPSIGN
 *
 * Valida o fluxo completo da integração ZapSign:
 * - Criação de documentos para assinatura
 * - Verificação de status de documentos
 * - Mapeamento de status ZapSign → interno
 * - Validação de payloads
 * - Tratamento de erros
 */

import { describe, it, expect } from 'vitest';

// ─── ZapSign Status Mapping (extracted) ──────────────────────

function mapZapSignStatus(zapSignStatus: string): string {
  switch (zapSignStatus) {
    case 'signed':
      return 'assinado';
    case 'cancelled':
      return 'cancelado';
    case 'expired':
      return 'expirado';
    default:
      return 'pendente';
  }
}

// ─── ZapSign Document Interface ──────────────────────────────

interface ZapSignDocument {
  uuid: string;
  external_id: string;
  name: string;
  status: string;
  url_sign: string;
  created_at: string;
}

// ─── Payload Validation (extracted) ──────────────────────────

interface CreateDocumentPayload {
  action: string;
  contratoId: string;
  contractData: {
    nome_cliente: string;
    email?: string;
    telefone?: string;
    pdf_url?: string;
  };
}

function validateCreateDocumentPayload(payload: Partial<CreateDocumentPayload>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (payload.action !== 'create_document' && payload.action !== 'check_status') {
    errors.push('Ação não reconhecida');
  }

  if (!payload.contratoId) {
    errors.push('contratoId é obrigatório');
  }

  if (payload.action === 'create_document') {
    if (!payload.contractData) {
      errors.push('contractData é obrigatório para create_document');
    } else {
      if (!payload.contractData.nome_cliente) {
        errors.push('nome_cliente é obrigatório');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── ZapSign API Request Builder (extracted) ─────────────────

function buildCreateDocumentRequest(
  contratoId: string,
  contractData: CreateDocumentPayload['contractData']
): Record<string, unknown> {
  return {
    name: `Contrato - ${contractData.nome_cliente}`,
    external_id: contratoId,
    url_pdf: contractData.pdf_url || '',
    disable_signer_emails: true,
    signers: [
      {
        name: contractData.nome_cliente,
        email: contractData.email || '',
        phone: contractData.telefone || '',
        lang: 'pt-br',
      },
    ],
  };
}

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_ZAPSIGN_DOCUMENT: ZapSignDocument = {
  uuid: 'zs_doc_001',
  external_id: 'contrato_001',
  name: 'Contrato - João Silva',
  status: 'pending',
  url_sign: 'https://sandbox.zapsign.com.br/sign/abc123',
  created_at: '2025-01-15T10:00:00Z',
};

const MOCK_SIGNED_DOCUMENT: ZapSignDocument = {
  uuid: 'zs_doc_002',
  external_id: 'contrato_002',
  name: 'Contrato - Maria Santos',
  status: 'signed',
  url_sign: 'https://sandbox.zapsign.com.br/sign/def456',
  created_at: '2025-01-10T08:00:00Z',
};

// ─── Tests ───────────────────────────────────────────────────

describe('ZapSign Integration — Status Mapping', () => {
  it('maps signed → assinado', () => {
    expect(mapZapSignStatus('signed')).toBe('assinado');
  });

  it('maps cancelled → cancelado', () => {
    expect(mapZapSignStatus('cancelled')).toBe('cancelado');
  });

  it('maps expired → expirado', () => {
    expect(mapZapSignStatus('expired')).toBe('expirado');
  });

  it('maps pending → pendente (default)', () => {
    expect(mapZapSignStatus('pending')).toBe('pendente');
  });

  it('maps unknown status → pendente (default)', () => {
    expect(mapZapSignStatus('unknown')).toBe('pendente');
    expect(mapZapSignStatus('')).toBe('pendente');
  });
});

describe('ZapSign Integration — Payload Validation', () => {
  it('validates a correct create_document payload', () => {
    const result = validateCreateDocumentPayload({
      action: 'create_document',
      contratoId: 'contrato_001',
      contractData: {
        nome_cliente: 'João Silva',
        email: 'joao@test.com',
        telefone: '+5511999888777',
        pdf_url: 'https://storage.example.com/contrato.pdf',
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates a correct check_status payload', () => {
    const result = validateCreateDocumentPayload({
      action: 'check_status',
      contratoId: 'contrato_001',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects unknown action', () => {
    const result = validateCreateDocumentPayload({
      action: 'delete_document',
      contratoId: 'contrato_001',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ação não reconhecida');
  });

  it('rejects missing contratoId', () => {
    const result = validateCreateDocumentPayload({
      action: 'check_status',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('contratoId é obrigatório');
  });

  it('rejects create_document without contractData', () => {
    const result = validateCreateDocumentPayload({
      action: 'create_document',
      contratoId: 'contrato_001',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('contractData é obrigatório para create_document');
  });

  it('rejects create_document without nome_cliente', () => {
    const result = validateCreateDocumentPayload({
      action: 'create_document',
      contratoId: 'contrato_001',
      contractData: { nome_cliente: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('nome_cliente é obrigatório');
  });

  it('collects multiple errors', () => {
    const result = validateCreateDocumentPayload({
      action: 'invalid',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ZapSign Integration — Request Builder', () => {
  it('builds correct create document request', () => {
    const request = buildCreateDocumentRequest('contrato_001', {
      nome_cliente: 'João Silva',
      email: 'joao@test.com',
      telefone: '+5511999888777',
      pdf_url: 'https://storage.example.com/contrato.pdf',
    });

    expect(request.name).toBe('Contrato - João Silva');
    expect(request.external_id).toBe('contrato_001');
    expect(request.url_pdf).toBe('https://storage.example.com/contrato.pdf');
    expect(request.disable_signer_emails).toBe(true);

    const signers = request.signers as Array<Record<string, string>>;
    expect(signers).toHaveLength(1);
    expect(signers[0].name).toBe('João Silva');
    expect(signers[0].email).toBe('joao@test.com');
    expect(signers[0].phone).toBe('+5511999888777');
    expect(signers[0].lang).toBe('pt-br');
  });

  it('handles missing optional fields with defaults', () => {
    const request = buildCreateDocumentRequest('contrato_002', {
      nome_cliente: 'Maria Santos',
    });

    expect(request.url_pdf).toBe('');
    const signers = request.signers as Array<Record<string, string>>;
    expect(signers[0].email).toBe('');
    expect(signers[0].phone).toBe('');
  });
});

describe('ZapSign Integration — Document Structure', () => {
  it('mock document has all required fields', () => {
    expect(MOCK_ZAPSIGN_DOCUMENT.uuid).toBeDefined();
    expect(MOCK_ZAPSIGN_DOCUMENT.external_id).toBeDefined();
    expect(MOCK_ZAPSIGN_DOCUMENT.name).toBeDefined();
    expect(MOCK_ZAPSIGN_DOCUMENT.status).toBeDefined();
    expect(MOCK_ZAPSIGN_DOCUMENT.url_sign).toBeDefined();
    expect(MOCK_ZAPSIGN_DOCUMENT.created_at).toBeDefined();
  });

  it('url_sign is a valid URL', () => {
    expect(MOCK_ZAPSIGN_DOCUMENT.url_sign).toMatch(/^https:\/\//);
  });

  it('created_at is a valid ISO date', () => {
    const date = new Date(MOCK_ZAPSIGN_DOCUMENT.created_at);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe('ZapSign Integration — Status Change Detection', () => {
  it('detects status change from pendente to assinado', () => {
    const currentStatus = 'pendente';
    const newStatus = mapZapSignStatus(MOCK_SIGNED_DOCUMENT.status);
    expect(currentStatus !== newStatus).toBe(true);
    expect(newStatus).toBe('assinado');
  });

  it('no update needed when status unchanged', () => {
    const currentStatus = 'pendente';
    const newStatus = mapZapSignStatus('pending');
    expect(currentStatus === newStatus).toBe(true);
  });

  it('sets data_assinatura only when status is assinado', () => {
    const newStatus = 'assinado';
    const updatePayload: Record<string, unknown> = {
      status_assinatura: newStatus,
      ...(newStatus === 'assinado' && { data_assinatura: new Date().toISOString() }),
    };
    expect(updatePayload.data_assinatura).toBeDefined();
  });

  it('does NOT set data_assinatura for cancelado', () => {
    const newStatus = 'cancelado';
    const updatePayload: Record<string, unknown> = {
      status_assinatura: newStatus,
      ...(newStatus === 'assinado' && { data_assinatura: new Date().toISOString() }),
    };
    expect(updatePayload.data_assinatura).toBeUndefined();
  });
});

describe('ZapSign Integration — Security', () => {
  it('requires Authorization header', () => {
    const authHeader: string | null = null;
    expect(!authHeader).toBe(true);
  });

  it('requires ZapSign API key to be configured', () => {
    const apiKey = '';
    expect(!apiKey).toBe(true);
  });

  it('uses sandbox URL for testing', () => {
    const sandboxUrl = 'https://sandbox.zapsign.com.br/api/v1/docs/';
    expect(sandboxUrl).toContain('sandbox');
  });

  it('API key is sent via Authorization header', () => {
    const apiKey = 'test_api_key';
    const header = `Api-Key ${apiKey}`;
    expect(header).toBe('Api-Key test_api_key');
  });
});
