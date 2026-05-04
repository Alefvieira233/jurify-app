/**
 * 🏢 WHATSAPP BUSINESS PROFILE - Edge Function
 *
 * Lê e atualiza o profile do número WhatsApp Business (descrição, email,
 * website, address, vertical) que aparece pro cliente quando ele abre
 * o contato no WhatsApp dele.
 *
 * Body (POST):
 *  - action: "get" | "update"
 *  - profile?: campos a atualizar (apenas no action=update)
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { kapsoFetchWithKey, getTenantKapsoConfig } from "../_shared/kapso-client.ts";

interface ProfileFields {
  about?: string;            // max 139 chars
  description?: string;      // max 512
  email?: string;
  websites?: string[];       // max 2
  address?: string;          // max 256
  vertical?: string;         // PROFESSIONAL_SERVICES | LEGAL | etc
  profile_picture_url?: string; // URL HTTPS
}

interface ProfileRequest {
  action: "get" | "update";
  profile?: ProfileFields;
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
    const rl = await applyRateLimit(req, { maxRequests: 20, windowSeconds: 60, namespace: "wa-profile" }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    const body = await req.json() as ProfileRequest;
    if (!body.action || !["get", "update"].includes(body.action)) throw new Error("action precisa ser get ou update");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant não encontrado");

    const kapso = await getTenantKapsoConfig(supabase, tenantId);
    if (!kapso || !kapso.phoneNumberId) throw new Error("WhatsApp não conectado");

    if (body.action === "get") {
      const res = await kapsoFetchWithKey(
        kapso.apiKey,
        `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
        { method: "GET" },
        kapso.apiUrl,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, error: "Falha ao ler profile", upstream: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
      }
      // Meta retorna { data: [{...}] }
      const p = data?.data?.[0] || data || {};
      return new Response(JSON.stringify({
        success: true,
        profile: {
          about: p.about ?? "",
          description: p.description ?? "",
          email: p.email ?? "",
          websites: p.websites ?? [],
          address: p.address ?? "",
          vertical: p.vertical ?? "",
          profile_picture_url: p.profile_picture_url ?? "",
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // action === "update"
    const fields = body.profile;
    if (!fields) throw new Error("profile obrigatório quando action=update");

    if (fields.about && fields.about.length > 139) throw new Error("about max 139 caracteres");
    if (fields.description && fields.description.length > 512) throw new Error("description max 512 caracteres");
    if (fields.address && fields.address.length > 256) throw new Error("address max 256 caracteres");
    if (fields.websites && fields.websites.length > 2) throw new Error("Máximo 2 websites");
    for (const w of fields.websites || []) {
      if (!/^https?:\/\//.test(w)) throw new Error(`website inválido: ${w}`);
    }
    if (fields.email && !/^[^@]+@[^@]+\.[^@]+$/.test(fields.email)) throw new Error("email inválido");

    // Meta requer messaging_product: "whatsapp"
    const updateBody: Record<string, unknown> = { messaging_product: "whatsapp" };
    if (fields.about !== undefined) updateBody.about = fields.about;
    if (fields.description !== undefined) updateBody.description = fields.description;
    if (fields.email !== undefined) updateBody.email = fields.email;
    if (fields.websites !== undefined) updateBody.websites = fields.websites;
    if (fields.address !== undefined) updateBody.address = fields.address;
    if (fields.vertical !== undefined) updateBody.vertical = fields.vertical;
    if (fields.profile_picture_url !== undefined) updateBody.profile_picture_url = fields.profile_picture_url;

    const res = await kapsoFetchWithKey(
      kapso.apiKey,
      `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/whatsapp_business_profile`,
      { method: "POST", body: JSON.stringify(updateBody) },
      kapso.apiUrl,
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[wa-profile] update HTTP ${res.status}:`, JSON.stringify(data).slice(0, 400));
      return new Response(JSON.stringify({ success: false, error: "Falha ao atualizar profile", upstream: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 });
    }

    return new Response(JSON.stringify({ success: true, updated: Object.keys(updateBody).filter(k => k !== "messaging_product") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[whatsapp-business-profile] error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Unauthorized") ? 401
                 : msg.includes("obrigatório") || msg.includes("inválido") || msg.includes("max") || msg.includes("Máximo") ? 400
                 : msg.includes("não conectado") ? 422 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
});
