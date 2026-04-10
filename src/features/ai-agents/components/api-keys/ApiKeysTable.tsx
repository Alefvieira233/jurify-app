import { Plus, Key, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ApiKey } from './types';

interface ApiKeysTableProps {
  apiKeys: ApiKey[] | undefined;
  onToggleStatus: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
  onCreateFirst: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}

export const ApiKeysTable = ({
  apiKeys,
  onToggleStatus,
  onDelete,
  onCreateFirst,
  isToggling,
  isDeleting,
}: ApiKeysTableProps) => {
  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="text-center py-8">
        <Key className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
        <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">Nenhuma API key encontrada</h3>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Crie sua primeira API key para começar a usar os agentes IA.</p>
        <Button onClick={onCreateFirst} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
          <Plus className="h-4 w-4 mr-2" />
          Criar primeira API key
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-blue-300" />
                  <span className="font-medium">{key.nome}</span>
                </div>
              </TableCell>
              <TableCell>
                <code className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] px-2 py-1 rounded text-sm font-mono">
                  {key.key_prefix}••••••••
                </code>
              </TableCell>
              <TableCell>
                <Badge
                  variant={key.ativo ? 'default' : 'secondary'}
                  className={key.ativo ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30' : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-400/30'}
                >
                  {key.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {new Date(key.created_at).toLocaleDateString('pt-BR')}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(key.id, key.ativo)}
                    disabled={isToggling}
                  >
                    {key.ativo ? (
                      <PowerOff className="h-4 w-4 text-red-300" />
                    ) : (
                      <Power className="h-4 w-4 text-emerald-200" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(key.id)}
                    disabled={isDeleting}
                    className="hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
