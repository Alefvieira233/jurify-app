import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

console.log("🚀 Generate Document Function Started");

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Rate limit: 10 requests per 60 seconds (resource-intensive PDF generation)
        const rateLimitCheck = await applyRateLimit(
            req,
            { maxRequests: 10, windowSeconds: 60, namespace: "generate-document" },
            { corsHeaders }
        );

        if (!rateLimitCheck.allowed) {
            return rateLimitCheck.response;
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        const body = await req.json();
        const { title, content, leadId } = body;

        if (typeof title !== 'string' && title !== undefined) {
            throw new Error("Invalid payload: 'title' must be a string");
        }
        if (typeof content !== 'string' && content !== undefined) {
            throw new Error("Invalid payload: 'content' must be a string");
        }
        if (typeof leadId !== 'string' && leadId !== undefined) {
            throw new Error("Invalid payload: 'leadId' must be a string");
        }

        // Validate tenant ownership of the lead
        if (leadId) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("tenant_id")
                .eq("id", user.id)
                .single();

            if (!profile?.tenant_id) throw new Error("Tenant not found for user");

            const { data: lead, error: leadError } = await supabase
                .from("leads")
                .select("id")
                .eq("id", leadId)
                .eq("tenant_id", profile.tenant_id)
                .maybeSingle();

            if (leadError || !lead) {
                throw new Error("Lead not found or access denied");
            }
        }

        // Create PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        page.drawText(title || "Contrato de Prestação de Serviços", {
            x: 50,
            y: height - 50,
            size: 20,
            font: font,
            color: rgb(0, 0, 0),
        });

        page.drawText(content || "Conteúdo do contrato...", {
            x: 50,
            y: height - 100,
            size: 12,
            font: font,
            maxWidth: width - 100,
            lineHeight: 18,
        });

        const pdfBytes = await pdfDoc.save();

        // Upload to Storage
        const fileName = `contrato_${leadId}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from("documents")
            .upload(fileName, pdfBytes, {
                contentType: "application/pdf",
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from("documents")
            .getPublicUrl(fileName);

        return new Response(
            JSON.stringify({ url: publicUrl, path: fileName }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("❌ Error generating document:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
