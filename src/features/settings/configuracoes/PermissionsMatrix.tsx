import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const roles = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'advogado', label: 'Advogado' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'pos_venda', label: 'Pos-venda' },
  { value: 'suporte', label: 'Suporte' },
];

const modules = [
  { value: 'leads', label: 'Leads' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'agendamentos', label: 'Agendamentos' },
  { value: 'relatorios', label: 'Relatorios' },
  { value: 'whatsapp_ia', label: 'WhatsApp IA' },
  { value: 'usuarios', label: 'Usuarios' },
];

export const PermissionsMatrix = () => {
  const { data: permissions = [] } = useQuery<Array<{ role: string; module: string; permission: string }>>({
    queryKey: queryKeys.rolePermissionsMatriz.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, module, permission')
        .eq('ativo', true)
        .order('role');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Role</th>
            {modules.map((m) => (
              <th key={m.value} className="text-center p-2 min-w-[110px] text-xs font-medium">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.value} className="border-b">
              <td className="p-2">
                <Badge variant="outline">{role.label}</Badge>
              </td>
              {modules.map((m) => {
                const perms = permissions.filter((p) => p.role === role.value && p.module === m.value);
                return (
                  <td key={m.value} className="text-center p-2">
                    {perms.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {perms.map((p) => (
                          <Badge key={p.permission} variant="secondary" className="text-[10px]">
                            {p.permission}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
