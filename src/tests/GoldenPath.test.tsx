import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { LEAD_STATUS_LABELS } from '../schemas/leadSchema';

// Mock @hello-pangea/dnd to avoid DragDropContext requirement
vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode }) =>
    children({ draggableProps: {}, dragHandleProps: {}, innerRef: vi.fn() }, { isDragging: false }),
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
  Droppable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({ droppableProps: {}, innerRef: vi.fn(), placeholder: null }),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
  supabaseUntyped: { from: vi.fn() },
}));

describe('Enterprise Golden Path — Schemas e Configurações', () => {
  it('LEAD_STATUS_LABELS deve ter todas as chaves obrigatórias', () => {
    expect(LEAD_STATUS_LABELS).toHaveProperty('novo');
    expect(LEAD_STATUS_LABELS).toHaveProperty('em_contato');
    expect(LEAD_STATUS_LABELS).toHaveProperty('qualificado');
    expect(LEAD_STATUS_LABELS).toHaveProperty('proposta');
    expect(LEAD_STATUS_LABELS).toHaveProperty('negociacao');
    expect(LEAD_STATUS_LABELS).toHaveProperty('ganho');
    expect(LEAD_STATUS_LABELS).toHaveProperty('perdido');
  });

  it('LEAD_STATUS_LABELS deve ter valores em português', () => {
    expect(LEAD_STATUS_LABELS.novo).toBe('Novo');
    expect(LEAD_STATUS_LABELS.em_contato).toBe('Em Contato');
    expect(LEAD_STATUS_LABELS.ganho).toBe('Ganho');
    expect(LEAD_STATUS_LABELS.perdido).toBe('Perdido');
  });

  it('LEAD_STATUS_LABELS não deve ter valores undefined ou vazios', () => {
    for (const [key, value] of Object.entries(LEAD_STATUS_LABELS)) {
      expect(value, `LEAD_STATUS_LABELS.${key} não deve ser vazio`).toBeTruthy();
      expect(typeof value).toBe('string');
    }
  });
});

describe('leadFormSchema — Validações', () => {
  it('deve importar leadFormSchema sem erros', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    expect(leadFormSchema).toBeDefined();
  });

  it('deve rejeitar nome vazio', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: '',
      area_juridica: 'Direito Civil',
      origem: 'WhatsApp',
      responsavel_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar nome com caracteres inválidos', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: 'João <script>',
      area_juridica: 'Direito Civil',
      origem: 'WhatsApp',
      responsavel_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('deve aceitar nome com apóstrofo (ex: D\'Ávila)', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: "Pedro D'Ávila",
      area_juridica: 'Direito Civil',
      origem: 'WhatsApp',
      responsavel_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('deve aceitar lead válido completo', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: 'Maria Silva',
      area_juridica: 'Direito de Família',
      origem: 'WhatsApp',
      responsavel_id: '00000000-0000-0000-0000-000000000002',
      email: 'maria@email.com',
      telefone: '11999999999',
    });
    expect(result.success).toBe(true);
  });
});
