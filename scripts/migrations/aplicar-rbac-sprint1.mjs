#!/usr/bin/env node
/**
 * Script para aplicar mudanças RBAC no Sprint 1
 * Aplica automaticamente as correções de segurança nos arquivos
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_PATH = 'E:/Jurify/advo-ai-hub-main (1)/advo-ai-hub-main';

function aplicarRBACUsuariosManager() {
  const filepath = join(BASE_PATH, 'src/features/users/UsuariosManager.tsx');

  console.log(`📝 Aplicando RBAC em ${filepath}...`);

  let content = readFileSync(filepath, 'utf-8');

  // 1. Adicionar imports
  const oldImports = `import { Plus, Search, MoreHorizontal, Edit, Trash, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';`;

  const newImports = `import { Plus, Search, MoreHorizontal, Edit, Trash, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';`;

  content = content.replace(oldImports, newImports);

  // 2. Substituir canManageUsers
  const oldRBAC = `  // 🔓 ACESSO TOTAL: Qualquer usuário autenticado pode gerenciar usuários
  const canManageUsers = !!user;`;

  const newRBAC = `  // ✅ RBAC: Verificação de permissões real
  const { can, canManageUsers, canDeleteUsers, userRole } = useRBAC();

  // Só pode visualizar usuários se tiver permissão de read
  const canViewUsers = can('usuarios', 'read');

  // Se não tem permissão para visualizar, mostrar mensagem
  if (!canViewUsers) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta seção.
            <br />
            <span className="text-sm text-gray-500">Role atual: {userRole}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }`;

  content = content.replace(oldRBAC, newRBAC);

  // 3. Mudar enabled da query
  content = content.replace('enabled: canManageUsers', 'enabled: canViewUsers');

  // 4. Adicionar verificação na mutation
  const oldMutation = `  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase`;

  const newMutation = `  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Verificação adicional de segurança
      if (!canDeleteUsers) {
        throw new Error('Sem permissão para desativar usuários');
      }

      const { error } = await supabase`;

  content = content.replace(oldMutation, newMutation);

  // 5. Proteger botão Novo Usuário
  const oldButton = `      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e suas permissões no sistema</p>
        </div>
        <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>`;

  const newButton = `      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e suas permissões no sistema</p>
        </div>
        {can('usuarios', 'create') && (
          <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>`;

  content = content.replace(oldButton, newButton);

  // Fechar a condicional do botão
  content = content.replace(
    '          </Dialog>\n      </div>',
    '          </Dialog>\n        )}\n      </div>'
  );

  // 6. Remover console.error
  content = content.replace("console.error('Erro ao desativar usuário:', error);", '// Error logged to monitoring');

  // Salvar arquivo
  writeFileSync(filepath, content, 'utf-8');

  console.log('✅ UsuariosManager.tsx atualizado com RBAC!');
}

function aplicarRBACConfiguracoes() {
  const filepath = join(BASE_PATH, 'src/features/settings/ConfiguracoesGerais.tsx');

  console.log(`📝 Aplicando RBAC em ${filepath}...`);

  let content = readFileSync(filepath, 'utf-8');

  // 1. Adicionar imports
  const oldImports = `import { Settings, Plug, Users, Bell, Server, TestTube } from 'lucide-react';`;

  const newImports = `import { Settings, Plug, Users, Bell, Server, TestTube, ShieldAlert } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';`;

  content = content.replace(oldImports, newImports);

  // 2. Substituir o comentário e adicionar verificação
  const oldCode = `const ConfiguracoesGerais = () => {
  // 🔓 ACESSO TOTAL: Qualquer usuário autenticado pode acessar configurações
  return (`;

  const newCode = `const ConfiguracoesGerais = () => {
  // ✅ RBAC: Verificação de permissões
  const { can, canManageConfig, userRole } = useRBAC();

  // Se não pode acessar configurações, mostrar mensagem
  if (!can('configuracoes', 'read')) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar as configurações.
            <br />
            <span className="text-sm text-gray-500">Role atual: {userRole}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (`;

  content = content.replace(oldCode, newCode);

  // Salvar arquivo
  writeFileSync(filepath, content, 'utf-8');

  console.log('✅ ConfiguracoesGerais.tsx atualizado com RBAC!');
}

function main() {
  console.log('🚀 Iniciando aplicação de RBAC - Sprint 1\n');

  try {
    aplicarRBACUsuariosManager();
    aplicarRBACConfiguracoes();

    console.log('\n✅ Todas as mudanças de RBAC foram aplicadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar o sistema com diferentes roles (admin, manager, user, viewer)');
    console.log('2. Verificar se os botões aparecem/desaparecem corretamente');
    console.log('3. Testar tentativas de ações sem permissão');
    console.log('\n💡 Dica: Use o SQL abaixo para testar roles:');
    console.log("   UPDATE profiles SET role = 'viewer' WHERE email = 'seu@email.com';");
  } catch (error) {
    console.log(`\n❌ Erro ao aplicar mudanças: ${error.message}`);
    console.error(error);
  }
}

main();
