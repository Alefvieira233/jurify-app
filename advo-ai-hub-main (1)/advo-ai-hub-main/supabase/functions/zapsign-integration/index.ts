
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { getCorsHeaders } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const zapSignApiKey = Deno.env.get('ZAPSIGN_API_KEY');

interface ZapSignDocument {
  uuid: string;
  external_id: string;
  name: string;
  status: string;
  url_sign: string;
  created_at: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rateLimitCheck = await applyRateLimit(
    req,
    {
      maxRequests: 10,
      windowSeconds: 60,
      namespace: "zapsign-integration",
    },
    {
      supabase,
      user,
      corsHeaders,
    }
  );

  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response;
  }

  try {
    const { action, contratoId, contractData } = await req.json();

    if (!zapSignApiKey) {
      throw new Error('ZapSign API key não configurada');
    }

    switch (action) {
      case 'create_document': {
        // Criar documento na ZapSign
        const response = await fetch('https://sandbox.zapsign.com.br/api/v1/docs/', {
          method: 'POST',
          headers: {
            'Authorization': `Api-Key ${zapSignApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Contrato - ${contractData.nome_cliente}`,
            external_id: contratoId,
            url_pdf: contractData.pdf_url || '',
            disable_signer_emails: true,
            signers: [{
              name: contractData.nome_cliente,
              email: contractData.email || '',
              phone: contractData.telefone || '',
              lang: 'pt-br'
            }]
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro da ZapSign: ${response.status}`);
        }

        const zapSignDoc: ZapSignDocument = await response.json();

        // Atualizar contrato no Supabase
        const { error: updateError } = await supabase
          .from('contratos')
          .update({
            zapsign_document_id: zapSignDoc.uuid,
            link_assinatura_zapsign: zapSignDoc.url_sign,
            data_geracao_link: new Date().toISOString(),
            status_assinatura: 'pendente'
          })
          .eq('id', contratoId);

        if (updateError) throw updateError;

        // Log do evento
        await supabase
          .from('zapsign_logs')
          .insert({
            contrato_id: contratoId,
            evento: 'link_gerado',
            dados_evento: { zapsign_document_id: zapSignDoc.uuid, url_sign: zapSignDoc.url_sign }
          });

        return new Response(JSON.stringify({ 
          success: true, 
          document: zapSignDoc 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_status': {
        const { data: contrato } = await supabase
          .from('contratos')
          .select('zapsign_document_id')
          .eq('id', contratoId)
          .single();

        if (!contrato?.zapsign_document_id) {
          throw new Error('Documento não encontrado na ZapSign');
        }

        // Verificar status na ZapSign
        const response = await fetch(`https://sandbox.zapsign.com.br/api/v1/docs/${contrato.zapsign_document_id}/`, {
          headers: {
            'Authorization': `Api-Key ${zapSignApiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Erro da ZapSign: ${response.status}`);
        }

        const zapSignDoc: ZapSignDocument = await response.json();
        let newStatus = 'pendente';

        switch (zapSignDoc.status) {
          case 'signed':
            newStatus = 'assinado';
            break;
          case 'cancelled':
            newStatus = 'cancelado';
            break;
          case 'expired':
            newStatus = 'expirado';
            break;
        }

        // Atualizar status no Supabase se mudou
        const { data: currentContrato } = await supabase
          .from('contratos')
          .select('status_assinatura')
          .eq('id', contratoId)
          .single();

        if (currentContrato?.status_assinatura !== newStatus) {
          await supabase
            .from('contratos')
            .update({
              status_assinatura: newStatus,
              ...(newStatus === 'assinado' && { data_assinatura: new Date().toISOString() })
            })
            .eq('id', contratoId);

          // Log do evento
          await supabase
            .from('zapsign_logs')
            .insert({
              contrato_id: contratoId,
              evento: newStatus,
              dados_evento: { status_anterior: currentContrato?.status_assinatura, status_novo: newStatus }
            });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          status: newStatus,
          document: zapSignDoc 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Ação não reconhecida');
    }
  } catch (error) {
    console.error('Erro na integração ZapSign:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
