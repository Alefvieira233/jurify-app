/**
 * User-safe error message sanitizer.
 *
 * Prevents raw backend error details (Supabase, Kapso, Stripe, etc.)
 * from leaking to the UI. Returns a generic Portuguese message for
 * unknown errors; maps known error patterns to helpful user text.
 */

const ERROR_MAP: Array<[RegExp, string]> = [
  [/duplicate key|already exists|unique.*constraint/i, 'Este registro já existe.'],
  [/not found|no rows/i, 'Registro não encontrado.'],
  [/permission denied|row.*level.*security/i, 'Você não tem permissão para esta ação.'],
  [/network|fetch|timeout|ECONNREFUSED/i, 'Erro de conexão. Verifique sua internet e tente novamente.'],
  [/invalid.*email/i, 'E-mail inválido.'],
  [/password.*weak|password.*short/i, 'Senha muito fraca. Use pelo menos 6 caracteres.'],
  [/user.*already.*registered/i, 'Este e-mail já está cadastrado.'],
  [/invalid.*credentials|invalid.*login/i, 'E-mail ou senha incorretos.'],
  [/rate.*limit|too many requests/i, 'Muitas tentativas. Aguarde um momento e tente novamente.'],
  [/foreign.*key|violates.*constraint/i, 'Este registro está vinculado a outros dados e não pode ser alterado.'],
];

const GENERIC_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.';

export function toUserMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  for (const [pattern, msg] of ERROR_MAP) {
    if (pattern.test(raw)) return msg;
  }

  return GENERIC_MESSAGE;
}
