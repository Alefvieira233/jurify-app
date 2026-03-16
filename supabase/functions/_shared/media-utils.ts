import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
  fileName: string | null;
  sizeBytes: number;
}

const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Downloads media from Evolution API.
 * Evolution stores media and exposes it via the message's mediaUrl field.
 * The URL is a direct download link that requires the API key.
 */
export async function downloadEvolutionMedia(
  mediaUrl: string,
): Promise<DownloadedMedia> {
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

  const headers: Record<string, string> = {};
  // If the URL is from the Evolution API server, add auth
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
  if (evolutionApiUrl && mediaUrl.startsWith(evolutionApiUrl)) {
    headers["apikey"] = evolutionApiKey || "";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(mediaUrl, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Media download failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > MAX_MEDIA_SIZE) {
    throw new Error(`Media too large: ${buffer.byteLength} bytes (max ${MAX_MEDIA_SIZE})`);
  }

  const disposition = response.headers.get("content-disposition");
  let fileName: string | null = null;
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?(?:;|$)/);
    if (match?.[1]) fileName = match[1];
  }

  return {
    base64: base64Encode(new Uint8Array(buffer)),
    mimeType: contentType,
    fileName,
    sizeBytes: buffer.byteLength,
  };
}

/**
 * Detects media category from MIME type.
 */
export function detectMediaCategory(
  mimeType: string,
): "image" | "audio" | "pdf" | "document" | "unknown" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("word") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("text/")
  ) return "document";
  return "unknown";
}
