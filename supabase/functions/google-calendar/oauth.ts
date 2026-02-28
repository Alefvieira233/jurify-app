/**
 * Google Calendar OAuth Handler
 *
 * Handles:
 * - initiateAuth: Build OAuth URL and return it
 * - exchangeCode: Exchange auth code for tokens and persist them
 * - disconnect:   Remove stored tokens
 * - status:       Return connection status + email
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { method, data } = await req.json();

    switch (method) {
      case "initiateAuth": {
        const { redirectUri } = data as { redirectUri: string };

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: SCOPES,
          response_type: "code",
          access_type: "offline",
          prompt: "consent",
          state: user.id,
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchangeCode": {
        const { code, redirectUri } = data as { code: string; redirectUri: string };

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.json();
          throw new Error(`Token exchange failed: ${err.error_description || err.error}`);
        }

        const tokenData = await tokenRes.json();
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        // Fetch user info from Google
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

        // Upsert tokens in database
        const { error: upsertError } = await supabase
          .from("google_calendar_tokens")
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            scope: tokenData.scope,
            token_type: tokenData.token_type,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          }, { onConflict: "user_id" });

        if (upsertError) throw new Error(`DB error: ${upsertError.message}`);

        return new Response(
          JSON.stringify({ success: true, email: userInfo.email, name: userInfo.name }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        const { error: delError } = await supabase
          .from("google_calendar_tokens")
          .delete()
          .eq("user_id", user.id);

        if (delError) throw new Error(`DB error: ${delError.message}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens")
          .select("email, name, picture, expires_at, created_at")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({
            connected: !!tokenRow,
            email: tokenRow?.email ?? null,
            name: tokenRow?.name ?? null,
            picture: tokenRow?.picture ?? null,
            connectedAt: tokenRow?.created_at ?? null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...getCorsHeaders(req.headers.get("origin") || undefined), "Content-Type": "application/json" },
    });
  }
});
