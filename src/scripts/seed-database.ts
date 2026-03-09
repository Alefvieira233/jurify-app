import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

/**
 * seedDatabase — Popula o banco com dados realistas de demonstração.
 * Idempotente: lança erro se já existirem dados para o tenant.
 * Seguro para produção: usa tenant_id do usuário autenticado.
 */
export const seedDatabase = async () => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw authError ?? new Error('Usuário não autenticado');
  }

  const userId = authData.user.id;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('tenant_id, nome_completo')
    .eq('id', userId)
    .single();

  const tenantId = profileData?.tenant_id;
  if (!tenantId) throw new Error('Perfil não encontrado. Faça logout e login novamente.');

  // ── Idempotência ──────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error('Dados de demonstração já foram carregados anteriormente.');
  }

  const responsavel = profileData?.nome_completo ?? authData.user.email ?? 'Sistema';
  const hoje = new Date();
  const d = (days: number) => new Date(hoje.getTime() + days * 86_400_000).toISOString();

  // ── 1. Leads ──────────────────────────────────────────────────────────────
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .insert([
      {
        tenant_id: tenantId,
        responsavel_id: userId,
        nome: 'Maria Silva Santos (Demo)',
        email: 'maria.silva@demo.com',
        telefone: '(11) 99999-1111',
        area_juridica: 'Direito Trabalhista',
        origem: 'Google Ads',
        valor_causa: 28000,
        status: 'novo_lead',
        descricao: 'Reclamação trabalhista por horas extras não pagas e FGTS.',
      },
      {
        tenant_id: tenantId,
        responsavel_id: userId,
        nome: 'Sérgio Mendes (Demo)',
        email: 'sergio.mendes@demo.com',
        telefone: '(11) 98888-2222',
        area_juridica: 'Direito de Família',
        origem: 'Indicação',
        valor_causa: 15000,
        status: 'em_qualificacao',
        descricao: 'Divórcio consensual com partilha de bens.',
      },
      {
        tenant_id: tenantId,
        responsavel_id: userId,
        nome: 'Construtora Alpha Ltda (Demo)',
        email: 'juridico@alpha.com.br',
        telefone: '(11) 3333-4444',
        area_juridica: 'Direito Civil',
        origem: 'LinkedIn',
        valor_causa: 180000,
        status: 'proposta_enviada',
        descricao: 'Ação de cobrança por inadimplemento em contrato de empreitada.',
      },
      {
        tenant_id: tenantId,
        responsavel_id: userId,
        nome: 'Roberto Almeida (Demo)',
        email: 'roberto@demo.com',
        telefone: '(11) 97777-5555',
        area_juridica: 'Direito Empresarial',
        origem: 'Networking',
        valor_causa: 450000,
        status: 'contrato_assinado',
        descricao: 'Consultoria jurídica em fusão e aquisição de empresas.',
      },
    ])
    .select('id, nome');

  if (leadsErr) throw new Error(`Erro ao criar leads: ${leadsErr.message}`);

  const leadId = (partial: string) =>
    leads?.find(l => (l.nome as string).includes(partial))?.id ?? null;

  // ── 2. Processos ──────────────────────────────────────────────────────────
  const { data: processos, error: processosErr } = await supabase
    .from('processos')
    .insert([
      {
        tenant_id: tenantId,
        lead_id: leadId('Maria'),
        titulo: 'Reclamação Trabalhista — Maria Silva Santos',
        numero_processo: '0001234-56.2024.5.02.0001',
        tipo_acao: 'trabalhista',
        fase_processual: 'instrucao',
        posicao: 'autor',
        status: 'ativo',
        tribunal: 'TRT 2ª Região',
        vara: '5ª Vara do Trabalho de São Paulo',
        comarca: 'São Paulo',
        valor_causa: 28000,
        data_distribuicao: d(-120),
      },
      {
        tenant_id: tenantId,
        lead_id: leadId('Construtora'),
        titulo: 'Ação de Cobrança — Alpha Construtora',
        numero_processo: '0009876-54.2024.8.26.0100',
        tipo_acao: 'civil',
        fase_processual: 'conhecimento',
        posicao: 'autor',
        status: 'ativo',
        tribunal: 'TJSP',
        vara: '3ª Vara Cível',
        comarca: 'São Paulo',
        valor_causa: 180000,
        data_distribuicao: d(-60),
      },
      {
        tenant_id: tenantId,
        lead_id: leadId('Roberto'),
        titulo: 'Consultoria M&A — Roberto Almeida',
        tipo_acao: 'empresarial',
        fase_processual: 'acordo',
        posicao: 'autor',
        status: 'ativo',
        tribunal: 'Câmara de Arbitragem',
        comarca: 'São Paulo',
        valor_causa: 450000,
        data_distribuicao: d(-30),
      },
    ])
    .select('id, titulo');

  if (processosErr) throw new Error(`Erro ao criar processos: ${processosErr.message}`);

  const processoId = (partial: string) =>
    processos?.find(p => (p.titulo as string).includes(partial))?.id ?? null;

  // ── 3. Contratos ──────────────────────────────────────────────────────────
  const { error: contratosErr } = await supabase
    .from('contratos')
    .insert([
      {
        tenant_id: tenantId,
        lead_id: leadId('Roberto'),
        nome_cliente: 'Roberto Almeida',
        area_juridica: 'Direito Empresarial',
        valor_causa: 450000,
        texto_contrato: 'Contrato de Prestação de Serviços Advocatícios para consultoria em fusão e aquisição de empresas.',
        status: 'assinado',
        responsavel,
        data_assinatura: d(-20),
      },
      {
        tenant_id: tenantId,
        lead_id: leadId('Construtora'),
        nome_cliente: 'Construtora Alpha Ltda',
        area_juridica: 'Direito Civil',
        valor_causa: 180000,
        texto_contrato: 'Contrato de Prestação de Serviços Advocatícios para ação de cobrança por inadimplemento contratual.',
        status: 'enviado',
        responsavel,
      },
      {
        tenant_id: tenantId,
        lead_id: leadId('Maria'),
        nome_cliente: 'Maria Silva Santos',
        area_juridica: 'Direito Trabalhista',
        valor_causa: 28000,
        texto_contrato: 'Contrato de Honorários — Reclamação Trabalhista. Honorários fixados em 20% sobre o valor da causa.',
        status: 'assinado',
        responsavel,
        data_assinatura: d(-110),
      },
    ]);

  if (contratosErr) throw new Error(`Erro ao criar contratos: ${contratosErr.message}`);

  // ── 4. Prazos Processuais ─────────────────────────────────────────────────
  const { error: prazosErr } = await supabase
    .from('prazos_processuais')
    .insert([
      {
        tenant_id: tenantId,
        processo_id: processoId('Maria'),
        tipo: 'audiencia',
        descricao: 'Audiência de Instrução — Oitiva de testemunhas',
        data_prazo: d(5),
        alertas_dias: [7, 3, 1],
        status: 'pendente',
        responsavel_id: userId,
      },
      {
        tenant_id: tenantId,
        processo_id: processoId('Maria'),
        tipo: 'manifestacao',
        descricao: 'Manifestação sobre documentos juntados pela ré',
        data_prazo: d(2),
        alertas_dias: [3, 1],
        status: 'pendente',
        responsavel_id: userId,
      },
      {
        tenant_id: tenantId,
        processo_id: processoId('Alpha'),
        tipo: 'peticao',
        descricao: 'Petição inicial com rol de documentos',
        data_prazo: d(12),
        alertas_dias: [15, 7, 3],
        status: 'pendente',
        responsavel_id: userId,
      },
      {
        tenant_id: tenantId,
        processo_id: processoId('Alpha'),
        tipo: 'prazo_fatal',
        descricao: 'Prazo fatal para contestação — preclusão',
        data_prazo: d(-3),
        alertas_dias: [7, 3, 1],
        status: 'vencido',
        responsavel_id: userId,
      },
      {
        tenant_id: tenantId,
        processo_id: processoId('Roberto'),
        tipo: 'outro',
        descricao: 'Entrega de due diligence ao cliente',
        data_prazo: d(20),
        alertas_dias: [30, 15, 7],
        status: 'pendente',
        responsavel_id: userId,
      },
    ]);

  if (prazosErr) throw new Error(`Erro ao criar prazos: ${prazosErr.message}`);

  // ── 5. Honorários ─────────────────────────────────────────────────────────
  const { error: honorariosErr } = await supabase
    .from('honorarios')
    .insert([
      {
        tenant_id: tenantId,
        processo_id: processoId('Roberto'),
        lead_id: leadId('Roberto'),
        tipo: 'fixo',
        valor_total_acordado: 45000,
        valor_adiantamento: 15000,
        valor_recebido: 30000,
        status: 'vigente',
        data_vencimento: d(30),
        observacoes: 'Pagamento em 3 parcelas conforme acordo.',
      },
      {
        tenant_id: tenantId,
        processo_id: processoId('Maria'),
        lead_id: leadId('Maria'),
        tipo: 'contingencia',
        taxa_contingencia: 20,
        valor_total_acordado: 5600,
        valor_recebido: 0,
        status: 'vigente',
        data_vencimento: d(180),
        observacoes: '20% sobre o valor da condenação.',
      },
    ]);

  if (honorariosErr) throw new Error(`Erro ao criar honorários: ${honorariosErr.message}`);

  // ── 6. Agendamentos ───────────────────────────────────────────────────────
  const { error: agendErr } = await supabase
    .from('agendamentos')
    .insert([
      {
        tenant_id: tenantId,
        titulo: 'Audiência de Instrução — Maria Silva Santos',
        data_hora: d(5),
        status: 'agendado',
        tipo: 'audiencia',
        descricao: 'TRT 2ª Região — 5ª Vara do Trabalho',
      },
      {
        tenant_id: tenantId,
        titulo: 'Reunião de Due Diligence — Roberto Almeida',
        data_hora: d(3),
        status: 'agendado',
        tipo: 'reuniao',
        descricao: 'Apresentação do relatório preliminar de M&A',
      },
      {
        tenant_id: tenantId,
        titulo: 'Consulta Inicial — Sérgio Mendes',
        data_hora: d(1),
        status: 'agendado',
        tipo: 'consulta',
        descricao: 'Divórcio consensual — análise de documentos',
      },
    ]);

  if (agendErr) throw new Error(`Erro ao criar agendamentos: ${agendErr.message}`);
};
