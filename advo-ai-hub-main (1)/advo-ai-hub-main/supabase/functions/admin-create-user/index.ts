import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = userData.user.id;
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", requesterId)
      .single();

    if (profileError || !requesterProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant not found for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role, ativo")
      .eq("user_id", requesterId)
      .eq("tenant_id", requesterProfile.tenant_id)
      .eq("ativo", true);

    if (rolesError) {
      return new Response(JSON.stringify({ error: "Failed to validate roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (rolesData || []).some((r) => r.role === "administrador");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      email,
      password,
      nome_completo,
      telefone,
      cargo,
      departamento,
      roles = [],
    } = body ?? {};

    if (!email || !password || !nome_completo) {
      return new Response(
        JSON.stringify({ error: "email, password e nome_completo sao obrigatorios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo },
    });

    if (createError || !createdUser?.user) {
      throw createError || new Error("Failed to create user");
    }

    const userId = createdUser.user.id;

    const { error: profileInsertError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        tenant_id: requesterProfile.tenant_id,
        nome_completo,
        email,
        telefone: telefone || null,
        cargo: cargo || null,
        departamento: departamento || null,
        ativo: true,
      });

    if (profileInsertError) {
      throw profileInsertError;
    }

    if (Array.isArray(roles) && roles.length > 0) {
      const rolesToInsert = roles.map((role: string) => ({
        tenant_id: requesterProfile.tenant_id,
        user_id: userId,
        role,
        ativo: true,
      }));

      const { error: rolesInsertError } = await supabase
        .from("user_roles")
        .upsert(rolesToInsert, { onConflict: "user_id,role" });

      if (rolesInsertError) {
        throw rolesInsertError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[admin-create-user] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
