import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { initSentry, captureError } from "../_shared/sentry.ts";
import { generateEmbedding } from "../_shared/embeddings.ts";

initSentry();

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

interface IngestRequest {
  text: string;
  tenant_id?: string;
  doc_id?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  model?: string;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const overlap = Math.min(CHUNK_OVERLAP, Math.floor(CHUNK_SIZE / 2));

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase env vars not configured");
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, tenant_id, doc_id, source, metadata, model }: IngestRequest = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tenant_id || typeof tenant_id !== "string") {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveTenantId = tenant_id || profile.tenant_id;
    if (effectiveTenantId !== profile.tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ error: "No valid chunks" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseService = createClient(supabaseUrl, serviceRoleKey);

    if (doc_id && typeof doc_id === "string") {
      const { error: deleteError } = await supabaseService
        .from("documents")
        .delete()
        .eq("tenant_id", effectiveTenantId)
        .eq("metadata->>doc_id", doc_id);

      if (deleteError) {
        throw deleteError;
      }
    }

    const rows = [] as Array<{
      tenant_id: string;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }>;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk, model);
      rows.push({
        tenant_id: effectiveTenantId,
        content: chunk,
        embedding,
        metadata: {
          doc_id: doc_id || null,
          source: source || null,
          chunk_index: i,
          total_chunks: chunks.length,
          ...(metadata || {}),
        },
      });
    }

    const { error: insertError } = await supabaseService.from("documents").insert(rows);
    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ inserted: rows.length, chunks: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    captureError(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
