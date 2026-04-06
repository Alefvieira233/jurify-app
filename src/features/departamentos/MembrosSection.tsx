import { useState } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDepartamentoMembros } from '@/hooks/useDepartamentos';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { DepartamentoMembro } from '@/types/crm-operacional';

const ROLE_LABELS: Record<string, string> = {
  gestor: 'Gestor',
  membro: 'Membro',
  lider: 'Líder',
};

const ROLE_COLORS: Record<string, string> = {
  gestor: 'bg-purple-500/10 text-purple-600',
  lider: 'bg-blue-500/10 text-blue-600',
  membro: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

interface PermissionField {
  key: keyof Pick<
    DepartamentoMembro,
    | 'pode_ver_todos_leads'
    | 'pode_atribuir_responsavel'
    | 'pode_mover_leads'
    | 'pode_editar_propriedades'
    | 'pode_arquivar'
    | 'pode_ver_metricas'
    | 'pode_gerenciar'
    | 'receber_notificacoes'
  >;
  label: string;
}

const PERMISSION_FIELDS: PermissionField[] = [
  { key: 'pode_ver_todos_leads', label: 'Ver todos os leads' },
  { key: 'pode_atribuir_responsavel', label: 'Atribuir responsável' },
  { key: 'pode_mover_leads', label: 'Mover leads' },
  { key: 'pode_editar_propriedades', label: 'Editar propriedades' },
  { key: 'pode_arquivar', label: 'Arquivar' },
  { key: 'pode_ver_metricas', label: 'Ver métricas' },
  { key: 'pode_gerenciar', label: 'Gerenciar' },
  { key: 'receber_notificacoes', label: 'Receber notificações' },
];

interface MembrosSectionProps {
  departamentoId: string;
}

const MembrosSection = ({ departamentoId }: MembrosSectionProps) => {
  const { membros, isLoading, addMembro, removeMembro, updateMembro } =
    useDepartamentoMembros(departamentoId);

  const [newProfileId, setNewProfileId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    open: boolean;
    id: string;
    nome: string;
  }>({ open: false, id: '', nome: '' });
  const [removeLoading, setRemoveLoading] = useState(false);

  const handleAdd = async () => {
    if (!newProfileId.trim()) return;
    setAddLoading(true);
    try {
      await addMembro({ departamentoId, profileId: newProfileId.trim() });
      setNewProfileId('');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async () => {
    setRemoveLoading(true);
    try {
      await removeMembro(confirmRemove.id);
    } finally {
      setRemoveLoading(false);
      setConfirmRemove({ open: false, id: '', nome: '' });
    }
  };

  const handleTogglePermission = (membro: DepartamentoMembro, field: PermissionField['key']) => {
    void updateMembro({
      id: membro.id,
      [field]: !membro[field],
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membros
        </h3>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" />
        Membros ({membros.length})
      </h3>

      {/* Add member (placeholder) */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="add-member" className="sr-only">
            ID do perfil
          </Label>
          <Input
            id="add-member"
            placeholder="ID do perfil do usuário"
            value={newProfileId}
            onChange={(e) => setNewProfileId(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={() => { void handleAdd(); }}
          disabled={addLoading || !newProfileId.trim()}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          {addLoading ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </div>

      {membros.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum membro neste departamento.
        </p>
      ) : (
        <div className="space-y-3">
          {membros.map((membro) => (
            <div
              key={membro.id}
              className="rounded-lg border p-3 space-y-2"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {membro.profile?.nome_completo ?? 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {membro.profile?.email ?? ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    className={
                      ROLE_COLORS[membro.role_no_depto] ?? ROLE_COLORS.membro
                    }
                  >
                    {ROLE_LABELS[membro.role_no_depto] ?? membro.role_no_depto}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Remover membro"
                    onClick={() =>
                      setConfirmRemove({
                        open: true,
                        id: membro.id,
                        nome: membro.profile?.nome_completo ?? 'membro',
                      })
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Permission checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {PERMISSION_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={membro[field.key]}
                      onCheckedChange={() => handleTogglePermission(membro, field.key)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Remove */}
      <ConfirmDialog
        open={confirmRemove.open}
        onOpenChange={(v) =>
          !removeLoading && setConfirmRemove({ ...confirmRemove, open: v })
        }
        title="Remover Membro"
        description={`Tem certeza que deseja remover "${confirmRemove.nome}" deste departamento?`}
        onConfirm={() => { void handleRemove(); }}
        loading={removeLoading}
        destructive
      />
    </div>
  );
};

export default MembrosSection;
