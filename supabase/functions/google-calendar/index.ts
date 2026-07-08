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
import { isServiceRole } from "../_shared/supabase-client.ts";
import { GoogleOAuthService } from "./google-oauth.ts";

// Least-privilege OAuth scopes.
// calendar.events: read/write events only (no access to calendar list or settings).
// userinfo.email/profile: to show connected account name and email in UI.
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

const OAUTH_METHODS = ["initiateAuth", "exchangeCode", "disconnect", "status"];
const CALENDAR_METHODS = ["listEvents", "createEvent", "updateEvent", "deleteEvent", "syncEvents", "checkAvailability", "suggestSlots"];
// Service-role only methods (called via supabase.functions.invoke from edge functions
// that already authenticated their own caller — no end-user JWT context).
const SERVICE_METHODS = [
  "createEventForResponsavel",
  "checkAvailabilityForResponsavel",
  "suggestSlotsForResponsavel",
  "updateEventForResponsavel",
  "deleteEventForResponsavel",
];

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
      // Authentication is explicitly verified via isServiceRole(req).
      if (!isServiceRole(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized: Service role required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(supabaseUrlEarly, supabaseServiceKeyEarly);
      const data = (parsedBody?.data ?? {}) as Record<string, unknown>;

      if (earlyMethod === "createEventForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const tenantId = data.tenantId as string | undefined;
        const agendamentoId = data.agendamentoId as string | undefined;
        const eventData = data.eventData as Record<string, unknown> | undefined;
        const createMeetLink = data.createMeetLink === true;
        const attendeeEmails = (data.attendeeEmails as string[] | undefined) ?? [];

        if (!responsavelId || !tenantId || !agendamentoId || !eventData) {
          return new Response(
            JSON.stringify({ error: "Missing responsavelId, tenantId, agendamentoId, or eventData" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: tokenRow } = await supabase
          .from("google_calendar_tokens").select("user_id").eq("user_id", responsavelId).maybeSingle();
        if (!tokenRow) {
          return new Response(
            JSON.stringify({ error: "Responsavel has no Google Calendar connected" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Enrich event with attendees + Meet conference + reminders
        const enriched: Record<string, unknown> = { ...eventData };
        if (attendeeEmails.length > 0) {
          enriched.attendees = attendeeEmails
            .filter((e) => typeof e === "string" && e.includes("@"))
            .map((email) => ({ email }));
        }
        if (createMeetLink) {
          enriched.conferenceData = {
            createRequest: {
              requestId: `meet-${agendamentoId}-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          };
        }
        if (!enriched.reminders) {
          enriched.reminders = {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 60 },
            ],
          };
        }

        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          const event = await googleService.createEvent("primary", enriched, createMeetLink);
          await supabase.from("google_calendar_sync_logs").insert({
            user_id: responsavelId, agendamento_id: agendamentoId, google_event_id: event.id ?? null, action: "create", status: "success",
          });
          return new Response(JSON.stringify({ event }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await supabase.from("google_calendar_sync_logs").insert({
            user_id: responsavelId, agendamento_id: agendamentoId, google_event_id: null, action: "create", status: "error", error_message: message,
          });
          return new Response(JSON.stringify({ error: message }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (earlyMethod === "checkAvailabilityForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const timeMin = data.timeMin as string | undefined;
        const timeMax = data.timeMax as string | undefined;
        if (!responsavelId || !timeMin || !timeMax) {
          return new Response(JSON.stringify({ error: "Missing responsavelId, timeMin, or timeMax" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: tokenRow } = await supabase.from("google_calendar_tokens").select("user_id").eq("user_id", responsavelId).maybeSingle();
        if (!tokenRow) {
          return new Response(JSON.stringify({ busy: [], connected: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          const busy = await googleService.queryFreeBusy("primary", timeMin, timeMax);
          return new Response(JSON.stringify({ busy, connected: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ busy: [], connected: true, error: err instanceof Error ? err.message : String(err) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (earlyMethod === "suggestSlotsForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const fromISO = data.from as string | undefined;
        const daysToScan = (data.daysToScan as number | undefined) ?? 7;
        const slotMinutes = (data.slotMinutes as number | undefined) ?? 60;
        const count = (data.count as number | undefined) ?? 3;
        if (!responsavelId || !fromISO) {
          return new Response(JSON.stringify({ error: "Missing responsavelId or from" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: tokenRow } = await supabase.from("google_calendar_tokens").select("user_id").eq("user_id", responsavelId).maybeSingle();
        if (!tokenRow) {
          return new Response(JSON.stringify({ slots: [], connected: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          const slots = await googleService.suggestFreeSlots("primary", new Date(fromISO), daysToScan, slotMinutes, count);
          return new Response(JSON.stringify({ slots, connected: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ slots: [], connected: true, error: err instanceof Error ? err.message : String(err) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (earlyMethod === "updateEventForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const eventId = data.eventId as string | undefined;
        const eventData = data.eventData as Record<string, unknown> | undefined;
        if (!responsavelId || !eventId || !eventData) {
          return new Response(JSON.stringify({ error: "Missing responsavelId, eventId, or eventData" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          const event = await googleService.updateEvent("primary", eventId, eventData);
          return new Response(JSON.stringify({ event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (earlyMethod === "deleteEventForResponsavel") {
        const responsavelId = data.responsavelId as string | undefined;
        const eventId = data.eventId as string | undefined;
        if (!responsavelId || !eventId) {
          return new Response(JSON.stringify({ error: "Missing responsavelId or eventId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const googleService = new GoogleOAuthService(supabase, responsavelId);
        try {
          await googleService.deleteEvent("primary", eventId);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

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
          // CSRF binding correto (2026-05-07): state crypto-random é gerado server-side
          // e persistido em oauth_pending_states com user_id binding. exchangeCode
          // consome (single-use) e valida user_id == auth.uid().
          const { data: stateResult, error: stateErr } = await supabase.rpc("create_oauth_pending_state", {
            _user_id: user.id,
            _provider: "google",
            _redirect_uri: redirectUri,
            _scope: OAUTH_SCOPES,
            _metadata: { source: "google-calendar-edge-function" },
            _ttl_seconds: 600,
          });
          if (stateErr || !stateResult) {
            return new Response(
              JSON.stringify({ error: `Failed to create OAuth state binding: ${stateErr?.message ?? "unknown"}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const effectiveState = stateResult as string;
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: OAUTH_SCOPES,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            state: effectiveState,
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
          const { code, redirectUri, state } = data as { code: string; redirectUri: string; state?: string };

          // CSRF binding check (2026-05-07): exige state crypto-random emitido
          // pelo initiateAuth. Single-use, vincula ao user_id e ao redirect_uri.
          if (!state || typeof state !== "string") {
            return new Response(
              JSON.stringify({ error: "Missing OAuth state — possible CSRF attempt" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const { data: stateRows, error: stateErr } = await supabase.rpc("consume_oauth_pending_state", {
            _state: state,
            _provider: "google",
          });
          const stateRow = (stateRows as Array<{ user_id: string | null; redirect_uri: string | null; valid: boolean; reason: string | null }> | null)?.[0];
          if (stateErr || !stateRow || !stateRow.valid) {
            return new Response(
              JSON.stringify({ error: `OAuth state invalid: ${stateRow?.reason ?? stateErr?.message ?? "unknown"}` }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (stateRow.user_id !== user.id) {
            return new Response(
              JSON.stringify({ error: "OAuth state user mismatch — possible CSRF/account fixation attempt" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (stateRow.redirect_uri !== redirectUri) {
            return new Response(
              JSON.stringify({ error: "OAuth redirect_uri mismatch" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

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
    // Mask error details for client security
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get("origin") || undefined), "Content-Type": "application/json" },
    });
  }
});
