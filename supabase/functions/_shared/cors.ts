function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("FRONTEND_URL") || "";
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  // Fallback seguro: se nenhuma origin configurada, aceitar localhost (dev) e Supabase
  if (origins.length === 0) {
    return [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://jurify.vercel.app",
      "https://jurify-app.vercel.app",
      "https://jurify.com.br",
    ];
  }
  return origins;
}

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = parseAllowedOrigins();
  const isAllowed = origin ? allowedOrigins.includes(origin) : false;
  const allowOrigin = isAllowed ? origin! : allowedOrigins[0];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }

  return headers;
}
