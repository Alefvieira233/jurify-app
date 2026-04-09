/**
 * Google Calendar Edge Function — Calendar Operations + OAuth
 *
 * Calendar: listEvents, createEvent, updateEvent, deleteEvent, syncEvents
 * OAuth: initiateAuth, exchangeCode, disconnect, status
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { GoogleOAuthService } from "./google-oauth.ts";

const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

const OAUTH_METHODS = ["initiateAuth", "exchangeCode", "disconnect", "status"];
const CALENDAR_METHODS = ["listEvents", "createEvent", "updateEvent", "deleteEvent", "syncEvents"];

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

    // Auth user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const rateLimitCheck = await applyRateLimit(req, {
      maxRequests: 20,
      windowSeconds: 60,
      namespace: "google-calendar",
    }, { user, corsHeaders });
    if (!rateLimitCheck.allowed) return rateLimitCheck.response;

    const body = await req.json();
    const method = body.action || body.method;
    const data = body.data || {};

    // ── OAuth Methods ──
    if (OAUTH_METHODS.includes(method)) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      switch (method) {
        case "initiateAuth": {
          if (!clientId) {
            return new Response(
              JSON.stringify({ error: "Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos Supabase Secrets." }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const { redirectUri } = data as { redirectUri: string };
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: OAUTH_SCOPES,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            state: user.id,
          });
          return new Response(JSON.stringify({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "exchangeCode": {
          if (!clientId || !clientSecret) {
            return new Response(
              JSON.stringify({ error: "Google OAuth não configurado." }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const { code, redirectUri } = data as { code: string; redirectUri: string };
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code, client_id: clientId, client_secret: clientSecret,
              redirect_uri: redirectUri, grant_type: "authorization_code",
            }),
          });
          if (!tokenRes.ok) {
            const err = await tokenRes.json();
            throw new Error(`Token exchange failed: ${err.error_description || err.error}`);
          }
          const tokenData = await tokenRes.json();
          const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
          const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
          const { error: upsertError } = await supabase.from("google_calendar_tokens").upsert({
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
          const { error: delError } = await supabase.from("google_calendar_tokens").delete().eq("user_id", user.id);
          if (delError) throw new Error(`DB error: ${delError.message}`);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "status": {
          const { data: tokenRow } = await supabase.from("google_calendar_tokens")
            .select("email, name, picture, expires_at, created_at")
            .eq("user_id", user.id)
            .maybeSingle();
          return new Response(JSON.stringify({
            connected: !!tokenRow,
            email: tokenRow?.email ?? null,
            name: tokenRow?.name ?? null,
            picture: tokenRow?.picture ?? null,
            connectedAt: tokenRow?.created_at ?? null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // ── Calendar Methods ──
    if (CALENDAR_METHODS.includes(method)) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const googleService = new GoogleOAuthService(supabase, user.id);

      switch (method) {
        case "listEvents": {
          const { calendarId = "primary", timeMin, timeMax } = data;
          const events = await googleService.listEvents(calendarId, timeMin, timeMax);
          return new Response(JSON.stringify({ events }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        case "createEvent": {
          const { calendarId = "primary", eventData } = data;
          const event = await googleService.createEvent(calendarId, eventData);
          return new Response(JSON.stringify({ event }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        case "updateEvent": {
          const { calendarId = "primary", eventId, eventData } = data;
          const event = await googleService.updateEvent(calendarId, eventId, eventData);
          return new Response(JSON.stringify({ event }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        case "deleteEvent": {
          const { calendarId = "primary", eventId } = data;
          await googleService.deleteEvent(calendarId, eventId);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        case "syncEvents": {
          const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
          const { agendamentoId, googleEventId, action } = data;
          await supabaseService.from("google_calendar_sync_logs").insert({
            user_id: user.id,
            agendamento_id: agendamentoId,
            google_event_id: googleEventId,
            action,
            status: "success",
          });
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ error: `Unknown method: ${method}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[google-calendar] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get("origin") || undefined), "Content-Type": "application/json" },
    });
  }
});
