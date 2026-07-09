/**
 * 🧠 SUMMARIZE WHATSAPP CONVERSATION - Edge Function
 *
 * Gera resumo da conversa via OpenAI (gpt-4o-mini). Cacheia em
 * whatsapp_conversation_summaries pra reduzir custo.
 *
 * Body:
 *  - conversationId: uuid da conversation
 *  - forceRefresh?: ignora cache e regenera
 *
 * Returns: { summary, cached, message_count, generated_at }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface Request {
  conversationId: string;
  forceRefresh?: boolean;
}

interface MessageRow {
  id: string;
  sender: string;
  content: string | null;
  timestamp: string;
}

const SYSTEM_PROMPT = `Você é um assistente jurídico que resume conversas WhatsApp de escritórios de advocacia.

Estruture o resumo em 5 pontos curtos (máx 2 linhas cada):
1. **Cliente:** quem é (nome, área de interesse)
2. **Pedido principal:** qual é a demanda jurídica
3. **Pontos discutidos:** principais tópicos abordados
4. **Decisões/acordos:** o que foi decidido até agora
5. **Próximos passos:** pendências e ações em aberto

Use linguagem profissional jurídica em português. Não invente fatos. Se algum item não tem info, escreva "Não mencionado".`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const isServiceRoleRequest = isServiceRole(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let user: { id: string; email?: string } | null = null;

    if (!isServiceRoleRequest) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authenticatedUser }, error: authError } = await supabaseAuth.auth.getUser(token);
      if (authError || !authenticatedUser) throw new Error("Unauthorized");
      user = authenticatedUser;
    }
    const rl = await applyRateLimit(req, { maxRequests: 20, windowSeconds: 60, namespace: "wa-summarize" }, { supabase, user: user ?? { id: "service-role" }, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as Request;
    if (!body.conversationId) throw new Error("conversationId obrigatório");

    let tenantId: string | null = null;

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      tenantId = (profile as { tenant_id?: string } | null)?.tenant_id ?? null;
    } else {
      // For service role, we should probably get tenantId from the conversation itself
      const { data: convTenant } = await supabase.from("whatsapp_conversations").select("tenant_id").eq("id", body.conversationId).maybeSingle();
      tenantId = convTenant?.tenant_id ?? null;
    }

    if (!tenantId) throw new Error("Tenant não encontrado");

    // 🚫 TRIAL GATE — bloqueia uso de IA outbound se trial expirado.
    // E1.1 (auditoria 2026-05-25): faltava gate em 4 funcs IA.
    const gate = await checkTrialAccess(supabase, tenantId, "ai_responder");
    if (!gate.allowed) {
      console.log(`🔒 [trial-gate] tenant ${tenantId} bloqueado para summarize (${gate.reason})`);
      return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);
    }

    // Verifica conversation existe e pertence ao tenant
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("id, contact_name, phone_number, area_juridica")
      .eq("id", body.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    // Conta mensagens atuais
    const { count: msgCount } = await supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", body.conversationId)
      .eq("tenant_id", tenantId);

    const messageCount = msgCount ?? 0;

    // Cache hit se mesma conta de mensagens E não force refresh
    if (!body.forceRefresh) {
      const { data: cached } = await supabase
        .from("whatsapp_conversation_summaries")
        .select("summary, message_count, generated_at, generated_by")
        .eq("conversation_id", body.conversationId)
        .maybeSingle();
      if (cached && (cached as { message_count: number }).message_count === messageCount) {
        return new Response(JSON.stringify({
          success: true,
          cached: true,
          summary: (cached as { summary: string }).summary,
          message_count: messageCount,
          generated_at: (cached as { generated_at: string }).generated_at,
          generated_by: (cached as { generated_by: string }).generated_by,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    if (messageCount === 0) {
      return new Response(JSON.stringify({ success: false, error: "Conversa sem mensagens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 });
    }

    // Pega últimas 100 mensagens (ordem cronológica)
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("id, sender, content, timestamp")
      .eq("conversation_id", body.conversationId)
      .eq("tenant_id", tenantId)
      .order("timestamp", { ascending: false })
      .limit(100);

    const messages = ((msgs as MessageRow[]) || []).reverse();
    const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

    const transcript = messages
      .map(m => {
        const who = m.sender === "lead" || m.sender === "user" || m.sender === "cliente" ? "Cliente" : m.sender === "ia" ? "IA" : "Advogado";
        return `[${who}]: ${(m.content || "").slice(0, 500)}`;
      })
      .join("\n");

    const userPrompt = `Conversa com ${conv.contact_name || conv.phone_number}${conv.area_juridica ? ` (${conv.area_juridica})` : ""}:\n\n${transcript}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error(`[summarize] OpenAI HTTP ${openaiRes.status}:`, errBody.slice(0, 400));
      throw new Error("Falha ao gerar resumo. Tente novamente.");
    }

    const oa = await openaiRes.json();
    const summary = oa?.choices?.[0]?.message?.content?.trim();
    const tokensUsed = oa?.usage?.total_tokens ?? null;
    if (!summary) throw new Error("OpenAI retornou resposta vazia");

    // Cache: upsert
    await supabase.from("whatsapp_conversation_summaries")
      .upsert({
        conversation_id: body.conversationId,
        tenant_id: tenantId,
        summary,
        message_count: messageCount,
        last_message_id: lastMessageId,
        generated_by: "gpt-4o-mini",
        generated_at: new Date().toISOString(),
        tokens_used: tokensUsed,
      }, { onConflict: "conversation_id" });

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      summary,
      message_count: messageCount,
      generated_at: new Date().toISOString(),
      generated_by: "gpt-4o-mini",
      tokens_used: tokensUsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[summarize-whatsapp] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatório") || msg.includes("não encontrada") || msg.includes("sem mensagens") ? 400
                 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
