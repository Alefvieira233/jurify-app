import { useState, useMemo } from 'react';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInitials, getAvatarHex, fmtPhone, formatarEtapaPipeline } from '@/utils/formatting';
import LeadDrawer from '@/features/leads/LeadDrawer';

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700',
  em_contato: 'bg-cyan-100 text-cyan-700',
  qualificado: 'bg-amber-100 text-amber-700',
  proposta: 'bg-indigo-100 text-indigo-700',
  negociacao: 'bg-purple-100 text-purple-700',
  ganho: 'bg-emerald-100 text-emerald-700',
  perdido: 'bg-rose-100 text-rose-700',
};

const PAGE_SIZE = 15;

export default function ContatosTable() {
  usePageTitle('Contatos');
  const { leads, loading } = useLeads();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build lookup maps
  const deptoMap = useMemo(
    () => new Map((activeDepartamentos ?? []).map(d => [d.id, d.nome])),
    [activeDepartamentos],
  );
  const memberMap = useMemo(
    () => new Map((members ?? []).map(m => [m.id, m.nome_completo || m.email])),
    [members],
  );

  // Filter
  const filtered = useMemo(() => {
    if (!leads) return [];
    if (!search) return leads;
    const term = search.toLowerCase();
    return leads.filter(l =>
      (l.nome_completo ?? l.nome ?? '').toLowerCase().includes(term) ||
      (l.email ?? '').toLowerCase().includes(term) ||
      (l.telefone ?? '').includes(term)
    );
  }, [leads, search]);

  // Paginate
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} contato{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="pl-9 h-9"
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider">Nome</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Telefone</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Responsável</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Departamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {search ? `Nenhum resultado para "${search}"` : 'Nenhum contato encontrado'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleRowClick(lead)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          style={{ backgroundColor: getAvatarHex(lead.nome_completo ?? lead.nome ?? 'L') }}
                          className="text-white text-xs"
                        >
                          {getInitials(lead.nome_completo ?? lead.nome ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{lead.nome_completo ?? lead.nome ?? 'Sem nome'}</div>
                        {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.telefone ? fmtPhone(lead.telefone) : '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.responsavel_id ? (memberMap.get(lead.responsavel_id) ?? '\u2014') : '\u2014'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-[11px] ${STATUS_COLORS[lead.status ?? 'novo'] ?? ''}`}>
                      {formatarEtapaPipeline(lead.status ?? 'novo')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.departamento_id ? (deptoMap.get(lead.departamento_id) ?? '\u2014') : '\u2014'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setTimeout(() => setSelectedLead(null), 300);
        }}
      />
    </div>
  );
}
