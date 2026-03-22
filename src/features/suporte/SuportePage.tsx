import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, SlidersHorizontal, Calendar } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Input } from '@/components/ui/input';

export default function SuportePage() {
  usePageTitle('Suporte');
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex-shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Tickets</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os seus tickets de suporte</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Ticket
          </Button>
        </div>
      </header>

      <div className="px-5 py-3 flex items-center gap-3 border-b border-border/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Procurar por ticket"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <span className="h-2 w-2 rounded-full border" /> Status
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <Calendar className="h-3 w-3" /> Data de criação: Mais recentes
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <SlidersHorizontal className="h-3 w-3" /> Mais filtros
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <p className="text-xs text-muted-foreground mb-2">0 tickets</p>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Criação</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Workspace</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Conteúdo</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Detalhes</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                  Nenhum ticket encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
