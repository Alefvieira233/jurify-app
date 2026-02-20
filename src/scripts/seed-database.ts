import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type SeedLead = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  area_juridica: string;
  origem: string;
  valor_causa?: number | null;
  status?: string;
  descricao?: string | null;
  tenant_id?: string | null;
  responsavel_id?: string | null;
  metadata?: Json | null;
};

export const seedDatabase = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw authError || new Error('Usuário não autenticado');
  }

  // 1. Tentar buscar perfil existente
  let { data: profileData } = await supabase
    .from('profiles')
    .select('tenant_id, nome_completo')
    .eq('id', authData.user.id)
    .single();

  let tenantId = profileData?.tenant_id;

  // 2. Se não existir perfil, criar um novo (Self-Healing)
  if (!profileData) {
    console.log('Perfil não encontrado. Criando novo perfil para o usuário...');

    // Gerar um tenant_id novo se não existir
    tenantId = crypto.randomUUID();

    const newProfile = {
      id: authData.user.id,
      email: authData.user.email,
      nome_completo: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Usuario Novo',
      role: 'admin', // Dar permissão de admin para o primeiro usuário
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert(newProfile);

    if (createProfileError) {
      console.error('Erro ao criar perfil automatico:', createProfileError);
      throw new Error('Falha ao criar perfil de usuário. Contate o suporte.');
    }

    // Atualizar referencias locais
    profileData = { tenant_id: tenantId, nome_completo: newProfile.nome_completo };
  }

  if (!tenantId) {
    throw new Error('Tenant ID não pode ser nulo após tentativa de correção.');
  }

  const responsavelNome = profileData?.nome_completo || authData.user.email || 'Sistema';

  // 3. Criar Leads de Teste
  const leads: SeedLead[] = [
    {
      nome: 'Maria Silva (Demo)',
      email: 'maria.demo@jurify.com',
      telefone: '(11) 99999-1111',
      area_juridica: 'Direito Trabalhista',
      origem: 'Google Ads',
      valor_causa: 25000,
      status: 'novo_lead',
      descricao: 'Lead criado para demonstracao do sistema.',
      tenant_id: tenantId,
      responsavel_id: authData.user.id,
      metadata: { demo: true, responsavel_nome: responsavelNome } as Json,
    },
    {
      nome: 'Sergio Mendes (Demo)',
      email: 'sergio.mendes@jurify.com',
      telefone: '(11) 98888-2222',
      area_juridica: 'Direito de Familia',
      origem: 'Indicação',
      valor_causa: 15000,
      status: 'em_qualificacao',
      descricao: 'Interesse em divorcio consensual.',
      tenant_id: tenantId,
      responsavel_id: authData.user.id,
      metadata: { demo: true, responsavel_nome: responsavelNome } as Json,
    },
    {
      nome: 'Construtora XYZ Ltda',
      email: 'contato@xyz.com.br',
      telefone: '(11) 3333-4444',
      area_juridica: 'Direito Civil',
      origem: 'LinkedIn',
      valor_causa: 150000,
      status: 'proposta_enviada',
      descricao: 'Contrato de empreitada global.',
      tenant_id: tenantId,
      responsavel_id: authData.user.id,
      metadata: { demo: true, responsavel_nome: responsavelNome } as Json,
    },
    {
      nome: 'Roberto Justus (Demo)',
      email: 'roberto@demo.com',
      telefone: '(11) 97777-5555',
      area_juridica: 'Direito Empresarial',
      origem: 'Networking',
      valor_causa: 500000,
      status: 'contrato_assinado',
      descricao: 'Fusao e aquisicao.',
      tenant_id: tenantId,
      responsavel_id: authData.user.id,
      metadata: { demo: true, responsavel_nome: responsavelNome } as Json,
    }
  ];

  // 4. Inserir Contratos de Teste (para popular dashboard)
  const contratos = [
    {
      titulo: 'Contrato Honorarios - Roberto Justus',
      lead_id: null, // Simplificado
      status_assinatura: 'assinado',
      valor: 50000,
      tenant_id: tenantId,
      data_assinatura: new Date().toISOString(),
    },
    {
      titulo: 'Minuta de Acordo - Construtora XYZ',
      lead_id: null,
      status_assinatura: 'pendente',
      valor: 15000,
      tenant_id: tenantId,
    }
  ];

  const { error: leadsError } = await supabase.from('leads').insert(leads);
  if (leadsError) console.error('Erro ao inserir leads:', leadsError.message);

  const { error: contratosError } = await supabase.from('contratos').insert(contratos);
  if (contratosError) console.error('Erro ao inserir contratos:', contratosError.message);

  // Registrar agendamento fake para hoje
  const hoje = new Date();
  hoje.setHours(14, 0, 0, 0);

  const { error: agendError } = await supabase.from('agendamentos').insert([
    {
      titulo: 'Reuniao Inicial - Maria Silva',
      data_hora: hoje.toISOString(),
      status: 'agendado',
      tenant_id: tenantId,
      tipo: 'reuniao'
    }
  ]);
  if (agendError) console.error('Erro ao inserir agendamentos:', agendError.message);

  console.log('Dados de teste gerados com sucesso para tenant:', tenantId);
};
