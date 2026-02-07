const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://jurify.vercel.app",
  "https://jurify-app.vercel.app",
  "https://jurify.com.br",
];

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("FRONTEND_URL") || "";
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = parseAllowedOrigins();
  const isAllowed = origin ? allowedOrigins.includes(origin) : false;

  // Se a origin está na lista, retorna ela exatamente (necessário para CORS com credentials)
  // Se não está na lista, usa wildcard para não bloquear (auth via JWT já protege)
  const allowOrigin = isAllowed && origin ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
}
