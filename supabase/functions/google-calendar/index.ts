/**
 * Google Calendar Edge Function — Calendar Operations + OAuth
 *
 * Calendar: listEvents, createEvent, updateEvent, deleteEvent, syncEvents
 * OAuth: initiateAuth, exchangeCode, disconnect, status
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { encrypt } from "../_shared/crypto.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { GoogleOAuthService } from "./google-oauth.ts";

// Least-privilege OAuth scopes.
// calendar.events: read/write events only (no access to calendar list or settings).
// userinfo.email/profile: to show connected account name and email in UI.
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

const OAUTH_METHODS = ["initiateAuth", "exchangeCode", "refresh_token", "disconnect", "status"];
const CALENDAR_METHODS = ["listEvents", "createEvent", "updateEvent", "deleteEvent", "syncEvents"];
// Service-role only methods (called via supabase.functions.invoke from edge functions
// that already authenticated their own caller — no end-user JWT context).
const SERVICE_METHODS = ["createEventForResponsavel"];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Peek body to detect service-mode method first (skip user auth for these).
    // Body is consumed once, so we re-use the parsed copy below.
    const supabaseUrlEarly = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKeyEarly = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let parsedBody: { action?: string; method?: string; data?: Record<string, unknown> } | null = null;
    try {
      parsedBody = await req.clone().json();
    } catch { /* will fail later in the user-auth path naturally */ }

    const earlyMethod = parsedBody?.action || parsedBody?.method;

    if (earlyMethod && SERVICE_METHODS.includes(earlyMethod)) {
      // SERVICE-ROLE mode: caller is another edge function (whatsapp-webhook).
      // Authentication is verified by the platform via the function-to-function
      // invoke contract. We DO NOT consult auth.getUser here — there's no end user.
      const supabase = createClient(supabaseUrlEarly, supabaseServiceKeyEarly);
      const data = (parsedBody?.data ?? {}) as Record<string, unknown>;

      if (earlyMethod === "createEventForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const tenantId = data.tenantId as string | undefined;
        const agendamentoId = data.agendamentoId as string | undefined;
        const eventData = data.eventData as Record<string, unknown> | undefined;

        if (!responsavelId || !tenantId || !agendamentoId || !eventData) {
          return createErrorResponse("Missing responsavelId, tenantId, agendamentoId, or eventData", 400, corsHeaders, "Dados incompletos.");
        }

        // Verify token row exists for this responsavel
        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens")
          .select("user_id")
          .eq("user_id", responsavelId)
          .maybeSingle();
        if (!tokenRow) {
          return createErrorResponse("Responsavel has no Google Calendar connected", 404, corsHeaders, "Agenda não conectada.");
        }

        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          const event = await googleService.createEvent("primary", eventData);
          // Best-effort sync log (mirrors syncEvents behavior).
          await supabase.from("google_calendar_sync_logs").insert({
            user_id: responsavelId,
            agendamento_id: agendamentoId,
            google_event_id: event.id ?? null,
            action: "create",
            status: "success",
          });
          return new Response(JSON.stringify({ event }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await supabase.from("google_calendar_sync_logs").insert({
            user_id: responsavelId,
            agendamento_id: agendamentoId,
            google_event_id: null,
            action: "create",
            status: "error",
            error_message: message,
          });
          return createErrorResponse(err, 502, corsHeaders);
        }
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization", 401, corsHeaders, "Não autorizado.");
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
      return createErrorResponse(authError || "Unauthorized", 401, corsHeaders, "Sessão expirada.");
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
            return createErrorResponse(
              "Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos Supabase Secrets.",
              503,
              corsHeaders,
              "Serviço de agenda indisponível."
            );
          }
          const { redirectUri, state } = data as { redirectUri: string; state?: string };
          // CSRF protection: client must provide a crypto-random state, store it
          // locally, and validate it matches on callback. Falling back to user.id
          // is insecure because user.id is predictable.
          if (!state || typeof state !== "string" || state.length < 16) {
            return createErrorResponse(
              "Missing or weak OAuth state. Provide a crypto-random string ≥16 chars.",
              400,
              corsHeaders,
              "Estado de autenticação inválido."
            );
          }
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: OAUTH_SCOPES,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            state,
          });
          return new Response(JSON.stringify({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "exchangeCode": {
          if (!clientId || !clientSecret) {
            return createErrorResponse("Google OAuth não configurado.", 503, corsHeaders, "Serviço indisponível.");
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

          // Encrypt OAuth tokens before persisting. The plaintext columns were dropped
          // by migration 20260406000002; only the *_encrypted columns exist.
          const accessTokenEncrypted = await encrypt(tokenData.access_token);
          const refreshTokenEncrypted = tokenData.refresh_token
            ? await encrypt(tokenData.refresh_token)
            : null;

          const { error: upsertError } = await supabase.from("google_calendar_tokens").upsert({
            user_id: user.id,
            access_token_encrypted: accessTokenEncrypted,
            refresh_token_encrypted: refreshTokenEncrypted,
            expires_at: expiresAt,
            scope: tokenData.scope,
            token_type: tokenData.token_type,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          }, { onConflict: "user_id" });
          if (upsertError) throw upsertError;
          return new Response(
            JSON.stringify({ success: true, email: userInfo.email, name: userInfo.name }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        case "refresh_token": {
          const googleService = new GoogleOAuthService(supabase, user.id);
          // getValidToken automatically refreshes if expired
          await googleService.getValidToken();
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "disconnect": {
          const { error: delError } = await supabase.from("google_calendar_tokens").delete().eq("user_id", user.id);
          if (delError) throw delError;
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

    return createErrorResponse(`Unknown method: ${method}`, 400, corsHeaders, "Operação inválida.");

  } catch (error) {
    return createErrorResponse(error, 500, getCorsHeaders(req.headers.get("origin") || undefined));
  }
});
