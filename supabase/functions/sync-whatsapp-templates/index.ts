/**
 * 🔄 SYNC WHATSAPP TEMPLATES - Edge Function
 *
 * Puxa lista de templates da Kapso/Meta WABA do tenant e sincroniza no
 * cache local (whatsapp_meta_templates). Chamado:
 *   - manual (botão "Sincronizar templates" na UI)
 *   - cron (futuramente diário)
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";

interface MetaTemplate {
  id?: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: Array<{ type: string; text?: string; format?: string; buttons?: unknown[]; example?: unknown }>;
}

function countParameters(components: unknown[]): number {
  let count = 0;
  for (const c of components as Array<{ text?: string; type?: string }>) {
    if (c.type === 'BODY' && c.text) {
      const matches = c.text.match(/\{\{\d+\}\}/g);
      count = Math.max(count, matches?.length ?? 0);
    }
  }
  return count;
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
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso) throw new Error("Conecte WhatsApp em /conexoes primeiro");

    // Kapso expõe templates via /platform/v1/whatsapp/message_templates
    const templatesRes = await kapsoFetchWithKey(
      kapso.apiKey,
      `/platform/v1/whatsapp/message_templates`,
      { method: "GET" },
      kapso.apiUrl,
    );

    if (!templatesRes.ok) {
      const errBody = await templatesRes.text();
      console.error(`[sync-templates] HTTP ${templatesRes.status}:`, errBody.slice(0, 400));
      return new Response(JSON.stringify({
        success: false,
        error: "Falha ao listar templates na Kapso. Verifique configuração WABA.",
        upstream_status: templatesRes.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    const data = await templatesRes.json().catch(() => ({ data: [] }));
    const templates = (data?.data || data?.templates || []) as MetaTemplate[];

    let inserted = 0;
    let updated = 0;
    const synced_at = new Date().toISOString();

    for (const t of templates) {
      const components = t.components || [];
      const param_count = countParameters(components);
      const record = {
        tenant_id: tenantId,
        meta_template_id: t.id || null,
        name: t.name,
        language: t.language || "pt_BR",
        category: (t.category || "UTILITY").toUpperCase(),
        status: (t.status || "PENDING").toUpperCase(),
        components,
        parameter_count: param_count,
        last_synced_at: synced_at,
        updated_at: synced_at,
      };

      const { data: existing } = await supabase
        .from("whatsapp_meta_templates")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", t.name)
        .eq("language", t.language || "pt_BR")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("whatsapp_meta_templates")
          .update(record)
          .eq("id", (existing as { id: string }).id);
        updated++;
      } else {
        await supabase.from("whatsapp_meta_templates").insert(record);
        inserted++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: templates.length,
      inserted,
      updated,
      synced_at,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[sync-whatsapp-templates] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Conecte") ? 422 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
