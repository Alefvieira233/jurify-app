#!/usr/bin/env node
// 🚀 PADRÃO ELON MUSK: Script de deploy para produção Tesla/SpaceX grade

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 [DEPLOY] Iniciando deploy para produção - Padrão Tesla/SpaceX');

// 🚀 VERIFICAÇÕES PRÉ-DEPLOY
function preDeployChecks() {
  console.log('🔍 [DEPLOY] Executando verificações pré-deploy...');
  
  // Verificar se .env.production existe
  if (!fs.existsSync('.env.production')) {
    console.error('❌ [DEPLOY] Arquivo .env.production não encontrado!');
    process.exit(1);
  }
  
  // Verificar variáveis críticas
  const envContent = fs.readFileSync('.env.production', 'utf8');
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_OPENAI_API_KEY',
    'HTTPS_KEY_PATH',
    'HTTPS_CERT_PATH'
  ];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      console.error(`❌ [DEPLOY] Variável ${varName} não encontrada em .env.production!`);
      process.exit(1);
    }
  }
  
  console.log('✅ [DEPLOY] Verificações pré-deploy concluídas');
}

// 🚀 TESTES AUTOMATIZADOS
function runTests() {
  console.log('🧪 [DEPLOY] Executando testes automatizados...');
  
  try {
    execSync('npm run test:unit', { stdio: 'inherit' });
    execSync('npm run test:security', { stdio: 'inherit' });
    execSync('npm run lint', { stdio: 'inherit' });
    execSync('npm run type-check', { stdio: 'inherit' });
    console.log('✅ [DEPLOY] Todos os testes passaram');
  } catch {
    console.error('❌ [DEPLOY] Testes falharam!');
    process.exit(1);
  }
}

// 🚀 BUILD OTIMIZADO
function buildProduction() {
  console.log('🏗️ [DEPLOY] Executando build otimizado...');
  
  try {
    execSync('npm run build:prod', { stdio: 'inherit' });
    console.log('✅ [DEPLOY] Build concluído com sucesso');
  } catch {
    console.error('❌ [DEPLOY] Build falhou!');
    process.exit(1);
  }
}

// 🚀 ANÁLISE DE SEGURANÇA
function securityAudit() {
  console.log('🔒 [DEPLOY] Executando auditoria de segurança...');
  
  try {
    execSync('npm audit --audit-level=high', { stdio: 'inherit' });
    console.log('✅ [DEPLOY] Auditoria de segurança aprovada');
  } catch {
    console.warn('⚠️ [DEPLOY] Vulnerabilidades encontradas - revisar antes do deploy');
  }
}

// 🚀 DEPLOY PARA SUPABASE
function deployToSupabase() {
  console.log('🌐 [DEPLOY] Fazendo deploy para Supabase...');
  
  try {
    // Deploy das Edge Functions
    execSync('supabase functions deploy --project-ref $SUPABASE_PROJECT_REF', { stdio: 'inherit' });

    // Executar migrações
    execSync('supabase db push --project-ref $SUPABASE_PROJECT_REF', { stdio: 'inherit' });

    console.log('✅ [DEPLOY] Deploy para Supabase concluído');
  } catch {
    console.error('❌ [DEPLOY] Deploy para Supabase falhou!');
    process.exit(1);
  }
}

// 🚀 VERIFICAÇÃO PÓS-DEPLOY
function postDeployChecks() {
  console.log('🔍 [DEPLOY] Executando verificações pós-deploy...');
  
  try {
    // Health check da aplicação
    execSync('npm run health-check', { stdio: 'inherit' });
    console.log('✅ [DEPLOY] Aplicação funcionando corretamente');
  } catch {
    console.error('❌ [DEPLOY] Health check falhou!');
    process.exit(1);
  }
}

// 🚀 EXECUÇÃO PRINCIPAL
async function main() {
  const startTime = Date.now();
  
  try {
    preDeployChecks();
    runTests();
    securityAudit();
    buildProduction();
    deployToSupabase();
    postDeployChecks();
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`🎉 [DEPLOY] Deploy concluído com sucesso em ${duration}s!`);
    console.log('🚀 [DEPLOY] Sistema pronto para produção - Padrão Tesla/SpaceX atingido!');
    
  } catch (error) {
    console.error('❌ [DEPLOY] Deploy falhou:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
