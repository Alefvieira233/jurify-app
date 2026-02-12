import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * 🔓 DECRYPT DATA — Server-Side Decryption Edge Function
 *
 * Receives AES-256-GCM ciphertext and returns plaintext.
 * The encryption key lives ONLY in Supabase Secrets (ENCRYPTION_KEY).
 * Never exposed to the browser.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) {
      console.error("[decrypt-data] ENCRYPTION_KEY not configured");
      return new Response(JSON.stringify({ error: "Encryption not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ciphertext } = await req.json();
    if (typeof ciphertext !== "string" || !ciphertext) {
      return new Response(JSON.stringify({ error: "Missing ciphertext" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse base64: salt:iv:ciphertext
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid ciphertext format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromBase64 = (b64: string) =>
      new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));

    const salt = fromBase64(parts[0]);
    const iv = fromBase64(parts[1]);
    const encryptedData = fromBase64(parts[2]);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_KEY),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      encryptedData
    );

    const plaintext = decoder.decode(decrypted);

    return new Response(JSON.stringify({ plaintext }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[decrypt-data] Error:", error);
    return new Response(JSON.stringify({ error: "Decryption failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
