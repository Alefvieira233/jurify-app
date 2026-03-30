import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
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
import TicketDetailDialog from './TicketDetailDialog';

const TIPO_LABELS: Record<string, string> = {
  duvida: 'Dúvida',
  bug: 'Bug',
  sugestao: 'Sugestão',
  outro: 'Outro',
};

const TIPO_COLORS: Record<string, string> = {
  duvida: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  sugestao: 'bg-purple-100 text-purple-700',
  outro: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  fechado: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  fechado: 'Fechado',
};

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
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum ticket encontrado
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
                    <Badge variant="secondary" className={`text-[11px] ${TIPO_COLORS[ticket.tipo] ?? ''}`}>
                      {TIPO_LABELS[ticket.tipo] ?? ticket.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-[11px] ${STATUS_COLORS[ticket.status] ?? ''}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
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
