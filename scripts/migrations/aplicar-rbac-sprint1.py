#!/usr/bin/env python3
"""
Script para aplicar mudanças RBAC no Sprint 1
Aplica automaticamente as correções de segurança nos arquivos
"""

import os
import re

BASE_PATH = r"E:/Jurify/advo-ai-hub-main (1)/advo-ai-hub-main"

def aplicar_rbac_usuarios_manager():
    """Aplica RBAC no UsuariosManager.tsx"""
    filepath = os.path.join(BASE_PATH, "src/features/users/UsuariosManager.tsx")

    print(f"📝 Aplicando RBAC em {filepath}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Adicionar imports
    old_imports = "import { Plus, Search, MoreHorizontal, Edit, Trash, UserPlus } from 'lucide-react';\nimport { useAuth } from '@/contexts/AuthContext';\nimport { useToast } from '@/hooks/use-toast';"

    new_imports = """import { Plus, Search, MoreHorizontal, Edit, Trash, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';"""

    content = content.replace(old_imports, new_imports)

    # 2. Substituir can ManageUsers
    old_rbac = """  // 🔓 ACESSO TOTAL: Qualquer usuário autenticado pode gerenciar usuários
  const canManageUsers = !!user;"""

    new_rbac = """  // ✅ RBAC: Verificação de permissões real
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
  }"""

    content = content.replace(old_rbac, new_rbac)

    # 3. Mudar enabled da query
    content = content.replace(
        "enabled: canManageUsers",
        "enabled: canViewUsers"
    )

    # 4. Adicionar verificação na mutation
    old_mutation = """  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase"""

    new_mutation = """  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Verificação adicional de segurança
      if (!canDeleteUsers) {
        throw new Error('Sem permissão para desativar usuários');
      }

      const { error } = await supabase"""

    content = content.replace(old_mutation, new_mutation)

    # 5. Proteger botão Novo Usuário
    old_button = """      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e suas permissões no sistema</p>
        </div>
        <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>"""

    new_button = """      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e suas permissões no sistema</p>
        </div>
        {can('usuarios', 'create') && (
          <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>"""

    content = content.replace(old_button, new_button)

    # Fechar a condicional do botão
    content = content.replace(
        "          </Dialog>\n      </div>",
        "          </Dialog>\n        )}\n      </div>"
    )

    # Salvar arquivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ UsuariosManager.tsx atualizado com RBAC!")

def aplicar_rbac_configuracoes():
    """Aplica RBAC no ConfiguracoesGerais.tsx"""
    filepath = os.path.join(BASE_PATH, "src/features/settings/ConfiguracoesGerais.tsx")

    print(f"📝 Aplicando RBAC em {filepath}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Adicionar imports
    old_imports = "import { Settings, Plug, Users, Bell, Server, TestTube } from 'lucide-react';"

    new_imports = """import { Settings, Plug, Users, Bell, Server, TestTube, ShieldAlert } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';"""

    content = content.replace(old_imports, new_imports)

    # 2. Substituir o comentário e adicionar verificação
    old_code = """const ConfiguracoesGerais = () => {
  // 🔓 ACESSO TOTAL: Qualquer usuário autenticado pode acessar configurações
  return ("""

    new_code = """const ConfiguracoesGerais = () => {
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

  return ("""

    content = content.replace(old_code, new_code)

    # Salvar arquivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ ConfiguracoesGerais.tsx atualizado com RBAC!")

def main():
    print("🚀 Iniciando aplicação de RBAC - Sprint 1\n")

    try:
        aplicar_rbac_usuarios_manager()
        aplicar_rbac_configuracoes()

        print("\n✅ Todas as mudanças de RBAC foram aplicadas com sucesso!")
        print("\n📋 Próximos passos:")
        print("1. Testar o sistema com diferentes roles (admin, manager, user, viewer)")
        print("2. Verificar se os botões aparecem/desaparecem corretamente")
        print("3. Testar tentativas de ações sem permissão")
        print("\n💡 Dica: Use o SQL abaixo para testar roles:")
        print("   UPDATE profiles SET role = 'viewer' WHERE email = 'seu@email.com';")

    except Exception as e:
        print(f"\n❌ Erro ao aplicar mudanças: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
