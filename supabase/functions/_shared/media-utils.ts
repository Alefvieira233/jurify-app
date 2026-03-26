import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { kapsoFetch, getKapsoConfig } from "./kapso-client.ts";

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
  fileName: string | null;
  sizeBytes: number;
}

const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Downloads media from Kapso/Meta WhatsApp API.
 * Kapso proxies Meta's media API. Media IDs from webhooks need to be
 * resolved to URLs first, then downloaded with auth.
 */
export async function downloadKapsoMedia(
  mediaIdOrUrl: string,
): Promise<DownloadedMedia> {
  let downloadUrl = mediaIdOrUrl;

  // If it's a media ID (not a URL), resolve it via Kapso API
  if (!mediaIdOrUrl.startsWith("http")) {
    const urlResp = await kapsoFetch(`/meta/whatsapp/v24.0/${mediaIdOrUrl}`);
    if (!urlResp.ok) {
      throw new Error(`Failed to resolve media URL: HTTP ${urlResp.status}`);
    }
    const urlData = await urlResp.json();
    downloadUrl = urlData.url;
    if (!downloadUrl) {
      throw new Error("No media URL in Kapso response");
    }
  }

  // Download the actual media file
  const config = getKapsoConfig();
  const headers: Record<string, string> = {};

  // Add Kapso auth for Meta CDN URLs
  if (downloadUrl.includes("lookaside.fbsbx.com") || downloadUrl.includes("whatsapp")) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(downloadUrl, { headers, signal: controller.signal });
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
