import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, LifeBuoy } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTicketsSuporte, type TicketSuporte } from '@/hooks/useTicketsSuporte';
import { fmtDateTime } from '@/utils/formatting';
import { truncate } from '@/utils/formatting';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStatusConfig } from '@/constants/statusConfig';
import TicketDetailDialog from './TicketDetailDialog';
import EmptyState from '@/components/EmptyState';

export default function SuportePage() {
  usePageTitle('Suporte');
  const { tickets, isLoading, createTicket } = useTicketsSuporte();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState('duvida');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketSuporte | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = tickets.filter(t => {
    if (search && !t.conteudo.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipoFilter && tipoFilter !== 'all' && t.tipo !== tipoFilter) return false;
    return true;
  });

  const handleCreate = () => {
    if (!novoConteudo.trim()) return;
    createTicket.mutate(
      { tipo: novoTipo, conteudo: novoConteudo },
      {
        onSuccess: () => {
          setFormOpen(false);
          setNovoConteudo('');
          setNovoTipo('duvida');
        },
      },
    );
  };

  const handleRowClick = (ticket: TicketSuporte) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Suporte</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px] h-9" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="duvida">Duvida</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="sugestao">Sugestao</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider">Data</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Conteúdo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Avaliação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={search || (tipoFilter && tipoFilter !== 'all') ? Search : LifeBuoy}
                    title="Nenhum ticket encontrado"
                    description={search || (tipoFilter && tipoFilter !== 'all')
                      ? 'Tente ajustar os filtros para encontrar seus tickets.'
                      : 'Abra seu primeiro ticket de suporte para receber ajuda.'}
                    action={!(search || (tipoFilter && tipoFilter !== 'all')) ? {
                      label: 'Novo Ticket',
                      onClick: () => setFormOpen(true),
                    } : undefined}
                    className="border-0 shadow-none"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(ticket => (
                <TableRow
                  key={ticket.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(ticket)}
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDateTime(ticket.created_at)}
                  </TableCell>
                  <TableCell className="text-sm max-w-md">
                    {truncate(ticket.conteudo, 100)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const tc = getStatusConfig('ticket_tipos', ticket.tipo);
                      return (
                        <Badge variant="secondary" className={`text-[11px] ${tc.bgClass} ${tc.textClass}`}>
                          {tc.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const sc = getStatusConfig('tickets', ticket.status);
                      return (
                        <Badge variant="secondary" className={`text-[11px] ${sc.bgClass} ${sc.textClass}`}>
                          {sc.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.avaliacao !== null ? `${'★'.repeat(ticket.avaliacao)}` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duvida">Duvida</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="sugestao">Sugestao</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="conteudo">Descrição</Label>
              <Textarea
                id="conteudo"
                value={novoConteudo}
                onChange={e => setNovoConteudo(e.target.value)}
                placeholder="Descreva seu problema ou sugestão..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!novoConteudo.trim() || createTicket.isPending}>
                {createTicket.isPending ? 'Enviando...' : 'Enviar Ticket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <TicketDetailDialog
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
