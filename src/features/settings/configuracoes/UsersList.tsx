import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, ShieldAlert, Trash } from 'lucide-react';
import { getAvatarHex, getInitials } from '@/utils/formatting';

interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  ativo: boolean;
  user_roles?: Array<{ role: string; ativo: boolean }>;
}

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    administrador: 'Admin',
    advogado: 'Advogado',
    comercial: 'Comercial',
    pos_venda: 'Pos-venda',
    suporte: 'Suporte',
  };
  return map[role] || role;
};

interface UsersListProps {
  filtered: Membro[];
  isLoading: boolean;
  search: string;
  selected: Set<string>;
  profileId?: string;
  canDeleteUsers: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (member: Membro) => void;
  onPermissions: (member: Membro) => void;
  onDeactivate: (id: string, nome: string) => void;
}

export const UsersList: React.FC<UsersListProps> = ({
  filtered,
  isLoading,
  search,
  selected,
  profileId,
  canDeleteUsers,
  onToggleAll,
  onToggleOne,
  onEdit,
  onPermissions,
  onDeactivate,
}) => {
  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={onToggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Usuario
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cargo
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                WhatsApp
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {search
                    ? 'Nenhum membro encontrado para esta pesquisa.'
                    : 'Nenhum membro cadastrado. Clique em "Novo Membro" para comecar.'}
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const activeRole = m.user_roles?.find((r) => r.ativo)?.role;
                const avatarColor = getAvatarHex(m.nome_completo || m.email);
                const initials = getInitials(m.nome_completo || m.email);
                return (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => onToggleOne(m.id)}
                        aria-label={`Selecionar ${m.nome_completo}`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.nome_completo || '\u2014'}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {activeRole ? (
                        <Badge variant="outline" className="text-xs font-medium">
                          {getRoleLabel(activeRole)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {m.telefone || '\u2014'}
                    </td>
                    <td className="px-4 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onEdit(m)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPermissions(m)}>
                            <ShieldAlert className="h-4 w-4 mr-2" /> Permissoes
                          </DropdownMenuItem>
                          {m.ativo && canDeleteUsers && m.id !== profileId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDeactivate(m.id, m.nome_completo)}
                              >
                                <Trash className="h-4 w-4 mr-2" /> Revogar acesso
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isLoading ? '' : `${filtered.length} ${filtered.length === 1 ? 'membro' : 'membros'}`}
      </p>
    </>
  );
};
