import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { STATUS_LABELS } from '../schemas/leadSchema';

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
  it('STATUS_LABELS deve ter todas as chaves obrigatórias', () => {
    expect(STATUS_LABELS).toHaveProperty('novo_lead');
    expect(STATUS_LABELS).toHaveProperty('em_qualificacao');
    expect(STATUS_LABELS).toHaveProperty('analise_juridica');
    expect(STATUS_LABELS).toHaveProperty('proposta_enviada');
    expect(STATUS_LABELS).toHaveProperty('negociacao');
    expect(STATUS_LABELS).toHaveProperty('contrato_assinado');
    expect(STATUS_LABELS).toHaveProperty('lead_perdido');
  });

  it('STATUS_LABELS deve ter valores em português', () => {
    expect(STATUS_LABELS.novo_lead).toBe('Novo Lead');
    expect(STATUS_LABELS.em_qualificacao).toBe('Em Qualificação');
    expect(STATUS_LABELS.contrato_assinado).toBe('Contrato Assinado');
    expect(STATUS_LABELS.lead_perdido).toBe('Lead Perdido');
  });

  it('STATUS_LABELS não deve ter valores undefined ou vazios', () => {
    for (const [key, value] of Object.entries(STATUS_LABELS)) {
      expect(value, `STATUS_LABELS.${key} não deve ser vazio`).toBeTruthy();
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
      responsavel: 'Dr. João',
    });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar nome com caracteres inválidos', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: 'João <script>',
      area_juridica: 'Direito Civil',
      origem: 'WhatsApp',
      responsavel: 'Dr. João',
    });
    expect(result.success).toBe(false);
  });

  it('deve aceitar nome com apóstrofo (ex: D\'Ávila)', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: "Pedro D'Ávila",
      area_juridica: 'Direito Civil',
      origem: 'WhatsApp',
      responsavel: 'Dr. João',
    });
    expect(result.success).toBe(true);
  });

  it('deve aceitar lead válido completo', async () => {
    const { leadFormSchema } = await import('../schemas/leadSchema');
    const result = leadFormSchema.safeParse({
      nome_completo: 'Maria Silva',
      area_juridica: 'Direito de Família',
      origem: 'WhatsApp',
      responsavel: 'Dr. Carlos',
      email: 'maria@email.com',
      telefone: '11999999999',
    });
    expect(result.success).toBe(true);
  });
});
