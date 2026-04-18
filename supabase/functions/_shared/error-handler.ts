/**
 * Shared error handler for Edge Functions.
 * Prevents internal error details (stack traces, DB info) from leaking to the client.
 *
 * Sentinel Directive: Never return raw error messages (err.message) to clients
 * in Edge Function responses; always return generic error messages.
 */

const GENERIC_MESSAGE = "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.";

/**
 * Returns a safe, generic error message.
 * Internal details are logged to the console but not returned to the client.
 */
export function getSafeError(error: unknown): string {
  // In a real scenario, we might want to map some specific error types to safe messages,
  // but following the strict directive, we prioritize generic responses.
  return GENERIC_MESSAGE;
}

/**
 * Creates a safe error response for Edge Functions.
 * @param error The error object (logged internally)
 * @param status HTTP status code (default 500)
 * @param corsHeaders CORS headers to include
 * @param customSafeMessage Optional specific message if we know it's safe to disclose
 */
export function createErrorResponse(
  error: unknown,
  status = 500,
  corsHeaders: Record<string, string> = {},
  customSafeMessage?: string
): Response {
  // Log the full error internally for debugging
  console.error(`[Edge Function Error] status ${status}:`, error);

  const message = customSafeMessage || getSafeError(error);

  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
