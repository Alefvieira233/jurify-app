import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Input } from '@/components/ui/input';

export default function BaseConhecimento() {
  usePageTitle('Base de Conhecimento');
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">
      <header className="flex-shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Centralize e gerencie todo o conhecimento da sua organização</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Documento
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="relative max-w-md mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, conteúdo ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-3 py-2.5"><input type="checkbox" className="rounded border-muted-foreground/30" /></th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Agentes</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Atualização</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="text-center py-16 text-sm text-muted-foreground">
                  Nenhum documento encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">0 documentos</p>
      </div>
    </div>
  );
}
