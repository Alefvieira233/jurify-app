/**
 * 💡 SUGGEST WHATSAPP REPLY - Edge Function
 *
 * Gera 3 sugestões contextuais de resposta para o advogado via gpt-4o-mini.
 * Cada sugestão tem um tom diferente (objetiva, empática, esclarecedora).
 *
 * Body:
 *  - conversationId: uuid
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface Request { conversationId: string; }

const SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          tone: { type: "string", enum: ["objetiva", "empatica", "esclarecedora"] },
          text: { type: "string", description: "Resposta sugerida (max 280 chars, sem aspas)" },
        },
        required: ["tone", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

const SYSTEM = `Você assiste advogados em escritório jurídico respondendo clientes via WhatsApp.

Gere EXATAMENTE 3 sugestões de resposta com tons diferentes:
1. **objetiva**: direta, prática, max 200 chars. Resolve a dúvida ou indica próximo passo.
2. **empatica**: acolhedora, profissional, valida sentimento do cliente. Útil quando frustrado/ansioso.
3. **esclarecedora**: faz uma pergunta de qualificação para entender melhor o caso antes de responder.

Regras inegociáveis:
- NUNCA invente dados, prazos, valores, jurisprudência.
- NUNCA dê conselho jurídico definitivo via WhatsApp ("você vai ganhar", "tem direito a X reais").
- Se a dúvida exige análise técnica, sugira agendar consulta presencial/vídeo.
- Use linguagem ACESSÍVEL — cliente não é advogado.
- Português BR, primeira pessoa do plural ("Vamos verificar...", "Podemos te ajudar...").
- Sem emojis excessivos (1 max por sugestão).
- Sem aspas no início/fim.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const rl = await applyRateLimit(req, { maxRequests: 30, windowSeconds: 60, namespace: "wa-suggest" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as Request;
    if (!body.conversationId) throw new Error("conversationId obrigatório");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    // Trial gate — sugestão usa IA
    const gate = await checkTrialAccess(supabase, tenantId, "ai_responder");
    if (!gate.allowed) return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);

    // Carrega conversa + últimas mensagens (limitado)
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name, area_juridica, current_urgency")
      .eq("id", body.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("sender, content, message_type, timestamp")
      .eq("conversation_id", body.conversationId)
      .eq("tenant_id", tenantId)
      .order("timestamp", { ascending: false })
      .limit(30);

    if (!msgs || msgs.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Conversa sem mensagens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 });
    }

    const transcript = ((msgs as Array<{ sender: string; content: string | null; message_type: string | null }>) || [])
      .reverse()
      .filter(m => m.content || m.message_type !== "text")
      .map(m => {
        const who = m.sender === "lead" || m.sender === "user" || m.sender === "cliente" ? "Cliente" : m.sender === "ia" ? "IA" : "Advogado";
        const content = m.content || `[${m.message_type ?? "mídia"}]`;
        return `[${who}]: ${content.slice(0, 400)}`;
      })
      .join("\n");

    const ctx = [
      conv.contact_name ? `Cliente: ${conv.contact_name}` : null,
      conv.area_juridica ? `Área: ${conv.area_juridica}` : null,
      conv.current_urgency && conv.current_urgency !== "baixa" ? `Urgência detectada: ${conv.current_urgency}` : null,
    ].filter(Boolean).join(" · ");

    const userPrompt = `${ctx ? ctx + "\n\n" : ""}Conversa recente:\n${transcript}\n\nGere 3 sugestões para o advogado responder agora.`;

    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: { name: "suggest_replies", description: "Retorna 3 sugestões de resposta", parameters: SCHEMA },
        }],
        tool_choice: { type: "function", function: { name: "suggest_replies" } },
        max_tokens: 600,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!oa.ok) {
      const errBody = await oa.text();
      console.error(`[suggest-reply] OpenAI HTTP ${oa.status}:`, errBody.slice(0, 300));
      throw new Error("Falha OpenAI");
    }

    const data = await oa.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("OpenAI não retornou sugestões");

    let parsed: { suggestions: Array<{ tone: string; text: string }> };
    try { parsed = JSON.parse(args); } catch { throw new Error("Parse falhou"); }

    return new Response(JSON.stringify({
      success: true,
      suggestions: parsed.suggestions,
      tokens_used: data?.usage?.total_tokens ?? null,
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[suggest-whatsapp-reply] error:", err);
    const msg = err instanceof Error ? err.message : "Erro";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatório") || msg.includes("não encontrada") || msg.includes("sem mensagens") ? 400
                 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
