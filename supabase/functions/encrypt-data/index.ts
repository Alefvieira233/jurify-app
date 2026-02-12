import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * 🔐 ENCRYPT DATA — Server-Side Encryption Edge Function
 *
 * Receives plaintext data and returns AES-256-GCM encrypted ciphertext.
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
      console.error("[encrypt-data] ENCRYPTION_KEY not configured");
      return new Response(JSON.stringify({ error: "Encryption not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plaintext } = await req.json();
    if (typeof plaintext !== "string" || !plaintext) {
      return new Response(JSON.stringify({ error: "Missing plaintext" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive key from ENCRYPTION_KEY using PBKDF2
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_KEY),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      encoder.encode(plaintext)
    );

    // Encode as base64: salt:iv:ciphertext
    const toBase64 = (buf: ArrayBuffer) =>
      btoa(String.fromCharCode(...new Uint8Array(buf)));

    const ciphertext = `${toBase64(salt)}:${toBase64(iv)}:${toBase64(encrypted)}`;

    return new Response(JSON.stringify({ ciphertext }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[encrypt-data] Error:", error);
    return new Response(JSON.stringify({ error: "Encryption failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
