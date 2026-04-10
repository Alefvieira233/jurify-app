import { createClient } from "jsr:@supabase/supabase-js@2";
import type { MetaWebhookStatus } from "../../_shared/whatsapp-logic.ts";

// ============================================
// 📊 STATUS UPDATES (Meta format)
// ============================================
export async function processStatusUpdate(
  supabase: ReturnType<typeof createClient>,
  status: MetaWebhookStatus & { id?: string },
) {
  try {
    const statusValue = status.status;
    const metaMsgId = status.id; // Meta message ID from the status callback

    if (!metaMsgId) {
      console.warn("[webhook] Status update without message ID, skipping");
      return;
    }

    if (statusValue === "delivered") {
      await supabase
        .from("whatsapp_messages")
        .update({ send_status: "delivered" })
        .eq("provider_message_id", metaMsgId);
    }

    if (statusValue === "read") {
      await supabase
        .from("whatsapp_messages")
        .update({ read: true, send_status: "read" })
        .eq("provider_message_id", metaMsgId);
    }

    if (statusValue === "failed") {
      const errorInfo = status.errors?.[0];
      const errorMsg = errorInfo?.title || `Error code: ${errorInfo?.code || "unknown"}`;
      console.error("[webhook] Message delivery failed:", {
        messageId: metaMsgId,
        recipient: status.recipient_id,
        error_code: errorInfo?.code,
        error_title: errorInfo?.title,
      });

      await supabase
        .from("whatsapp_messages")
        .update({ send_status: "failed", send_error: errorMsg })
        .eq("provider_message_id", metaMsgId);
    }
  } catch (error) {
    console.error("[webhook] Error processing status update:", error);
  }
}
