# WhatsApp Pipeline End-to-End Fix

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the WhatsApp pipeline so inbound messages trigger AI processing and outbound replies are actually delivered to the real phone, with full operational visibility in the UI.

**Architecture:** The pipeline is: Evolution API → whatsapp-webhook (Edge Function) → DB insert + ai-agent-processor → sendViaEvolution → real phone. The webhook already works for inbound. The critical breaks are: (1) sendViaEvolution doesn't track delivery status, (2) messages are saved as "sent" even when delivery fails, (3) no retry for failed AI calls, (4) UI shows no operational truth.

**Tech Stack:** Supabase Edge Functions (Deno), PostgreSQL, React 18 + TypeScript, Supabase Realtime, Evolution API v2, OpenAI API.

---

## Root Cause Analysis

### Bug 1: Outbound messages not delivered
- `sendViaEvolution()` in whatsapp-webhook returns void — success/failure is not propagated
- AI response is saved to `whatsapp_messages` BEFORE send attempt (line 936)
- No `send_status` column exists — all messages look "sent" in UI
- Evolution API may be offline (health-check: `evolution:error`)

### Bug 2: AI agents not activating
- OpenAI quota was exhausted (429 error) — no retry/requeue mechanism
- Fallback message is sent instead, and failure is only logged to console
- No mechanism to reprocess messages that got fallback responses

### Bug 3: No delivery tracking in DB
- `whatsapp_messages` has no `send_status`, `provider_message_id`, or `send_error` columns
- UI cannot distinguish sent vs failed messages

### Bug 4: Historical sync not implemented
- Evolution API v2 supports `GET /chat/findMessages/{instanceName}` for fetching history
- Not implemented in the codebase

### Bug 5: UI shows no operational truth
- No connection status indicator (connected/disconnected/error)
- No message delivery status (sent/failed/pending)
- No agent processing status visibility
- IA badge exists but no error state

---

## Chunk 1: Database Schema + Outbound Fix

### Task 1: Add delivery tracking columns to whatsapp_messages

**Files:**
- Create: `supabase/migrations/20260315000002_whatsapp_delivery_tracking.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add delivery tracking to whatsapp_messages
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS send_status TEXT DEFAULT 'sent'
  CHECK (send_status IN ('pending', 'sent', 'failed', 'delivered', 'read'));
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS send_error TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS processed_by_agent BOOLEAN DEFAULT FALSE;

-- Add agent processing tracking to whatsapp_conversations
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'idle'
  CHECK (agent_status IN ('idle', 'processing', 'failed', 'waiting_human'));
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_agent_error TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_processed_at TIMESTAMPTZ;

-- Index for finding failed messages (retry queue)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_send_status
  ON whatsapp_messages(send_status) WHERE send_status IN ('pending', 'failed');
```

- [ ] **Step 2: Apply migration via Supabase Management API**

```bash
curl -X POST "https://api.supabase.com/v1/projects/yfxgncbopvnsltjqetxw/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "<SQL from step 1>"}'
```

- [ ] **Step 3: Commit migration**

### Task 2: Fix sendViaEvolution to return delivery status + save AFTER send

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts` (lines 936-961, 970-1017)

**Key changes:**
1. `sendViaEvolution()` must return `{ success, messageId, error }`
2. Save AI response AFTER send, with correct `send_status`
3. Update `agent_status` on conversation during processing

- [ ] **Step 1: Refactor sendViaEvolution to return result**

Change return type from `void` to `Promise<{ success: boolean; messageId?: string; error?: string }>`.

```typescript
async function sendViaEvolution(instanceName: string, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // ... existing code but return result instead of void
  if (!response.ok) {
    return { success: false, error: `Evolution HTTP ${response.status}: ${JSON.stringify(data)}` };
  }
  const messageId = data?.key?.id || data?.messageId || null;
  return { success: true, messageId };
}
```

- [ ] **Step 2: Restructure message save flow — send FIRST, save AFTER with status**

In `processNormalizedMessage()`, replace lines 936-961 with:

```typescript
// --- SEND REPLY FIRST, THEN SAVE ---
let sendResult: { success: boolean; messageId?: string; error?: string } = { success: false, error: 'No provider' };

console.log(`[processMsg:${provider}] Sending reply via ${provider} to ${from}`);
if (provider === "evolution" && instanceName) {
  sendResult = await sendViaEvolution(instanceName, from, aiText);
} else {
  sendResult = await sendViaMeta(from, aiText, tenantId, supabase);
}

const sendStatus = sendResult.success ? 'sent' : 'failed';
console.log(`[processMsg:${provider}] Send result: ${sendStatus} (messageId=${sendResult.messageId || 'none'}, error=${sendResult.error || 'none'})`);

// --- SAVE AI RESPONSE WITH DELIVERY STATUS ---
const { error: aiMsgError } = await supabase.from("whatsapp_messages").insert({
  conversation_id: conversationId,
  tenant_id: tenantId,
  sender: "ia",
  content: aiText,
  message_type: "text",
  timestamp: new Date().toISOString(),
  send_status: sendStatus,
  provider_message_id: sendResult.messageId || null,
  send_error: sendResult.error || null,
  processed_by_agent: !aiError,
  // Legacy columns
  session_id: conversationId,
  direction: "outbound",
  to_number: from,
  message_text: aiText,
});

if (aiMsgError) {
  console.error(`[processMsg:${provider}] Error saving AI response:`, aiMsgError);
}

// Update conversation agent_status
await supabase.from("whatsapp_conversations").update({
  agent_status: aiError ? 'failed' : (shouldHandoff ? 'waiting_human' : 'idle'),
  last_agent_error: aiError ? String(aiError) : null,
  agent_processed_at: new Date().toISOString(),
}).eq("id", conversationId).eq("tenant_id", tenantId);

console.log(`[processMsg:${provider}] PIPELINE COMPLETE for ${from} — send_status=${sendStatus}`);
```

- [ ] **Step 3: Refactor sendViaMeta to also return result** (already returns result format — just wire it up)

- [ ] **Step 4: Deploy whatsapp-webhook**

```bash
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 5: Commit**

### Task 3: Add retry mechanism for failed AI calls

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`

- [ ] **Step 1: Add retry wrapper around ai-agent-processor call**

After the `supabase.functions.invoke("ai-agent-processor")` call, if it returns a 429 (quota) or 500 error, save message with `processed_by_agent: false` and `send_status: 'pending'` so it can be retried later.

- [ ] **Step 2: Create retry RPC function**

```sql
-- supabase/migrations/20260315000003_whatsapp_retry_rpc.sql
CREATE OR REPLACE FUNCTION get_pending_ai_messages(p_tenant_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  phone_number TEXT,
  contact_name TEXT
) AS $$
  SELECT m.id, m.conversation_id, m.content, c.phone_number, c.contact_name
  FROM whatsapp_messages m
  JOIN whatsapp_conversations c ON c.id = m.conversation_id
  WHERE m.tenant_id = p_tenant_id
    AND m.sender = 'lead'
    AND m.processed_by_agent = false
    AND m.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY m.created_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;
```

- [ ] **Step 3: Commit**

---

## Chunk 2: UI Improvements — Delivery Status + Operational Indicators

### Task 4: Add send_status to WhatsAppMessage type and display in UI

**Files:**
- Modify: `src/hooks/useWhatsAppConversations.ts` (WhatsAppMessage interface)
- Modify: `src/features/whatsapp/WhatsAppIA.tsx` (ChatPanel message rendering)

- [ ] **Step 1: Extend WhatsAppMessage interface**

```typescript
export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender: 'lead' | 'ia' | 'agent';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio';
  media_url: string | null;
  read: boolean;
  timestamp: string;
  created_at: string;
  send_status?: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  send_error?: string | null;
  processed_by_agent?: boolean;
}
```

- [ ] **Step 2: Extend WhatsAppConversation interface**

```typescript
export interface WhatsAppConversation {
  // ... existing fields ...
  agent_status?: 'idle' | 'processing' | 'failed' | 'waiting_human';
  last_agent_error?: string | null;
  agent_processed_at?: string | null;
}
```

- [ ] **Step 3: Add delivery status indicator to message bubbles**

In the ChatPanel message rendering, add a status icon below the timestamp:

```tsx
{/* Send status indicator for outbound messages */}
{!isLead && message.send_status && (
  <div className={`flex items-center justify-end gap-1 mt-0.5 ${
    message.send_status === 'failed' ? 'text-red-300' :
    message.send_status === 'pending' ? 'text-yellow-300' :
    'text-white/50'
  }`}>
    {message.send_status === 'failed' && <AlertCircle className="h-3 w-3" />}
    {message.send_status === 'pending' && <Clock className="h-3 w-3" />}
    {message.send_status === 'sent' && <Check className="h-3 w-3" />}
    {message.send_status === 'delivered' && <CheckCheck className="h-3 w-3" />}
    <span className="text-[9px]">
      {message.send_status === 'failed' ? 'Falha no envio' :
       message.send_status === 'pending' ? 'Pendente' :
       message.send_status === 'delivered' ? 'Entregue' : ''}
    </span>
  </div>
)}
```

- [ ] **Step 4: Add agent status badge to conversation header**

Next to the IA Active badge, show agent processing status:

```tsx
{selectedConversation.agent_status === 'failed' && (
  <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 bg-red-50">
    <AlertCircle className="h-3 w-3 mr-1" /> Erro IA
  </Badge>
)}
{selectedConversation.agent_status === 'waiting_human' && (
  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50">
    <User className="h-3 w-3 mr-1" /> Aguardando humano
  </Badge>
)}
```

- [ ] **Step 5: Commit**

### Task 5: Add connection status panel

**Files:**
- Modify: `src/features/whatsapp/WhatsAppIA.tsx` (stats footer area)

- [ ] **Step 1: Add connection health indicator to the stats footer**

In the ConversationList stats footer, add a connection badge:

```tsx
<div className="flex items-center gap-1.5">
  <div className={`h-2 w-2 rounded-full ${isWhatsAppConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
  <span className="text-[10px]">{isWhatsAppConnected ? 'Conectado' : 'Desconectado'}</span>
</div>
```

- [ ] **Step 2: Commit**

---

## Chunk 3: Historical Sync

### Task 6: Document Evolution API history sync limitations

**Key finding:** Evolution API v2 provides `GET /chat/findMessages/{instanceName}` which can fetch recent messages from connected sessions. However:
- Only messages from the current WhatsApp Web session are available (not full phone history)
- WhatsApp Web only syncs recent messages when connecting (~last 30 days, varies)
- Messages from before the Evolution connection are NOT reliably available

**Implementation approach:** Fetch recent chats when instance connects, import any messages found, but clearly communicate the limitation in the UI.

**Files:**
- Modify: `supabase/functions/evolution-manager/index.ts` (add `syncHistory` action)
- Modify: `supabase/functions/whatsapp-webhook/index.ts` (trigger sync on connection.update event)

- [ ] **Step 1: Add fetchChats function to evolution-manager**

```typescript
async function fetchChats(instanceName: string) {
  const result = await evoFetch(`/chat/findContacts/${instanceName}`, "POST", {
    where: {}
  });
  if (!result.ok) {
    return { success: false, error: result.data?.message || "Failed to fetch chats" };
  }
  return { success: true, chats: result.data };
}
```

- [ ] **Step 2: Add syncHistory action to evolution-manager handler**

- [ ] **Step 3: Trigger light sync on connection.update event (open state)**

In whatsapp-webhook's `connection.update` handler, after updating status to "ativa", trigger a non-blocking background sync of recent contacts.

- [ ] **Step 4: Add UI notice about historical sync limitations**

In the WhatsApp setup flow, after successful connection, show a toast/notice:
"WhatsApp conectado! Apenas mensagens recebidas a partir de agora serão sincronizadas. O histórico anterior ao WhatsApp Web não está disponível."

- [ ] **Step 5: Commit**

---

## Chunk 4: Deploy & Test

### Task 7: Deploy all modified functions

- [ ] **Step 1: Deploy whatsapp-webhook**
- [ ] **Step 2: Deploy evolution-manager**
- [ ] **Step 3: Deploy send-whatsapp-message**
- [ ] **Step 4: Deploy ai-agent-processor**

### Task 8: End-to-end test

- [ ] **Test A: Full inbound → AI → outbound flow**
  - Send "Olá" from real phone
  - Verify message appears in Jurify UI
  - Check logs for AI processing
  - Verify reply is delivered to real phone
  - Verify UI shows send_status correctly

- [ ] **Test B: AI failure handling**
  - If OpenAI quota is still exceeded, verify:
    - Fallback message is sent
    - agent_status shows 'failed' on conversation
    - Message shows as processed_by_agent: false
    - send_status reflects actual delivery result (not "assumed sent")

- [ ] **Test C: Connection reconnect**
  - Disconnect and reconnect instance
  - Verify connection status updates in UI
  - Verify historical sync notice appears

---

## Summary of Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `supabase/migrations/20260315000002_whatsapp_delivery_tracking.sql` | CREATE | Add send_status, provider_message_id, send_error, agent_status columns |
| `supabase/functions/whatsapp-webhook/index.ts` | MODIFY | Fix send flow: send FIRST then save, return delivery result, update agent_status |
| `supabase/functions/evolution-manager/index.ts` | MODIFY | Add fetchChats/syncHistory action |
| `src/hooks/useWhatsAppConversations.ts` | MODIFY | Extend interfaces with send_status, agent_status fields |
| `src/features/whatsapp/WhatsAppIA.tsx` | MODIFY | Add delivery status indicators, agent status badge, connection badge |

## Provider Limitations

- **Historical sync**: Evolution API only provides messages from the current WhatsApp Web session. Full phone history is NOT accessible.
- **Delivery confirmation**: Evolution API provides message IDs on send but delivery/read receipts depend on `messages.update` webhook events which need separate handling.
- **OpenAI dependency**: If OpenAI quota is empty, AI cannot process. Fallback message is sent but real AI response requires active OpenAI billing.
