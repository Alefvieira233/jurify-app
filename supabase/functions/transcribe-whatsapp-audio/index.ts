/**
 * 🎙️ TRANSCRIBE WHATSAPP AUDIO - Edge Function
 *
 * Transcreve áudio recebido via WhatsApp usando OpenAI Whisper.
 * Chamado fire-and-forget pelo webhook após persistir mensagem com
 * message_type='audio' e media_url. Atualiza content da mensagem com
 * o texto transcrito + metadata.transcription.
 *
 * Body:
 *  - messageId: uuid em whatsapp_messages
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isServiceRole } from "../_shared/supabase-client.ts";
import { checkTrialAccess, trialBlockedResponse } from "../_shared/trial-gate.ts";

interface Request { messageId: string; }

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper limit

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Security: service-role only access (internal function)
  if (!isServiceRole(req)) {
    console.warn("[transcribe] Unauthorized access attempt");
    return new Response(JSON.stringify({ error: "Unauthorized: Service-role only" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
      .select("id, content, message_type, media_url, sender, conversation_id, tenant_id, metadata")
      .eq("id", body.messageId)
      .maybeSingle();

    if (!msg) throw new Error("Mensagem não encontrada");
    const m = msg as { content: string | null; message_type: string | null; media_url: string | null; sender: string; metadata: Record<string, unknown> | null };

    if (m.message_type !== "audio") {
      return new Response(JSON.stringify({ success: true, skipped: "not_audio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (m.sender !== "lead" && m.sender !== "user" && m.sender !== "cliente") {
      return new Response(JSON.stringify({ success: true, skipped: "outbound_audio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (m.metadata && (m.metadata as { transcription?: unknown }).transcription) {
      return new Response(JSON.stringify({ success: true, skipped: "already_transcribed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (!m.media_url) throw new Error("media_url ausente");

    // 🚫 TRIAL GATE — E1.1 (auditoria 2026-05-25). Whisper consome créditos OpenAI.
    const tenantId = (msg as { tenant_id?: string | null }).tenant_id;
    if (tenantId) {
      const gate = await checkTrialAccess(supabase, tenantId, "ai_responder");
      if (!gate.allowed) {
        console.log(`🔒 [trial-gate] tenant ${tenantId} bloqueado para transcribe (${gate.reason})`);
        return trialBlockedResponse(gate.reason || "trial_expired", corsHeaders);
      }
    }

    // Download áudio
    const audioRes = await fetch(m.media_url, { signal: AbortSignal.timeout(20_000) });
    if (!audioRes.ok) throw new Error(`Falha ao baixar áudio (HTTP ${audioRes.status})`);
    const contentLength = Number(audioRes.headers.get("content-length") || 0);
    if (contentLength > MAX_AUDIO_BYTES) throw new Error("Áudio maior que 25MB");

    const audioBlob = await audioRes.blob();
    if (audioBlob.size > MAX_AUDIO_BYTES) throw new Error("Áudio maior que 25MB");

    // Whisper API
    const form = new FormData();
    form.append("file", audioBlob, "audio.ogg");
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "json");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      console.error(`[transcribe] Whisper HTTP ${whisperRes.status}:`, errBody.slice(0, 300));
      throw new Error("Whisper falhou");
    }

    const data = await whisperRes.json() as { text?: string };
    const transcription = (data.text || "").trim();
    if (!transcription) throw new Error("Whisper retornou vazio");

    // Atualiza mensagem: prepend transcrição ao content + metadata
    const newContent = `🎙️ ${transcription}`;
    const newMetadata = {
      ...(m.metadata || {}),
      transcription,
      transcribed_at: new Date().toISOString(),
      transcribed_by: "whisper-1",
    };

    await supabase
      .from("whatsapp_messages")
      .update({ content: newContent, metadata: newMetadata })
      .eq("id", body.messageId);

    return new Response(JSON.stringify({
      success: true,
      transcription,
      length: transcription.length,
      audio_bytes: audioBlob.size,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[transcribe-whatsapp-audio] error:", err);
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
