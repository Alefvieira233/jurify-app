/**
 * Calls a Supabase Edge Function via HTTP fetch.
 * Uses service role key for auth. Avoids functions.invoke() issues.
 */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`${functionName} failed: HTTP ${response.status} — ${errText}`);
  }

  return response.json() as Promise<T>;
}

/** Escapa caracteres especiais do LIKE para evitar manipulação de padrões */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
