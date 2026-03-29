import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTicketsSuporte, type TicketSuporte } from '@/hooks/useTicketsSuporte';
import { fmtDateTime } from '@/utils/formatting';

interface TicketDetailDialogProps {
  ticket: TicketSuporte | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const STATUS_OPTIONS: Array<{ value: TicketSuporte['status']; label: string }> = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'fechado', label: 'Fechado' },
];

export default function TicketDetailDialog({ ticket, open, onOpenChange }: TicketDetailDialogProps) {
  const { updateTicket } = useTicketsSuporte();

  if (!ticket) return null;

  const handleStatusChange = (newStatus: TicketSuporte['status']) => {
    if (newStatus === ticket.status) return;
    updateTicket.mutate({ id: ticket.id, status: newStatus });
  };

  const handleRating = (star: number) => {
    updateTicket.mutate({ id: ticket.id, avaliacao: star });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={`text-[11px] ${TIPO_COLORS[ticket.tipo] ?? ''}`}>
              {TIPO_LABELS[ticket.tipo] ?? ticket.tipo}
            </Badge>
            <Badge variant="secondary" className={`text-[11px] ${STATUS_COLORS[ticket.status] ?? ''}`}>
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {fmtDateTime(ticket.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="bg-muted/30 rounded-md p-3 text-sm text-foreground whitespace-pre-wrap">
            {ticket.conteudo}
          </div>

          {/* Status Update */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Atualizar Status
            </p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={ticket.status === option.value ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={updateTicket.isPending}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Rating (only when closed) */}
          {ticket.status === 'fechado' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Avaliação
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    disabled={updateTicket.isPending}
                    aria-label={`${star} estrela${star !== 1 ? 's' : ''}`}
                    className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        ticket.avaliacao !== null && star <= ticket.avaliacao
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
