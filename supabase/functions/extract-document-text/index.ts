import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { initSentry, captureError } from "../_shared/sentry.ts";

initSentry();

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const OCR_DEFAULT_LANG = "por";

interface ExtractRequest {
  file_url?: string;
  base64?: string;
  filename?: string;
  content_type?: string;
  tenant_id?: string;
  doc_id?: string;
  source?: string;
}

function inferContentType(filename?: string, contentType?: string): string | undefined {
  if (contentType) return contentType;
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

function decodeBase64(base64: string): Uint8Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function extractPdfText(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: { str: string }) => item.str).join(" ");
    fullText += `${pageText}\n`;
  }

  return { text: fullText.trim(), pages: pdf.numPages };
}

async function ocrImage(params: {
  base64Image?: string;
  fileUrl?: string;
  contentType?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("OCR_SPACE_API_KEY");
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY not configured");
  }

  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append("language", OCR_DEFAULT_LANG);
  formData.append("OCREngine", "2");

  if (params.base64Image) {
    const dataUri = params.contentType
      ? `data:${params.contentType};base64,${params.base64Image}`
      : `data:image/png;base64,${params.base64Image}`;
    formData.append("base64Image", dataUri);
  } else if (params.fileUrl) {
    formData.append("url", params.fileUrl);
  } else {
    throw new Error("No image source provided");
  }

  const response = await fetch(OCR_SPACE_URL, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || payload.IsErroredOnProcessing) {
    const message = payload.ErrorMessage?.[0] || payload.ErrorDetails || "OCR failed";
    throw new Error(message);
  }

  const text = payload.ParsedResults?.[0]?.ParsedText || "";
  return text.trim();
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

    const { file_url, base64, filename, content_type, tenant_id }: ExtractRequest = await req.json();

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

    if (!file_url && !base64) {
      return new Response(JSON.stringify({ error: "file_url or base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let detectedType = inferContentType(filename, content_type) || "";
    let bytes: Uint8Array | null = null;

    if (base64) {
      const normalized = base64.includes(",") ? base64.split(",")[1] : base64;
      bytes = decodeBase64(normalized);
    } else if (file_url) {
      const response = await fetch(file_url);
      if (!response.ok) {
        throw new Error("Failed to fetch file_url");
      }
      const buffer = new Uint8Array(await response.arrayBuffer());
      bytes = buffer;
      if (!detectedType) {
        detectedType = response.headers.get("content-type") || "";
      }
    }

    if (!detectedType) {
      return new Response(JSON.stringify({ error: "content_type or filename required to detect type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (detectedType.includes("pdf")) {
      if (!bytes) {
        return new Response(JSON.stringify({ error: "PDF bytes not available" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { text, pages } = await extractPdfText(bytes);
      if (!text) {
        return new Response(
          JSON.stringify({
            text: "",
            pages,
            detected_type: "pdf",
            error: "PDF OCR not supported on edge; use worker OCR",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ text, pages, detected_type: "pdf" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (detectedType.startsWith("image/")) {
      const text = await ocrImage({
        base64Image: base64 ? (base64.includes(",") ? base64.split(",")[1] : base64) : undefined,
        fileUrl: file_url,
        contentType: detectedType,
      });

      return new Response(
        JSON.stringify({ text, pages: 1, detected_type: "image" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unsupported content_type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    captureError(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
