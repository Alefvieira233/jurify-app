import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createEdgeLogger } from "../_shared/logger.ts";

const log = createEdgeLogger("process-followup-queue");

interface QueueItem {
  id: string;
  tenant_id: string;
  sequence_id: string;
  lead_id: string;
  step_index: number;
  channel: "whatsapp" | "email";
  message_template: string;
  subject: string | null;
  status: string;
  scheduled_at: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth gate: require service-role key (this is a cron/internal function)
  const authHeader = req.headers.get("Authorization");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader?.replace("Bearer ", "") ?? "";

  if (!supabaseServiceKey || token !== supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  let processed = 0;
  let failed = 0;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending items whose scheduled_at has passed
    const now = new Date().toISOString();
    const { data: pendingItems, error: fetchError } = await supabaseAdmin
      .from("crm_followup_queue")
      .select("id,tenant_id,sequence_id,lead_id,step_index,channel,message_template,subject,status,scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, message: "No pending items" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info(`Processing ${pendingItems.length} follow-up items`);

    for (const item of pendingItems as QueueItem[]) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from("crm_followup_queue")
          .update({ status: "processing" })
          .eq("id", item.id);

        // Get lead info for message personalization
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("nome,telefone,email,tenant_id")
          .eq("id", item.lead_id)
          .eq("tenant_id", item.tenant_id)
          .single();

        if (!lead) {
          throw new Error(`Lead ${item.lead_id} not found`);
        }

        // Personalize the template
        const personalizedMessage = item.message_template
          .replace(/\{\{nome\}\}/g, lead.nome || "Cliente")
          .replace(/\{\{telefone\}\}/g, lead.telefone || "")
          .replace(/\{\{email\}\}/g, lead.email || "");

        if (item.channel === "whatsapp" && lead.telefone) {
          // Send via WhatsApp edge function
          const { error: sendError } = await supabaseAdmin.functions.invoke(
            "send-whatsapp-message",
            {
              body: {
                to: lead.telefone,
                text: personalizedMessage,
                tenant_id: item.tenant_id,
              },
            }
          );

          if (sendError) throw sendError;
        } else if (item.channel === "email" && lead.email) {
          // For email, log for now (email provider integration would go here)
          log.info(`Email queued for ${lead.email}`, {
            subject: item.subject,
            leadId: item.lead_id,
          });
        } else {
          log.warn(`No ${item.channel} contact for lead ${item.lead_id}`);
        }

        // Mark as completed
        await supabaseAdmin
          .from("crm_followup_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", item.id);

        processed++;
      } catch (itemError) {
        log.error(`Failed to process item ${item.id}`, itemError);

        // Mark as failed
        await supabaseAdmin
          .from("crm_followup_queue")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            error_message: itemError instanceof Error ? itemError.message : "Unknown error",
          })
          .eq("id", item.id);

        failed++;
      }
    }

    // Update sequence completion counts
    const sequenceIds = [...new Set((pendingItems as QueueItem[]).map((i) => i.sequence_id))];
    for (const seqId of sequenceIds) {
      const completedCount = (pendingItems as QueueItem[]).filter(
        (i) => i.sequence_id === seqId
      ).length;

      // Increment total_completed
      const { data: seq } = await supabaseAdmin
        .from("crm_followup_sequences")
        .select("total_completed")
        .eq("id", seqId)
        .single();

      if (seq) {
        await supabaseAdmin
          .from("crm_followup_sequences")
          .update({ total_completed: (seq.total_completed || 0) + completedCount })
          .eq("id", seqId);
      }
    }

    const elapsed = Date.now() - startTime;
    log.info(`Processed ${processed} items, ${failed} failures in ${elapsed}ms`);

    return new Response(
      JSON.stringify({ processed, failed, elapsed_ms: elapsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Critical error in follow-up processor", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        processed,
        failed,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
