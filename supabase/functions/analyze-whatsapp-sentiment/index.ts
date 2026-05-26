/**
 * 🎭 ANALYZE WHATSAPP SENTIMENT - Edge Function
 *
 * Analisa sentimento + urgência de uma mensagem inbound via gpt-4o-mini.
 * Chamado fire-and-forget pelo whatsapp-webhook após persistir a msg.
 *
 * Body:
 *  - messageId: uuid da mensagem em whatsapp_messages
 *
 * Atualiza whatsapp_messages.sentiment + urgency. Trigger DB propaga
 * pro current_urgency da conversa.
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface Request { messageId: string; }

const SCHEMA = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["positivo", "neutro", "negativo", "frustrado", "urgente"],
      description: "Sentimento dominante da mensagem",
    },
    urgency: {
      type: "string",
      enum: ["baixa", "media", "alta", "critica"],
      description: "Urgência inferida do tom e conteúdo",
    },
    rationale: { type: "string", description: "Justificativa curta (max 80 chars)" },
  },
  required: ["sentiment", "urgency"],
  additionalProperties: false,
};

const SYSTEM = `Você analisa mensagens de clientes em escritórios jurídicos.

Classifique:
- sentiment: positivo (agradecendo, calmo) | neutro (informativo) | negativo (reclamando) | frustrado (impaciente, repetitivo) | urgente (pedindo ação imediata)
- urgency: baixa (consulta geral) | media (precisa resposta dia útil) | alta (audiência amanhã, prazo curto) | critica (citações tipo "preso", "hospital", "morte", "urgente urgente")

Use JULGAMENTO. Frases tipo "audiência amanhã" = alta. "Preciso URGENTEMENTE" = alta. "vai dar tempo?" = media. Threats/desespero = critica.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as Request;
    if (!body.messageId) throw new Error("messageId obrigatório");

    const { data: msg } = await supabase
      .from("whatsapp_messages")
      .select("id, content, sender, conversation_id, tenant_id, sentiment_analyzed_at")
      .eq("id", body.messageId)
      .maybeSingle();

    if (!msg) throw new Error("Mensagem não encontrada");
    if ((msg as { sender: string }).sender !== "lead" && (msg as { sender: string }).sender !== "user") {
      return new Response(JSON.stringify({ success: true, skipped: "outbound_message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if ((msg as { sentiment_analyzed_at?: string | null }).sentiment_analyzed_at) {
      return new Response(JSON.stringify({ success: true, skipped: "already_analyzed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 🚫 TRIAL GATE — E1.1 (auditoria 2026-05-25). Função é fire-and-forget do
    // webhook, mas evitar consumo de OpenAI em tenants com trial expirado.
    const tenantId = (msg as { tenant_id?: string | null }).tenant_id;
    if (tenantId) {
      const gate = await checkTrialAccess(supabase, tenantId, "ai_responder");
      if (!gate.allowed) {
        console.log(`🔒 [trial-gate] tenant ${tenantId} bloqueado para sentiment (${gate.reason})`);
        return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);
      }
    }

    const content = ((msg as { content: string }).content || "").trim();
    if (!content || content.length < 3) {
      return new Response(JSON.stringify({ success: true, skipped: "empty_content" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: content.slice(0, 1500) },
        ],
        tools: [{
          type: "function",
          function: { name: "classify", description: "Classifica sentimento + urgência", parameters: SCHEMA },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
        max_tokens: 120,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!oa.ok) {
      const errBody = await oa.text();
      console.error(`[sentiment] OpenAI HTTP ${oa.status}:`, errBody.slice(0, 200));
      throw new Error("Falha OpenAI");
    }

    const data = await oa.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("OpenAI sem function call");

    let parsed: { sentiment: string; urgency: string; rationale?: string };
    try { parsed = JSON.parse(args); } catch { throw new Error("Parse falhou"); }

    await supabase
      .from("whatsapp_messages")
      .update({
        sentiment: parsed.sentiment,
        urgency: parsed.urgency,
        sentiment_analyzed_at: new Date().toISOString(),
      })
      .eq("id", body.messageId);

    return new Response(JSON.stringify({
      success: true,
      sentiment: parsed.sentiment,
      urgency: parsed.urgency,
      rationale: parsed.rationale,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[analyze-whatsapp-sentiment] error:", err);
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
