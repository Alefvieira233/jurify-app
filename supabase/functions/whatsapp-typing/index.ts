/**
 * ⌨️  WHATSAPP TYPING INDICATOR - Edge Function
 *
 * Mostra "digitando..." no celular do cliente. Útil quando IA está gerando
 * resposta (5-10s) ou enquanto humano digita resposta longa.
 *
 * Meta v24+ suporta typing via POST /messages com status: "read" e
 * typing_indicator: { type: "text" }. Indicator dura ~25s ou até a próxima
 * mensagem ser enviada.
 *
 * Body:
 *  - conversationId: id da conversation
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";

interface TypingRequest {
  conversationId: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rl = await applyRateLimit(req, { maxRequests: 60, windowSeconds: 60, namespace: "wa-typing" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as TypingRequest;
    if (!body.conversationId) throw new Error("conversationId obrigatório");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    // Pega último provider_message_id inbound — typing precisa anchored numa msg
    const { data: lastInbound } = await supabase
      .from("whatsapp_messages")
      .select("provider_message_id")
      .eq("conversation_id", body.conversationId)
      .eq("tenant_id", tenantId)
      .or("direction.eq.inbound,sender.in.(user,lead,cliente)")
      .not("provider_message_id", "is", null)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    const messageId = (lastInbound as { provider_message_id?: string } | null)?.provider_message_id;
    if (!messageId) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_inbound_msg" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_kapso" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Meta typing API (v24+): combinar com mark-as-read
    const res = await kapsoFetchWithKey(
      kapso.apiKey,
      `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          typing_indicator: { type: "text" },
        }),
      },
      kapso.apiUrl,
    );

    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[whatsapp-typing] HTTP ${res.status}:`, txt.slice(0, 200));
      // Failure here is non-critical — não erra o usuário
      return new Response(JSON.stringify({ success: false, error: "typing_failed", upstream_status: res.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    return new Response(JSON.stringify({ success: true, anchored_to: messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[whatsapp-typing] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("obrigatório") ? 400 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
