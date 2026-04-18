import { describe, it, expect, vi } from 'vitest';
import { createErrorResponse, getSafeError } from '../../../../supabase/functions/_shared/error-handler';

describe('Shared Error Handler', () => {
  it('getSafeError returns the generic message', () => {
    const error = new Error('Sensitive database error');
    const result = getSafeError(error);
    expect(result).toBe('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
  });

  it('createErrorResponse returns a Response with generic message', async () => {
    const error = new Error('Another sensitive error');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = createErrorResponse(error, 500, { 'X-Test': 'true' });

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('X-Test')).toBe('true');

    const body = await response.json();
    expect(body.error).toBe('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('createErrorResponse allows custom safe messages', async () => {
    const error = new Error('Secret');
    const response = createErrorResponse(error, 400, {}, 'Dados inválidos');
    const body = await response.json();
    expect(body.error).toBe('Dados inválidos');
  });
});
