import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) env[key.trim()] = value;
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 POPULANDO BANCO (VERSÃO MÍNIMA)...\n');

async function popularBanco() {
  // Tentar inserir com APENAS colunas obrigatórias
  console.log('📝 Inserindo lead de teste...');
  
  const leadMinimo = {
    nome: 'João Silva',
    area_juridica: 'trabalhista',
    origem: 'whatsapp',
    responsavel: 'Dr. Roberto'
  };
  
  const { data, error } = await supabase
    .from('leads')
    .insert(leadMinimo)
    .select();
  
  if (error) {
    console.error('❌ Erro:', error.message);
    console.log('\nDetalhes:', error.details);
    console.log('\nTentando descobrir colunas obrigatórias...\n');
    
    // Tentar com mais campos
    const leadCompleto = {
      nome: 'Maria Santos',
      email: 'maria@teste.com',
      telefone: '11987654321',
      area_juridica: 'trabalhista',
      origem: 'whatsapp',
      responsavel: 'Dr. Roberto',
      status: 'novo_lead'
    };
    
    const { data: data2, error: error2 } = await supabase
      .from('leads')
      .insert(leadCompleto)
      .select();
    
    if (error2) {
      console.error('❌ Ainda erro:', error2.message);
    } else {
      console.log('✅ Sucesso com campos completos!');
      console.log('Lead inserido:', data2[0]);
      
      // Inserir mais alguns
      const leads = [
        { nome: 'Pedro Alves', email: 'pedro@teste.com', telefone: '11976543210', area_juridica: 'direito_civil', origem: 'site', responsavel: 'Dra. Fernanda', status: 'qualificado' },
        { nome: 'Ana Costa', email: 'ana@teste.com', telefone: '11965432109', area_juridica: 'direito_penal', origem: 'indicacao', responsavel: 'Dr. Marcos', status: 'em_proposta' },
        { nome: 'Carlos Souza', email: 'carlos@teste.com', telefone: '11954321098', area_juridica: 'previdenciario', origem: 'whatsapp', responsavel: 'Dra. Juliana', status: 'contratado' },
        { nome: 'Juliana Lima', email: 'juliana@teste.com', telefone: '11943210987', area_juridica: 'direito_consumidor', origem: 'site', responsavel: 'Dr. Rafael', status: 'em_atendimento' },
      ];
      
      console.log('\n📝 Inserindo mais leads...');
      const { data: maisLeads, error: maisErro } = await supabase
        .from('leads')
        .insert(leads)
        .select();
      
      if (maisErro) {
        console.error('❌ Erro ao inserir mais:', maisErro.message);
      } else {
        console.log(`✅ +${maisLeads.length} leads inseridos!\n`);
      }
    }
  } else {
    console.log('✅ Lead inserido:', data[0]);
  }
  
  // Verificar total
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`\n📊 Total de leads no banco: ${count}\n`);
  
  if (count > 0) {
    console.log('✅ SUCESSO! Banco populado!');
    console.log('🌐 Recarregue: http://localhost:8080\n');
  }
}

popularBanco();
