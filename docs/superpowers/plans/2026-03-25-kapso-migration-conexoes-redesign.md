# Kapso Migration + Conexões Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Evolution API with Kapso WhatsApp Cloud API across the entire backend, and redesign the Conexões frontend to match the LíderHub design (image 7).

**Architecture:** Kapso acts as a managed proxy over Meta's official WhatsApp Cloud API. We replace all Evolution API calls (instance management, message sending, webhook processing, media handling) with raw `fetch` calls through a shared `kapso-client.ts` module (not the npm SDK, since Edge Functions run on Deno). The frontend Conexões page gets a visual redesign matching image 7 — clean table with search/columns, side drawer for connection type selection (API Não Oficial vs API Oficial), and streamlined QR wizard.

**Tech Stack:** Kapso REST API (`https://api.kapso.ai`), Supabase Edge Functions (Deno), React 18 + TypeScript, shadcn/ui + Tailwind CSS

---

## Avaliação Kapso vs Evolution

| Aspecto | Evolution API | Kapso |
|---------|--------------|-------|
| **Tipo** | API não-oficial (WhatsApp Web protocol) | API oficial Meta (Cloud API proxy) |
| **Risco de Ban** | Alto (reverse-engineered) | Baixo (oficial Meta) |
| **Hosting** | Self-hosted (Docker + VPS + Redis + Postgres) | Managed SaaS |
| **Custo** | Free + hosting (~$20-40/mês VPS) | $25/mês Pro (100K msgs) + Meta fees |
| **Setup** | QR Code scan (2 min) | Meta Business verification + WABA |
| **Multi-tenant** | Manual per-instance | Built-in customer onboarding |
| **Inbox** | Não incluído | inbox.kapso.ai incluído |
| **Broadcasts** | Manual | Built-in com templates |
| **Voice Calls** | Não | Sim (Pipecat) |
| **SDK** | REST only | `@kapso/whatsapp-cloud-api` TypeScript |
| **Webhooks** | Custom events (messages.upsert, connection.update) | Structured (`whatsapp.message.received`, etc.) |

**Recomendação:** Migrar para Kapso. O risco de ban do Evolution é real para um SaaS jurídico que depende de comunicação contínua. O custo de $25/mês é mínimo comparado à confiabilidade e ao fim da manutenção de infra.

---

## File Structure

### New Files
- `supabase/functions/_shared/kapso-client.ts` — Shared Kapso API client (replaces evoFetch pattern)
- `supabase/functions/kapso-manager/index.ts` — Instance management (replaces evolution-manager)
- `supabase/functions/kapso-manager/types.ts` — Kapso-specific TypeScript types

### Modified Files (Backend)
- `supabase/functions/send-whatsapp-message/index.ts` — Replace sendViaEvolution → sendViaKapso
- `supabase/functions/whatsapp-webhook/index.ts` — Replace normalizeEvolutionMessage → normalizeKapsoMessage
- `supabase/functions/_shared/media-utils.ts` — Update media download for Kapso URLs
- `supabase/functions/media-processor/index.ts` — Update import from downloadEvolutionMedia → downloadKapsoMedia
- `supabase/functions/process-prazos-alerts/index.ts` — Replace Evolution send → Kapso send
- `supabase/functions/health-check/index.ts` — Replace Evolution health → Kapso health

### Modified Files (Frontend — Conexões Redesign)
- `src/features/conexoes/ConexoesManager.tsx` — Full redesign matching image 7
- `src/features/conexoes/ConnectionTypeChooser.tsx` — Two cards (API Não Oficial / API Oficial) in drawer
- `src/features/conexoes/QRCodeWizard.tsx` — Update to call kapso-manager
- `src/features/conexoes/ConnectionDetailsDrawer.tsx` — Update API calls to kapso-manager
- `src/hooks/useConexoes.ts` — Update types (evolution → kapso)

### Modified Files (WhatsApp Feature)
- `src/features/whatsapp/WhatsAppEvolutionSetup.tsx` — Rename to WhatsAppKapsoSetup.tsx
- `src/features/whatsapp/WhatsAppSetup.tsx` — Update import to WhatsAppKapsoSetup
- `src/features/whatsapp/WhatsAppIA.tsx` — Update sessionStorage key + DB query from evolution → kapso

### Modified Files (Config/Settings/Health)
- `src/features/settings/IntegracoesConfig.tsx` — Update labels
- `src/hooks/useSystemHealth.ts` — Rename whatsapp_evolution → whatsapp_kapso

### Modified Files (DB/Migrations)
- `supabase/migrations/20260325000001_kapso_migration.sql` — Update references + alter column defaults

### Modified Files (CI/CD & Scripts)
- `.github/workflows/deploy-production.yml` — Replace evolution-manager deploy + secrets
- `.env.example` — Replace EVOLUTION_* vars with KAPSO_* vars
- `scripts/validate-secrets.cjs` — Check KAPSO_API_KEY instead of EVOLUTION_API_KEY
- `scripts/readiness-gate.cjs` — Update file references
- `scripts/mvp-automation.sh` — Update file references
- `scripts/fetch-logs.cjs` — Update help text

### Modified Files (Tests)
- `src/tests/integration/whatsapp-webhook.test.ts` — Replace Evolution payloads with Kapso
- `src/features/whatsapp/__tests__/WhatsAppEvolutionSetup.test.tsx` — Rename + update for Kapso
- `e2e/whatsapp.spec.ts` — Update routes and text from evolution → kapso

### Modified Files (Docs)
- `docs/runbooks/MONITORING.md` — Update Evolution references
- `docs/runbooks/TROUBLESHOOTING.md` — Update Evolution references
- `docs/runbooks/DEPLOY.md` — Update Evolution references

### Files to Remove (after migration)
- `supabase/functions/evolution-manager/` — Entire directory, replaced by kapso-manager
- `infra/evolution-api/` — Entire directory (Docker, setup scripts, README)
- `docker-compose.staging.yml` — Evolution service definition
- `docker-compose.production.yml` — Evolution service definition (or remove evolution-api service)

---

## Phase 1: Backend — Kapso Shared Client

### Task 1: Install Kapso SDK and Create Shared Client

**Files:**
- Create: `supabase/functions/_shared/kapso-client.ts`

- [ ] **Step 1: Write the kapso-client module**

```typescript
// supabase/functions/_shared/kapso-client.ts

const KAPSO_API_URL = Deno.env.get('KAPSO_API_URL') || 'https://api.kapso.ai';
const KAPSO_API_KEY = Deno.env.get('KAPSO_API_KEY') || '';
const KAPSO_PHONE_NUMBER_ID = Deno.env.get('KAPSO_PHONE_NUMBER_ID') || '';

export interface KapsoConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
}

export function getKapsoConfig(): KapsoConfig {
  if (!KAPSO_API_KEY) {
    throw new Error('KAPSO_API_KEY not configured');
  }
  if (!KAPSO_PHONE_NUMBER_ID) {
    throw new Error('KAPSO_PHONE_NUMBER_ID not configured');
  }
  return {
    apiUrl: KAPSO_API_URL,
    apiKey: KAPSO_API_KEY,
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
  };
}

export async function kapsoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getKapsoConfig();
  const url = `${config.apiUrl}${path}`;

  const headers = new Headers(options.headers);
  headers.set('X-API-Key', config.apiKey);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

// Send text message via Kapso proxy
export async function sendTextMessage(
  to: string,
  text: string
): Promise<{ messageId: string; success: boolean }> {
  const config = getKapsoConfig();
  const resp = await kapsoFetch(
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Kapso send failed: ${resp.status} - ${err}`);
  }

  const data = await resp.json();
  return {
    messageId: data.messages?.[0]?.id || '',
    success: true,
  };
}

// Send media message via Kapso
export async function sendMediaMessage(
  to: string,
  mediaType: 'image' | 'audio' | 'document' | 'video',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<{ messageId: string; success: boolean }> {
  const config = getKapsoConfig();
  const mediaPayload: Record<string, unknown> = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename) mediaPayload.filename = filename;

  const resp = await kapsoFetch(
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: mediaType,
        [mediaType]: mediaPayload,
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Kapso media send failed: ${resp.status} - ${err}`);
  }

  const data = await resp.json();
  return {
    messageId: data.messages?.[0]?.id || '',
    success: true,
  };
}

// Health check
export async function checkKapsoHealth(): Promise<{
  status: 'connected' | 'error' | 'not_configured';
  detail?: string;
}> {
  if (!KAPSO_API_KEY) {
    return { status: 'not_configured' };
  }
  try {
    const resp = await kapsoFetch('/meta/whatsapp/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      return { status: 'connected' };
    }
    return { status: 'error', detail: `HTTP ${resp.status}` };
  } catch (e) {
    return { status: 'error', detail: e.message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/kapso-client.ts
git commit -m "feat: add shared Kapso WhatsApp API client"
```

---

## Phase 2: Backend — Kapso Manager Edge Function

### Task 2: Create kapso-manager Edge Function

**Files:**
- Create: `supabase/functions/kapso-manager/index.ts`

This replaces `evolution-manager`. Kapso uses a different model — instead of creating "instances" with QR codes, Kapso uses the official Meta API where phone numbers are registered through Meta Business verification. However, Kapso still supports the "API Não Oficial" mode for quick QR code connections.

- [ ] **Step 1: Create kapso-manager function**

The kapso-manager handles:
- `create` — Register a new WhatsApp connection via Kapso
- `status` — Check connection state
- `disconnect` — Remove connection
- `delete` — Full cleanup
- `health` — Kapso API health check
- `qrcode` — Get QR code for unofficial API connections

Key differences from evolution-manager:
- Auth via `X-API-Key` header (not `apikey`)
- Kapso API base: `https://api.kapso.ai`
- Uses Meta's official message format
- Webhook events are structured (not raw Evolution format)

Implementation should mirror evolution-manager's action-based routing (`req.json() → action switch`) but call Kapso endpoints instead.

- [ ] **Step 2: Update DB references**

Update `configuracoes_integracoes` to store `whatsapp_kapso` instead of `whatsapp_evolution`. The `observacoes` field stores the Kapso phone number ID instead of Evolution instance name.

- [ ] **Step 3: Write connection logs**

Keep the same `conexoes_logs` and `conexoes_alertas` table structure — just change the `origem` field from `'evolution-manager'` to `'kapso-manager'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/kapso-manager/
git commit -m "feat: add kapso-manager edge function replacing evolution-manager"
```

---

## Phase 3: Backend — Migrate Message Sending

### Task 3: Replace sendViaEvolution in send-whatsapp-message

**Files:**
- Modify: `supabase/functions/send-whatsapp-message/index.ts`

- [ ] **Step 1: Import kapso-client**

Replace the `sendViaEvolution` and `sendMediaViaEvolution` functions with imports from `kapso-client.ts`:

```typescript
import { sendTextMessage, sendMediaMessage } from '../_shared/kapso-client.ts';
```

- [ ] **Step 2: Replace sendViaEvolution function**

Remove the entire `sendViaEvolution()` function (~40 lines) and replace calls with:

```typescript
// Old:
const evoResult = await sendViaEvolution(instanceName, phone, text, evoUrl, evoKey);
// New:
const kapsoResult = await sendTextMessage(phone, text);
```

- [ ] **Step 3: Replace sendMediaViaEvolution function**

Remove `sendMediaViaEvolution()` (~60 lines) and replace with:

```typescript
// Old:
await sendMediaViaEvolution(instanceName, phone, mediaType, mediaUrl, caption, evoUrl, evoKey);
// New:
await sendMediaMessage(phone, mediaType, mediaUrl, caption, filename);
```

- [ ] **Step 4: Remove Evolution instance lookup**

The current code queries `configuracoes_integracoes` to find the Evolution instance name. With Kapso, the phone number ID comes from environment config — no per-tenant instance lookup needed (Kapso manages this).

Remove the block that does:
```typescript
const { data: evoConfig } = await supabase
  .from('configuracoes_integracoes')
  .select('*')
  .eq('nome_integracao', 'whatsapp_evolution')
  ...
```

- [ ] **Step 5: Keep Meta Official fallback**

The existing `sendViaMeta()` function stays as-is — Kapso IS the Meta official API, but keeping the direct Meta fallback is good for resilience.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-whatsapp-message/index.ts
git commit -m "feat: replace Evolution send with Kapso in send-whatsapp-message"
```

---

## Phase 4: Backend — Migrate Webhook Processing

### Task 4: Update whatsapp-webhook for Kapso events

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`

- [ ] **Step 1: Add Kapso webhook payload detection**

Kapso sends structured events. Replace `isEvolutionPayload()` with `isKapsoPayload()`:

```typescript
function isKapsoPayload(body: unknown): boolean {
  // Kapso webhooks have event field like "whatsapp.message.received"
  return typeof body === 'object' && body !== null &&
    typeof (body as Record<string, unknown>).event === 'string' &&
    ((body as Record<string, unknown>).event as string).startsWith('whatsapp.');
}
```

- [ ] **Step 2: Add Kapso message normalization**

Replace `normalizeEvolutionMessage()` with `normalizeKapsoMessage()`:

Kapso webhook events:
- `whatsapp.message.received` — inbound message
- `whatsapp.message.sent` — outbound confirmation
- `whatsapp.message.delivered` — delivery receipt
- `whatsapp.message.read` — read receipt

The message data follows Meta's standard format since Kapso proxies Meta's Cloud API.

- [ ] **Step 3: Update webhook secret verification**

Replace Evolution's `x-webhook-secret` header check with Kapso's verification method. Kapso uses a webhook signing secret for HMAC verification.

- [ ] **Step 4: Update event routing**

Replace Evolution event names:
```
messages.upsert     → whatsapp.message.received
connection.update   → whatsapp.conversation.created / .ended
qrcode.updated      → (not needed with official API)
```

- [ ] **Step 5: Keep backwards compatibility temporarily**

During migration, support both Evolution and Kapso payloads:
```typescript
if (isKapsoPayload(body)) {
  normalized = normalizeKapsoMessage(body);
} else if (isEvolutionPayload(body)) {
  normalized = normalizeEvolutionMessage(body); // legacy
} else {
  normalized = normalizeMetaMessage(body);
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/whatsapp-webhook/index.ts
git commit -m "feat: add Kapso webhook normalization in whatsapp-webhook"
```

---

## Phase 5: Backend — Migrate Supporting Functions

### Task 5: Update process-prazos-alerts

**Files:**
- Modify: `supabase/functions/process-prazos-alerts/index.ts`

- [ ] **Step 1: Import kapso-client**

```typescript
import { sendTextMessage } from '../_shared/kapso-client.ts';
```

- [ ] **Step 2: Replace Evolution send call**

Remove the Evolution API fetch block (~15 lines) and replace with:
```typescript
await sendTextMessage(telefone, alertMessage);
```

- [ ] **Step 3: Remove instance name lookup**

The current code extracts instance name from `configuracoes_integracoes.observacoes`. With Kapso, this isn't needed — the shared client handles routing.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-prazos-alerts/index.ts
git commit -m "feat: replace Evolution with Kapso in process-prazos-alerts"
```

### Task 6: Update health-check

**Files:**
- Modify: `supabase/functions/health-check/index.ts`

- [ ] **Step 1: Import checkKapsoHealth**

```typescript
import { checkKapsoHealth } from '../_shared/kapso-client.ts';
```

- [ ] **Step 2: Replace Evolution health check**

Replace the `whatsapp_evolution` section (~20 lines) with:
```typescript
const kapsoHealth = await checkKapsoHealth();
services.whatsapp_kapso = kapsoHealth;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/health-check/index.ts
git commit -m "feat: replace Evolution health check with Kapso"
```

### Task 7: Update media-utils and media-processor

**Files:**
- Modify: `supabase/functions/_shared/media-utils.ts`
- Modify: `supabase/functions/media-processor/index.ts`

- [ ] **Step 1: Update downloadEvolutionMedia → downloadKapsoMedia**

Kapso uses Meta's media API. Media URLs from webhooks are Meta CDN URLs that require authentication:

```typescript
export async function downloadKapsoMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string }> {
  const config = getKapsoConfig();
  // Step 1: Get media URL from Meta via Kapso proxy
  const urlResp = await kapsoFetch(`/meta/whatsapp/v24.0/${mediaId}`);
  const { url } = await urlResp.json();

  // Step 2: Download the actual media
  const mediaResp = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  // ... base64 encode
}
```

- [ ] **Step 2: Update media-processor import**

In `supabase/functions/media-processor/index.ts`, update the import:
```typescript
// Old:
import { downloadEvolutionMedia } from '../_shared/media-utils.ts';
// New:
import { downloadKapsoMedia } from '../_shared/media-utils.ts';
```

And update all call sites from `downloadEvolutionMedia()` to `downloadKapsoMedia()`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/media-utils.ts supabase/functions/media-processor/index.ts
git commit -m "feat: update media-utils and media-processor for Kapso"
```

---

## Phase 6: Environment Variables & Database Migration

### Task 8: Create migration and update env vars

**Files:**
- Create: `supabase/migrations/20260325000001_kapso_migration.sql`

- [ ] **Step 1: Write DB migration**

```sql
-- Update configuracoes_integracoes to support kapso
UPDATE configuracoes_integracoes
SET nome_integracao = 'whatsapp_kapso',
    observacoes = REPLACE(observacoes, 'Instance: ', 'Kapso Phone: ')
WHERE nome_integracao = 'whatsapp_evolution';

-- Update conexoes_whatsapp tipo enum
ALTER TABLE conexoes_whatsapp
  DROP CONSTRAINT IF EXISTS conexoes_whatsapp_tipo_check;

ALTER TABLE conexoes_whatsapp
  ADD CONSTRAINT conexoes_whatsapp_tipo_check
  CHECK (tipo IN ('kapso', 'oficial', 'cloud_api', 'evolution'));

-- Update existing connections
UPDATE conexoes_whatsapp
SET tipo = 'kapso', provider = 'kapso_api'
WHERE tipo = 'evolution' AND provider = 'evolution_api';

-- Update column defaults so new connections default to kapso
ALTER TABLE conexoes_whatsapp ALTER COLUMN tipo SET DEFAULT 'kapso';
ALTER TABLE conexoes_whatsapp ALTER COLUMN provider SET DEFAULT 'kapso_api';
```

- [ ] **Step 2: Document new environment variables**

New Supabase secrets needed:
```
KAPSO_API_KEY           — Kapso API key from dashboard
KAPSO_PHONE_NUMBER_ID   — WhatsApp phone number ID from Kapso
KAPSO_WEBHOOK_SECRET    — Webhook signing secret from Kapso
```

Old secrets to remove (after migration):
```
EVOLUTION_API_URL
EVOLUTION_API_BASE_URL
EVOLUTION_API_KEY
EVOLUTION_WEBHOOK_SECRET
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260325000001_kapso_migration.sql
git commit -m "feat: add Kapso migration for DB references"
```

---

## Phase 7: Frontend — Conexões Page Redesign (Image 7)

### Task 9: Redesign ConexoesManager to match image 7

**Files:**
- Modify: `src/features/conexoes/ConexoesManager.tsx`

**Target UI (from image 7):**
- Page title: "Conexões" with subtitle "Gerencie suas conexões com canais de comunicação."
- Search bar with magnifying glass + "Pesquisar conexões..." placeholder
- "Colunas" dropdown button on the right
- Clean table with columns: CONEXÃO | STATUS PADRÃO | DEPARTAMENTO
- Each row: drag handle (6-dot grip) + avatar + name + phone number
- Footer: "N conexão(ões)" count
- "Nova Conexão" button opens a Sheet (right drawer)
- The drawer shows ConnectionTypeChooser

- [ ] **Step 1: Rewrite the page header**

Replace current card-based layout with clean minimal design:
```tsx
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
    <p className="text-muted-foreground">
      Gerencie suas conexões com canais de comunicação.
    </p>
  </div>

  <div className="flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Pesquisar conexões..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9"
      />
    </div>
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Colunas
          </Button>
        </DropdownMenuTrigger>
        {/* Column visibility toggles */}
      </DropdownMenu>
      <Button onClick={() => setNewConnOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Nova Conexão
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace cards with table layout**

Use shadcn Table component:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-12"></TableHead>
      <TableHead>CONEXÃO</TableHead>
      <TableHead>STATUS PADRÃO</TableHead>
      <TableHead>DEPARTAMENTO</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filtered.map((conn) => (
      <TableRow key={conn.id} className="cursor-pointer" onClick={() => openDetails(conn)}>
        <TableCell>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conn.avatar_url} />
              <AvatarFallback>{conn.nome?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{conn.nome}</p>
              <p className="text-sm text-muted-foreground">{conn.telefone}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>{conn.status_padrao || '—'}</TableCell>
        <TableCell>{conn.departamento?.nome || '—'}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
<p className="text-sm text-muted-foreground mt-2">
  {filtered.length} conexão{filtered.length !== 1 ? 'ões' : ''}
</p>
```

- [ ] **Step 3: Update Sheet to use side drawer**

The "Nova Conexão" Sheet should slide from the right (side="right") and show the type chooser:
```tsx
<Sheet open={newConnOpen} onOpenChange={setNewConnOpen}>
  <SheetContent side="right" className="w-[500px] sm:max-w-[500px]">
    <SheetHeader>
      <SheetTitle>Escolha o tipo de conexão WhatsApp</SheetTitle>
      <SheetDescription>
        Selecione como deseja conectar sua conta WhatsApp à plataforma
      </SheetDescription>
    </SheetHeader>
    {newConnStep === 'choose' ? (
      <ConnectionTypeChooser onSelect={handleTypeSelect} />
    ) : (
      <QRCodeWizard onComplete={handleConnected} onBack={() => setNewConnStep('choose')} />
    )}
  </SheetContent>
</Sheet>
```

- [ ] **Step 4: Update all evolution-manager calls to kapso-manager**

Replace every `supabase.functions.invoke('evolution-manager', ...)` with `supabase.functions.invoke('kapso-manager', ...)`.

- [ ] **Step 5: Commit**

```bash
git add src/features/conexoes/ConexoesManager.tsx
git commit -m "feat: redesign ConexoesManager matching LíderHub image 7"
```

---

### Task 10: Redesign ConnectionTypeChooser

**Files:**
- Modify: `src/features/conexoes/ConnectionTypeChooser.tsx`

**Target UI (image 7):** Two side-by-side cards at the bottom of the drawer:
1. **API Não Oficial** — WhatsApp icon + "Conexão rápida via QR Code ou Pair Code" + 3 green checkmarks
2. **API Oficial** — WhatsApp icon + "API oficial WhatsApp Business da Meta" + 3 green checkmarks

- [ ] **Step 1: Redesign the two option cards**

```tsx
const connectionTypes = [
  {
    id: 'kapso_qr' as const,
    title: 'API Não Oficial',
    subtitle: 'Conexão rápida via QR Code ou Pair Code',
    icon: MessageSquare,
    features: [
      'Conexão rápida',
      'Sem aprovação de templates',
      'Sem janela de conversação',
    ],
  },
  {
    id: 'kapso_oficial' as const,
    title: 'API Oficial',
    subtitle: 'API oficial WhatsApp Business da Meta',
    icon: MessageSquare,
    features: [
      'Selo verde verificado oficial',
      'Envio de campanhas em massa',
      'Maior confiabilidade empresarial',
    ],
  },
];
```

Each card:
```tsx
<div
  className="flex-1 border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
  onClick={() => onSelect(type.id)}
>
  <div className="flex items-center gap-3 mb-3">
    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
      <MessageSquare className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="font-semibold">{type.title}</p>
      <p className="text-sm text-muted-foreground">{type.subtitle}</p>
    </div>
  </div>
  <ul className="space-y-1">
    {type.features.map((f) => (
      <li key={f} className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-green-500" />
        {f}
      </li>
    ))}
  </ul>
</div>
```

- [ ] **Step 2: Remove "Enterprise Module" lock on official API**

With Kapso, the official API is available to all plans. Remove the locked/enterprise-only gate.

- [ ] **Step 3: Commit**

```bash
git add src/features/conexoes/ConnectionTypeChooser.tsx
git commit -m "feat: redesign ConnectionTypeChooser with two Kapso options"
```

---

### Task 11: Update QRCodeWizard for Kapso

**Files:**
- Modify: `src/features/conexoes/QRCodeWizard.tsx`

- [ ] **Step 1: Replace evolution-manager calls with kapso-manager**

Update all `supabase.functions.invoke('evolution-manager', ...)` calls to use `'kapso-manager'`.

- [ ] **Step 2: Update action payloads if Kapso uses different formats**

The create/qrcode/status actions may have slightly different request/response shapes. Adjust parsing accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/features/conexoes/QRCodeWizard.tsx
git commit -m "feat: update QRCodeWizard to use kapso-manager"
```

---

### Task 12: Update ConnectionDetailsDrawer for Kapso

**Files:**
- Modify: `src/features/conexoes/ConnectionDetailsDrawer.tsx`

- [ ] **Step 1: Replace all evolution-manager invocations**

Change `'evolution-manager'` to `'kapso-manager'` for: status, restart, logout, delete.

- [ ] **Step 2: Update Diagnóstico tab**

Replace "Evolution API acessível" with "Kapso API acessível" in the diagnostic panel.

- [ ] **Step 3: Update labels**

Replace all "Evolution" text references with "Kapso" or generic "WhatsApp" where appropriate.

- [ ] **Step 4: Commit**

```bash
git add src/features/conexoes/ConnectionDetailsDrawer.tsx
git commit -m "feat: update ConnectionDetailsDrawer for Kapso"
```

---

### Task 13: Update useConexoes hook

**Files:**
- Modify: `src/hooks/useConexoes.ts`

- [ ] **Step 1: Update ConexaoWhatsApp type**

```typescript
tipo: 'kapso' | 'oficial' | 'cloud_api'; // remove 'evolution'
provider: 'kapso_api' | 'meta_api' | 'cloud_api'; // remove 'evolution_api'
```

- [ ] **Step 2: Update legacy fallback**

Change `configuracoes_integracoes` fallback to look for `whatsapp_kapso` instead of `whatsapp_evolution`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useConexoes.ts
git commit -m "feat: update useConexoes types for Kapso"
```

---

## Phase 8: Frontend — Supporting Files

### Task 14: Rename WhatsAppEvolutionSetup → WhatsAppKapsoSetup

**Files:**
- Modify: `src/features/whatsapp/WhatsAppEvolutionSetup.tsx` → rename to `WhatsAppKapsoSetup.tsx`
- Modify: `src/features/whatsapp/WhatsAppSetup.tsx` — Update import
- Modify: `src/features/whatsapp/WhatsAppIA.tsx` — Update Evolution references

- [ ] **Step 1: Rename file and update all internal references**

Replace "Evolution" with "Kapso" in component name, labels, sessionStorage keys, and edge function calls.
- sessionStorage key: `whatsapp_evolution_instance` → `whatsapp_kapso_instance`
- Edge function: `evolution-manager` → `kapso-manager`

- [ ] **Step 2: Update WhatsAppSetup.tsx import**

```typescript
// Old:
import WhatsAppEvolutionSetup from './WhatsAppEvolutionSetup';
// New:
import WhatsAppKapsoSetup from './WhatsAppKapsoSetup';
```

Update the JSX render and any "via Evolution API" comments.

- [ ] **Step 3: Update WhatsAppIA.tsx**

Replace:
```typescript
// Old:
sessionStorage.getItem('whatsapp_evolution_instance')
.eq('nome_integracao', 'whatsapp_evolution')
// New:
sessionStorage.getItem('whatsapp_kapso_instance')
.eq('nome_integracao', 'whatsapp_kapso')
```

- [ ] **Step 4: Commit**

```bash
git add src/features/whatsapp/
git commit -m "refactor: rename WhatsAppEvolutionSetup to WhatsAppKapsoSetup"
```

### Task 15: Update IntegracoesConfig labels

**Files:**
- Modify: `src/features/settings/IntegracoesConfig.tsx`

- [ ] **Step 1: Update Evolution references**

Change "Automação de mensagens via Evolution API" to "Automação de mensagens via Kapso WhatsApp API".

- [ ] **Step 2: Commit**

```bash
git add src/features/settings/IntegracoesConfig.tsx
git commit -m "refactor: update integration labels from Evolution to Kapso"
```

### Task 16: Update useSystemHealth

**Files:**
- Modify: `src/hooks/useSystemHealth.ts`

- [ ] **Step 1: Rename whatsapp_evolution → whatsapp_kapso**

Update the service key and any display labels.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSystemHealth.ts
git commit -m "refactor: update health check key from evolution to kapso"
```

---

## Phase 9: Cleanup & CI/CD

### Task 17: Update CI/CD, scripts, and env templates

**Files:**
- Modify: `.github/workflows/deploy-production.yml`
- Modify: `.env.example`
- Modify: `scripts/validate-secrets.cjs`
- Modify: `scripts/readiness-gate.cjs`
- Modify: `scripts/mvp-automation.sh`
- Modify: `scripts/fetch-logs.cjs`

- [ ] **Step 1: Update deploy-production.yml**

Replace `evolution-manager` deploy step with `kapso-manager`. Replace `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` secrets with `KAPSO_API_KEY`/`KAPSO_PHONE_NUMBER_ID`/`KAPSO_WEBHOOK_SECRET`.

- [ ] **Step 2: Update .env.example**

Replace:
```
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```
With:
```
KAPSO_API_KEY=
KAPSO_PHONE_NUMBER_ID=
KAPSO_WEBHOOK_SECRET=
```

- [ ] **Step 3: Update validation scripts**

In `scripts/validate-secrets.cjs`: check for `KAPSO_API_KEY` instead of `EVOLUTION_API_KEY`.
In `scripts/readiness-gate.cjs`: update file references from `WhatsAppEvolutionSetup` → `WhatsAppKapsoSetup`, `evolution-manager` → `kapso-manager`.
In `scripts/mvp-automation.sh`: same file reference updates.
In `scripts/fetch-logs.cjs`: update help text from `evolution-manager` → `kapso-manager`.

- [ ] **Step 4: Commit**

```bash
git add .github/ .env.example scripts/
git commit -m "chore: update CI/CD and scripts for Kapso migration"
```

### Task 18: Remove Evolution infrastructure

**Files:**
- Delete: `supabase/functions/evolution-manager/` (entire directory)
- Delete: `infra/evolution-api/` (entire directory — Docker, setup scripts, README)
- Delete: `docker-compose.staging.yml` (or remove evolution-api service)
- Modify: `docker-compose.production.yml` (remove evolution-api service)

- [ ] **Step 1: Remove evolution-manager edge function**

```bash
rm -rf supabase/functions/evolution-manager/
```

- [ ] **Step 2: Remove Evolution infrastructure**

```bash
rm -rf infra/evolution-api/
```

- [ ] **Step 3: Clean up docker-compose files**

Remove the `evolution-api` service definition from both `docker-compose.staging.yml` and `docker-compose.production.yml`. If no other services remain, delete the files entirely.

- [ ] **Step 4: Remove backwards-compatibility code**

After confirming Kapso works, remove `isEvolutionPayload()` and `normalizeEvolutionMessage()` from whatsapp-webhook.

**Verification criteria:** All tests pass, Kapso health check returns `connected`, at least one message sent+received successfully via Kapso before removing Evolution fallback.

- [ ] **Step 5: Update runbook docs**

Update `docs/runbooks/MONITORING.md`, `docs/runbooks/TROUBLESHOOTING.md`, and `docs/runbooks/DEPLOY.md` — replace all Evolution references with Kapso equivalents.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Evolution API infrastructure and code"
```

---

## Phase 10: Testing & Verification

### Task 19: Update tests

**Files:**
- Modify: `src/tests/integration/whatsapp-webhook.test.ts`
- Modify: `src/features/whatsapp/__tests__/WhatsAppEvolutionSetup.test.tsx` → rename to `WhatsAppKapsoSetup.test.tsx`
- Modify: `e2e/whatsapp.spec.ts`

- [ ] **Step 1: Update webhook test payloads**

Replace Evolution webhook test payloads with Kapso structured event format.

- [ ] **Step 2: Rename and update setup test**

Rename test file to `WhatsAppKapsoSetup.test.tsx` and update assertions.

- [ ] **Step 3: Update E2E tests**

In `e2e/whatsapp.spec.ts`, replace:
- Route `evolution-manager` → `kapso-manager`
- Text "Evolution API" → "Kapso API"
- Update any 3 test cases that reference Evolution-specific flows.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```

Expected: All tests pass with 0 failures.

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/tests/ src/features/whatsapp/__tests__/ e2e/
git commit -m "test: update tests for Kapso migration"
```

---

## Phase 11: Deploy & Configure

### Task 20: Configure Kapso and deploy

- [ ] **Step 1: Create Kapso account**

Go to https://kapso.ai and create account. Start with Pro plan ($25/month).

- [ ] **Step 2: Set up WhatsApp Business Account**

Complete Meta Business verification and connect WhatsApp number through Kapso dashboard.

- [ ] **Step 3: Get API credentials**

From Kapso dashboard, copy:
- API Key → `KAPSO_API_KEY`
- Phone Number ID → `KAPSO_PHONE_NUMBER_ID`
- Webhook Secret → `KAPSO_WEBHOOK_SECRET`

- [ ] **Step 4: Configure Supabase secrets**

```bash
SUPABASE_ACCESS_TOKEN=sbp_... supabase secrets set \
  KAPSO_API_KEY="your_kapso_api_key" \
  KAPSO_PHONE_NUMBER_ID="your_phone_number_id" \
  KAPSO_WEBHOOK_SECRET="your_webhook_secret" \
  --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 5: Configure Kapso webhook**

In Kapso dashboard, set webhook URL to:
```
https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook
```

Events to subscribe: `whatsapp.message.received`, `whatsapp.message.sent`, `whatsapp.message.delivered`, `whatsapp.message.read`

- [ ] **Step 6: Deploy edge functions**

```bash
supabase functions deploy kapso-manager --project-ref yfxgncbopvnsltjqetxw
supabase functions deploy send-whatsapp-message --project-ref yfxgncbopvnsltjqetxw
supabase functions deploy whatsapp-webhook --project-ref yfxgncbopvnsltjqetxw
supabase functions deploy process-prazos-alerts --project-ref yfxgncbopvnsltjqetxw
supabase functions deploy health-check --project-ref yfxgncbopvnsltjqetxw
```

- [ ] **Step 7: Deploy frontend**

```bash
vercel --prod --token [TOKEN]
```

- [ ] **Step 8: Verify health check**

```bash
curl -s "https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "x-health-check-token: b42379f3-7ffd-4e71-9137-d49c4db17c79"
```

Expected: `whatsapp_kapso: connected`

- [ ] **Step 9: Remove old Evolution secrets**

```bash
SUPABASE_ACCESS_TOKEN=sbp_... supabase secrets unset \
  EVOLUTION_API_URL \
  EVOLUTION_API_BASE_URL \
  EVOLUTION_API_KEY \
  EVOLUTION_WEBHOOK_SECRET \
  --project-ref yfxgncbopvnsltjqetxw
```

---

## Summary

| Phase | Tasks | Estimated Steps |
|-------|-------|----------------|
| 1. Shared Client | Task 1 | 2 |
| 2. Kapso Manager | Task 2 | 4 |
| 3. Message Sending | Task 3 | 6 |
| 4. Webhook Processing | Task 4 | 6 |
| 5. Supporting Functions | Tasks 5-7 | 9 |
| 6. Environment & DB | Task 8 | 3 |
| 7. Conexões Redesign | Tasks 9-13 | 15 |
| 8. Supporting Frontend | Tasks 14-16 | 7 |
| 9. Cleanup & CI/CD | Tasks 17-18 | 10 |
| 10. Testing | Task 19 | 7 |
| 11. Deploy | Task 20 | 9 |
| **Total** | **20 tasks** | **78 steps** |

**Critical path:** Phase 1 → 2 → 3 → 4 (backend first), then Phase 7 (frontend) can run in parallel with Phase 5-6. Phase 9-10 after all code changes. Phase 11 last.

**Note on GripVertical handles:** The drag handles in image 7 are decorative/visual only. No drag-and-drop reordering library is needed — the `GripVertical` icon is purely cosmetic to match the LíderHub design.
