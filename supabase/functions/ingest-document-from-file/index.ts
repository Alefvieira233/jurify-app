import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { initSentry, captureError } from "../_shared/sentry.ts";

initSentry();

interface IngestFromFileRequest {
  file_url?: string;
  base64?: string;
  filename?: string;
  content_type?: string;
  tenant_id?: string;
  doc_id?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
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

    if (!supabaseUrl || !anonKey) {
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

    const {
      file_url,
      base64,
      filename,
      content_type,
      tenant_id,
      doc_id,
      source,
      metadata,
    }: IngestFromFileRequest = await req.json();

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

    if (tenant_id !== profile.tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-document-text`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url,
        base64,
        filename,
        content_type,
        tenant_id,
        doc_id,
        source,
      }),
    });

    const extractPayload = await extractResponse.json();
    if (!extractResponse.ok) {
      return new Response(JSON.stringify(extractPayload), {
        status: extractResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedText = extractPayload?.text || "";
    if (!extractedText) {
      return new Response(
        JSON.stringify({
          error: extractPayload?.error || "No text extracted",
          detected_type: extractPayload?.detected_type,
          pages: extractPayload?.pages,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ingestResponse = await fetch(`${supabaseUrl}/functions/v1/ingest-document`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: extractedText,
        tenant_id,
        doc_id,
        source,
        metadata: {
          detected_type: extractPayload?.detected_type,
          pages: extractPayload?.pages,
          ...(metadata || {}),
        },
      }),
    });

    const ingestPayload = await ingestResponse.json();

    return new Response(
      JSON.stringify({
        ...ingestPayload,
        detected_type: extractPayload?.detected_type,
        pages: extractPayload?.pages,
      }),
      {
        status: ingestResponse.ok ? 200 : ingestResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
