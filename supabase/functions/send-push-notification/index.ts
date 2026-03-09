/**
 * send-push-notification — Edge Function
 *
 * Sends a push notification via Firebase Cloud Messaging (FCM).
 * Requires service-role key for authorization.
 *
 * Required Supabase Secret:
 *   FCM_SERVER_KEY=your-fcm-server-key
 *
 * Body: { token: string, title: string, body: string, data?: Record<string, string> }
 */

import { getCorsHeaders } from "../_shared/cors.ts";

const FCM_URL = "https://fcm.googleapis.com/fcm/send";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

interface PushRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require service-role key — push notifications are internal/server-side only
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!token || token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!FCM_SERVER_KEY) {
    console.error("[send-push-notification] FCM_SERVER_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Push notification service not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: PushRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { token: deviceToken, title, body: message, data } = body;

  if (!deviceToken || !title || !message) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: token, title, body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const fcmPayload = {
    to: deviceToken,
    notification: {
      title,
      body: message,
      sound: "default",
      badge: "1",
    },
    data: data ?? {},
    priority: "high",
    content_available: true,
  };

  const response = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      "Authorization": `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fcmPayload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[send-push-notification] FCM error ${response.status}:`, JSON.stringify(result));
    return new Response(
      JSON.stringify({ success: false, error: result.error ?? `HTTP ${response.status}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // FCM returns 200 even for invalid tokens — check the result body
  if (result.failure > 0) {
    const fcmError = result.results?.[0]?.error ?? "Unknown FCM error";
    console.error(`[send-push-notification] FCM delivery failure:`, fcmError);
    return new Response(
      JSON.stringify({ success: false, error: fcmError }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, messageId: result.results?.[0]?.message_id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
