function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("FRONTEND_URL") || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = parseAllowedOrigins();
  const allowAll = allowedOrigins.length === 0;
  const isAllowed = origin ? allowedOrigins.includes(origin) : false;
  const allowOrigin = isAllowed ? origin : allowAll ? "*" : "";

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
