// Retorna apenas IDs públicos OAuth (Client IDs são públicos por design)
Deno.serve(() => {
  return new Response(JSON.stringify({
    google_client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? null,
    has_google_secret: !!Deno.env.get("GOOGLE_CLIENT_SECRET"),
    has_encryption_key: !!Deno.env.get("ENCRYPTION_KEY"),
    has_kapso_master: !!Deno.env.get("KAPSO_MASTER_API_KEY"),
    has_openai: !!Deno.env.get("OPENAI_API_KEY"),
  }), { headers: { "Content-Type": "application/json" } });
});
