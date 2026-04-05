/**
 * User-safe error message sanitizer.
 *
 * Prevents raw backend error details (Supabase, Kapso, Stripe, etc.)
 * from leaking to the UI. Returns a generic Portuguese message for
 * unknown errors; maps known error patterns to helpful user text.
 */

const ERROR_MAP: Array<[RegExp, string]> = [
  // Auth-specific errors (Supabase GoTrue)
  [/over_email_send_rate_limit/i, 'Limite de envio atingido. Aguarde alguns minutos e tente novamente.'],
  [/email_address_invalid/i, 'Endereço de e-mail inválido.'],
  [/user.*already.*registered|email.*already.*use|already.*been.*registered/i, 'Este e-mail já está cadastrado. Tente fazer login.'],
  [/signup.*disabled/i, 'Cadastro temporariamente desabilitado.'],
  [/email_not_confirmed/i, 'Confirme seu e-mail antes de fazer login.'],
  [/invalid.*credentials|invalid.*login/i, 'E-mail ou senha incorretos.'],
  [/password.*weak|password.*short|senha.*fraca/i, 'Senha muito fraca. Use pelo menos 8 caracteres com letras, números e símbolos.'],
  [/invalid.*email/i, 'E-mail inválido.'],

  // Database / RLS errors
  [/duplicate key|already exists|unique.*constraint/i, 'Este registro já existe.'],
  [/not found|no rows/i, 'Registro não encontrado.'],
  [/permission denied|row.*level.*security/i, 'Você não tem permissão para esta ação.'],
  [/foreign.*key|violates.*constraint/i, 'Este registro está vinculado a outros dados e não pode ser alterado.'],

  // Network errors
  [/network|fetch|timeout|ECONNREFUSED/i, 'Erro de conexão. Verifique sua internet e tente novamente.'],
  [/rate.*limit|too many requests/i, 'Muitas tentativas. Aguarde um momento e tente novamente.'],
  [/upstream.*connect|503|service.*unavailable/i, 'Serviço temporariamente indisponível. Tente novamente em instantes.'],
];

const GENERIC_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.';

export function toUserMessage(error: unknown): string {
  let raw = '';

  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === 'string') {
    raw = error;
  } else if (error && typeof error === 'object') {
    // Supabase errors are plain objects with .message or .msg
    const obj = error as Record<string, unknown>;
    const val = obj.message ?? obj.msg ?? obj.error_description;
    raw = typeof val === 'string' ? val : '';
  }

  for (const [pattern, msg] of ERROR_MAP) {
    if (pattern.test(raw)) return msg;
  }

  return GENERIC_MESSAGE;
}
