# Sprint 1 - Mudanças RBAC Necessárias

## ✅ Arquivos Criados
- ✅ `/src/types/rbac.ts` - Tipos e matriz de permissões
- ✅ `/src/hooks/useRBAC.ts` - Hook para verificação de permissões
- ✅ `/src/components/auth/ProtectedAction.tsx` - Componentes de proteção

## 📝 Mudanças em UsuariosManager.tsx

### 1. Adicionar Imports (linha 12-15)
```typescript
// ADICIONAR:
import { ShieldAlert } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
```

### 2. Substituir linha 36-46
```typescript
// ❌ REMOVER:
const { user } = useAuth();
// ...
const canManageUsers = !!user;

// ✅ ADICIONAR:
const { user } = useAuth();
const { toast } = useToast();
const queryClient = useQueryClient();

// ✅ RBAC: Verificação de permissões real
const { can, canManageUsers, canDeleteUsers, userRole } = useRBAC();
const canViewUsers = can('usuarios', 'read');
```

### 3. Adicionar verificação de acesso (após linha 46)
```typescript
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
}
```

### 4. Proteger botão "Novo Usuário" (linha 128-144)
```typescript
// ❌ ANTES:
<Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>
  <DialogTrigger asChild>
    <Button className="bg-amber-500 hover:bg-amber-600">

// ✅ DEPOIS:
{can('usuarios', 'create') && (
  <Dialog open={isNovoUsuarioOpen} onOpenChange={setIsNovoUsuarioOpen}>
    <DialogTrigger asChild>
      <Button className="bg-amber-500 hover:bg-amber-600">
```

### 5. Proteger coluna de ações (linha 185)
```typescript
// ❌ ANTES:
<TableHead className="w-[50px]">Ações</TableHead>

// ✅ DEPOIS:
{(can('usuarios', 'update') || can('usuarios', 'delete') || can('usuarios', 'manage')) && (
  <TableHead className="w-[50px]">Ações</TableHead>
)}
```

### 6. Proteger botões de ação individuais (linha 218-253)
```typescript
// Envolver a TableCell inteira com:
{(can('usuarios', 'update') || can('usuarios', 'delete') || can('usuarios', 'manage')) && (
  <TableCell>
    <DropdownMenu>
      {/* ... */}
      <DropdownMenuContent align="end">
        {/* Editar só se tiver permissão */}
        {can('usuarios', 'update') && (
          <DropdownMenuItem onClick={...}>
            <Edit /> Editar
          </DropdownMenuItem>
        )}

        {/* Permissões só se tiver manage */}
        {can('usuarios', 'manage') && (
          <DropdownMenuItem onClick={...}>
            <UserPlus /> Permissões
          </DropdownMenuItem>
        )}

        {/* Desativar só se tiver delete */}
        {canDeleteUsers && (
          <DropdownMenuItem onClick={...} className="text-red-600">
            <Trash /> Desativar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
)}
```

### 7. Adicionar verificação na mutation (linha 68-92)
```typescript
const deleteMutation = useMutation({
  mutationFn: async (userId: string) => {
    // ✅ ADICIONAR verificação adicional:
    if (!canDeleteUsers) {
      throw new Error('Sem permissão para desativar usuários');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ativo: false })
      .eq('id', userId);

    if (error) throw error;
  },
  // ... resto do código
});
```

## 📝 Mudanças em ConfiguracoesGerais.tsx

### 1. Adicionar Imports
```typescript
import { useRBAC } from '@/hooks/useRBAC';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
```

### 2. Adicionar verificação (linha 13-15)
```typescript
const ConfiguracoesGerais = () => {
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

  return (
    // ... resto do componente
  );
};
```

### 3. Desabilitar edição se não tiver permissão
```typescript
// Nos inputs/forms, adicionar:
disabled={!canManageConfig}
```

## 🧪 Como Testar

### 1. Criar usuário de teste com role 'viewer'
```sql
UPDATE profiles
SET role = 'viewer'
WHERE email = 'teste@exemplo.com';
```

### 2. Login com usuário viewer
- Tentar acessar /usuarios → Deve mostrar "Sem permissão"
- Tentar acessar /configuracoes → Deve mostrar "Sem permissão"

### 3. Criar usuário com role 'manager'
```sql
UPDATE profiles
SET role = 'manager'
WHERE email = 'manager@exemplo.com';
```

### 4. Login com manager
- Acessar /usuarios → Deve ver lista mas SEM botões de deletar
- Acessar /configuracoes → Deve ver mas SEM poder editar

### 5. Login com admin
- Acesso total a tudo

## 📊 Matriz de Permissões

| Role | Ver Usuários | Criar | Editar | Deletar | Gerenciar Permissões |
|------|--------------|-------|--------|---------|---------------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ❌ | ❌ | ❌ | ❌ |
| user | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ |

## ⚠️ Importante

1. **Banco de Dados**: As RLS policies no Supabase JÁ implementam segurança no backend
2. **Frontend**: Este RBAC no frontend é apenas para UX (esconder botões)
3. **Nunca confie apenas no frontend**: As RLS policies são a verdadeira segurança
4. **Role Default**: Se profile.role for NULL, será tratado como 'viewer'

## 🔄 Próximos Passos

Depois de aplicar RBAC:
1. ✅ Remover console.logs
2. ✅ Criar logger configurável
3. ✅ Testar tudo
