import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  const startTime = Date.now();


  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Authorization header required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found for user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateLimitCheck = await applyRateLimit(
      req,
      {
        maxRequests: 20,
        windowSeconds: 60,
        namespace: 'agentes-ia-api'
      },
      {
        supabase: supabaseClient,
        user,
        corsHeaders
      }
    );

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    // Parsear request
    const { agente_id, input_usuario, use_n8n = false } = await req.json();

    if (!agente_id || !input_usuario) {
      return new Response(
        JSON.stringify({ error: 'agente_id e input_usuario são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Buscar dados do agente
    const { data: agente, error: agenteError } = await supabaseClient
      .from('agentes_ia')
      .select('*')
      .eq('id', agente_id)
      .eq('ativo', true)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (agenteError || !agente) {
      console.error('❌ [Agentes API] Agente não encontrado:', agenteError);
      return new Response(
        JSON.stringify({ error: 'Agente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Criar log inicial
    const { data: logData } = await supabaseClient
      .from('logs_execucao_agentes')
      .insert({
        agente_id,
        tenant_id: profile.tenant_id,
        input_recebido: input_usuario,
        status: 'processing',
        api_key_usado: 'openai'
      })
      .select()
      .single();


    // Buscar OpenAI API Key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Chamar OpenAI

    const openaiPayload = {
      model: agente.modelo_ia || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: agente.prompt_sistema || 'Você é um assistente jurídico.' },
        { role: 'user', content: input_usuario }
      ],
      temperature: agente.temperatura || 0.7,
      max_tokens: 500
    };

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiPayload),
    });

    const responseData = await openaiResponse.json();
    const executionTime = Date.now() - startTime;

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI Error: ${responseData.error?.message || 'Erro desconhecido'}`);
    }

    const aiResponse = responseData.choices[0]?.message?.content || 'Resposta não disponível';

    // Atualizar log
    if (logData?.id) {
      await supabaseClient
        .from('logs_execucao_agentes')
        .update({
          resposta_ia: aiResponse,
          status: 'success',
          tempo_execucao: executionTime,
          api_key_usado: 'openai'
        })
        .eq('id', logData.id);
    }


    return new Response(JSON.stringify({
      success: true,
      source: 'openai',
      response: aiResponse,
      agente_nome: agente.nome,
      execution_time: executionTime,
      tokens: responseData.usage
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [Agentes API] Erro:', error);

    return new Response(
      JSON.stringify({
        error: 'Erro ao processar requisição',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
