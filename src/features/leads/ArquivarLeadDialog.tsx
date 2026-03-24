import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Archive } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface ArquivarLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: (id: string, motivo: string, observacao?: string, dataReativacao?: string, proximoResponsavelId?: string) => Promise<boolean>;
}

const MOTIVOS = [
  { value: 'chat_resolvido', label: 'Chat resolvido' },
  { value: 'cliente_nao_responde', label: 'Cliente não responde' },
  { value: 'aberto_por_engano', label: 'Aberto por engano' },
  { value: 'duplicado', label: 'Lead duplicado' },
  { value: 'lead_sem_fit', label: 'Lead sem fit' },
  { value: 'outro', label: 'Outro motivo' },
] as const;

export default function ArquivarLeadDialog({
  lead,
  open,
  onOpenChange,
  onArchive,
}: ArquivarLeadDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataReativacao, setDataReativacao] = useState('');
  const [proximoResponsavel, setProximoResponsavel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { members } = useTeamMembers();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMotivo('');
      setObservacao('');
      setDataReativacao('');
      setProximoResponsavel('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!lead || !motivo) return;
    setSubmitting(true);
    try {
      const success = await onArchive(
        lead.id,
        motivo,
        observacao.trim() || undefined,
        dataReativacao || undefined,
        proximoResponsavel || undefined,
      );
      if (success) {
        handleOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar Lead</DialogTitle>
          <DialogDescription>
            Informe o motivo do arquivamento de{' '}
            <span className="font-medium">
              {lead?.nome ?? lead?.nome_completo ?? 'este lead'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do arquivamento *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observacao */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Data de reativacao */}
          <div className="space-y-2">
            <Label htmlFor="data-reativacao">Data prevista para reativação</Label>
            <Input
              id="data-reativacao"
              type="date"
              value={dataReativacao}
              onChange={(e) => setDataReativacao(e.target.value)}
            />
          </div>

          {/* Proximo responsavel */}
          <div className="space-y-2">
            <Label htmlFor="proximo-responsavel">Próximo responsável</Label>
            <Select value={proximoResponsavel} onValueChange={setProximoResponsavel}>
              <SelectTrigger id="proximo-responsavel">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum__">Nenhum</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome_completo}
                  </SelectItem>
                ))}
                <SelectItem value="__ia__">IA (automático)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => { void handleSubmit(); }}
            disabled={!motivo || submitting}
          >
            <Archive className="mr-2 h-4 w-4" />
            {submitting ? 'Arquivando...' : 'Arquivar Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
