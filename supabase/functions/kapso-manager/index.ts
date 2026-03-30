/**
 * KAPSO MANAGER - Edge Function
 *
 * Manages WhatsApp connections via Kapso Platform API.
 * Operations: create/find customer, generate setup link, check status, disconnect.
 *
 * Kapso model:
 * - POST /platform/v1/customers           → create customer (1:1 with Jurify tenant)
 * - GET  /platform/v1/customers           → list customers
 * - GET  /platform/v1/customers/{id}      → customer detail
 * - POST /platform/v1/customers/{id}/setup_links → onboarding URL (Meta Embedded Signup)
 *
 * Message sending (unchanged):
 * - POST /meta/whatsapp/v24.0/{phoneNumberId}/messages
 *
 * @version 2.0.0 — Kapso-native, Evolution fully removed
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { kapsoFetch, checkKapsoHealth } from "../_shared/kapso-client.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logConexaoEvent(
  supabase: ReturnType<typeof createClient>,
  conexaoId: string,
  tenantId: string,
  evento: string,
  severidade: 'debug' | 'info' | 'warning' | 'error' | 'critical',
  descricao?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('conexoes_logs').insert({
      conexao_id: conexaoId,
      tenant_id: tenantId,
      evento,
      severidade,
      descricao: descricao ?? null,
      origem: 'kapso-manager',
      metadata: metadata ?? {},
    });
  } catch (e) {
    console.error('[logConexaoEvent] failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Kapso Platform API Operations
// ---------------------------------------------------------------------------

/** Find or create a Kapso customer for this Jurify tenant. */
async function ensureKapsoCustomer(
  tenantId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ customerId: string; isNew: boolean }> {
  const externalId = `jurify_${tenantId.substring(0, 8)}`;

  // 1. Check if we already have the Kapso customer ID stored
  const { data: config } = await supabase
    .from('configuracoes_integracoes')
    .select('id, observacoes, status')
    .eq('nome_integracao', 'whatsapp_kapso')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (config?.observacoes) {
    const match = (config.observacoes as string).match(/kapso_customer:(.+)/);
    if (match) return { customerId: match[1].trim(), isNew: false };
  }

  // 2. Search Kapso by external_customer_id
  const listRes = await kapsoFetch('/platform/v1/customers');
  if (listRes.ok) {
    const listData = await listRes.json();
    const existing = listData?.data?.find(
      (c: { external_customer_id: string }) => c.external_customer_id === externalId
    );
    if (existing?.id) {
      // Store for future lookups
      await upsertConfig(supabase, tenantId, existing.id, config?.id);
      return { customerId: existing.id, isNew: false };
    }
  }

  // 3. Create new customer on Kapso
  const createRes = await kapsoFetch('/platform/v1/customers', {
    method: 'POST',
    body: JSON.stringify({
      customer: { external_customer_id: externalId, name: `Jurify ${externalId}` },
    }),
  });

  const createData = await createRes.json().catch(() => ({}));

  if (createRes.status === 422 && /already been taken/i.test(createData?.error || '')) {
    // Race condition: customer was created between our list and create calls.
    // Re-fetch the list to find it.
    const retryRes = await kapsoFetch('/platform/v1/customers');
    const retryData = await retryRes.json().catch(() => ({ data: [] }));
    const found = retryData?.data?.find(
      (c: { external_customer_id: string }) => c.external_customer_id === externalId
    );
    if (found?.id) {
      await upsertConfig(supabase, tenantId, found.id, config?.id);
      return { customerId: found.id, isNew: false };
    }
    throw new Error('Customer exists in Kapso but could not be found.');
  }

  if (!createRes.ok) {
    throw new Error(createData?.message || createData?.error || `Kapso customer creation failed (${createRes.status})`);
  }

  const customerId = createData?.data?.id;
  if (!customerId) throw new Error('Kapso returned no customer ID.');

  await upsertConfig(supabase, tenantId, customerId, config?.id);
  return { customerId, isNew: true };
}

/** Store Kapso customer ID in configuracoes_integracoes. */
async function upsertConfig(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  kapsoCustomerId: string,
  existingId?: string
) {
  const record = {
    nome_integracao: 'whatsapp_kapso' as const,
    status: 'ativa' as const,
    api_key: 'kapso_managed',
    endpoint_url: Deno.env.get('KAPSO_API_URL') || 'https://api.kapso.ai',
    observacoes: `kapso_customer:${kapsoCustomerId}`,
    tenant_id: tenantId,
  };

  if (existingId) {
    await supabase.from('configuracoes_integracoes').update(record).eq('id', existingId);
  } else {
    await supabase.from('configuracoes_integracoes').insert(record);
  }
}

/** Generate a Kapso setup link for Meta Embedded Signup. */
async function createSetupLink(customerId: string): Promise<{ url: string }> {
  const res = await kapsoFetch(`/platform/v1/customers/${customerId}/setup_links`, {
    method: 'POST',
    body: JSON.stringify({ setup_link: {} }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.detail || `Setup link creation failed (${res.status})`);
  }

  const url = data?.data?.url || data?.url || data?.data?.setup_url;
  if (!url) throw new Error('Kapso returned no setup link URL.');

  return { url };
}

/** Get customer detail from Kapso. */
async function getCustomerDetail(customerId: string) {
  const res = await kapsoFetch(`/platform/v1/customers/${customerId}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { success: false, error: data?.message || `Status check failed (${res.status})` };
  }

  return { success: true, customer: data?.data || data };
}

// ---------------------------------------------------------------------------
// Request interface
// ---------------------------------------------------------------------------

interface KapsoRequest {
  action: 'setup' | 'setup-link' | 'status' | 'health';
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin') || undefined);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized - Invalid token');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) throw new Error('Tenant not found');

    if (!['admin', 'manager', 'user', 'viewer'].includes(profile.role ?? '')) {
      return new Response(
        JSON.stringify({ error: 'Permissão insuficiente.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { action }: KapsoRequest = await req.json();
    let result: Record<string, unknown>;

    switch (action) {
      case 'health': {
        const health = await checkKapsoHealth();
        result = { success: health.status === 'connected', ...health };
        break;
      }

      case 'setup': {
        // Find or create Kapso customer, then generate setup link
        const { customerId, isNew } = await ensureKapsoCustomer(profile.tenant_id, supabase);
        const { url } = await createSetupLink(customerId);

        result = {
          success: true,
          setupUrl: url,
          customerId,
          isNewCustomer: isNew,
        };

        console.log(`[kapso-manager] setup link generated for tenant ${profile.tenant_id} (customer ${customerId})`);
        break;
      }

      case 'setup-link': {
        // Generate a new setup link for existing customer
        const { customerId } = await ensureKapsoCustomer(profile.tenant_id, supabase);
        const { url } = await createSetupLink(customerId);

        result = { success: true, setupUrl: url, customerId };
        break;
      }

      case 'status': {
        // Check customer status on Kapso
        const { customerId } = await ensureKapsoCustomer(profile.tenant_id, supabase);
        const detail = await getCustomerDetail(customerId);
        result = { ...detail, customerId };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[kapso-manager] Error:', error instanceof Error ? error.message : error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('Unauthorized') ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode },
    );
  }
});
