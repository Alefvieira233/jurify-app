/**
 * 👁️  WHATSAPP MARK AS READ - Edge Function
 *
 * Marca mensagens como lidas na Meta WhatsApp Cloud API. Cliente vê o ✓✓
 * azul (read receipt) no celular dele. Sem isso, o WhatsApp do cliente
 * mostra apenas ✓✓ cinza (delivered) eternamente, mesmo após o advogado ler.
 *
 * Body:
 *  - conversationId: id da conversation
 *  - messageIds?: array de provider_message_id específicos. Se omitido,
 *    marca todas as mensagens inbound não-lidas dessa conversation.
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";

interface MarkReadRequest {
  conversationId: string;
  messageIds?: string[];
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

    // Higher rate limit — frontend chama em todo abrir de conversation
    const rl = await applyRateLimit(req, { maxRequests: 120, windowSeconds: 60, namespace: "wa-mark-read" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as MarkReadRequest;
    if (!body.conversationId) throw new Error("conversationId obrigatório");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) {
      // Sem WA configurado, não há o que marcar — sucesso silencioso
      return new Response(JSON.stringify({ success: true, marked: 0, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Resolver lista de provider_message_ids inbound não lidos
    let messageIds: string[];
    if (body.messageIds && body.messageIds.length > 0) {
      messageIds = body.messageIds;
    } else {
      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("provider_message_id")
        .eq("conversation_id", body.conversationId)
        .eq("tenant_id", tenantId)
        .or("direction.eq.inbound,sender.in.(user,lead,cliente)")
        .eq("read", false)
        .not("provider_message_id", "is", null)
        .limit(50);
      messageIds = ((msgs || []) as Array<{ provider_message_id: string | null }>)
        .map(m => m.provider_message_id)
        .filter((id): id is string => !!id);
    }

    if (messageIds.length === 0) {
      return new Response(JSON.stringify({ success: true, marked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Meta cobra: 1 chamada POST /messages por mensagem com status: "read"
    let marked = 0;
    let failed = 0;
    for (const id of messageIds) {
      try {
        const res = await kapsoFetchWithKey(
          kapso.apiKey,
          `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              messaging_product: "whatsapp",
              status: "read",
              message_id: id,
            }),
          },
          kapso.apiUrl,
        );
        if (res.ok) marked++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, marked, failed, total: messageIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[whatsapp-mark-read] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("obrigatório") ? 400 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
