import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeads } from '@/hooks/useLeads';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fmtDate } from '@/utils/formatting';

const STATUS_LABEL: Record<string, string> = {
  ganho: 'Ganho',
};

export const ContatosTable = () => {
  usePageTitle('Contatos');
  const navigate = useNavigate();
  const { leads } = useLeads();
  const [clientSearch, setClientSearch] = useState('');

  const clients = useMemo(() => {
    const filtered = leads.filter(l => l.status === 'ganho');
    if (!clientSearch.trim()) return filtered;
    const q = clientSearch.trim().toLowerCase();
    return filtered.filter(l =>
      (l.nome_completo ?? l.nome ?? '').toLowerCase().includes(q),
    );
  }, [leads, clientSearch]);

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">Contatos</h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              {clients.length} clientes ativos
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Search + Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate('/pipeline')}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Cliente
          </Button>
        </div>

        {/* Clients Table */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-0">
            {clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {clientSearch.trim() ? 'Nenhum cliente encontrado' : 'Nenhum cliente ativo'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                  {clientSearch.trim()
                    ? 'Tente buscar por outro nome.'
                    : 'Leads com status "Ganho" aparecem aqui.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">CPF/CNPJ</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Telefone</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Data de Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr
                        key={client.id}
                        className="border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/crm/lead/${client.id}`)}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {client.nome_completo ?? client.nome ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell tabular-nums">
                          {client.cpf_cnpj ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell tabular-nums">
                          {client.telefone ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                          {client.email ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${
                              client.status === 'ganho'
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/30'
                                : 'border-cyan-300 text-cyan-700 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:bg-cyan-900/30'
                            }`}
                          >
                            {STATUS_LABEL[client.status ?? ''] ?? client.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell tabular-nums">
                          {fmtDate(client.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ContatosTable;
