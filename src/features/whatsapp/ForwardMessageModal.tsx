import { useMemo, useState } from 'react';
import { Forward, Search, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppForward } from '@/hooks/useWhatsAppForward';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messageId: string;
  excludeConversationId?: string;
}

const ForwardMessageModal = ({ open, onOpenChange, messageId, excludeConversationId }: Props) => {
  const { conversations } = useWhatsAppConversations();
  const forward = useWhatsAppForward();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() =>
    (conversations ?? [])
      .filter(c => c.id !== excludeConversationId)
      .filter(c => !search || (c.contact_name || c.phone_number || '').toLowerCase().includes(search.toLowerCase()))
      .slice(0, 30),
    [conversations, search, excludeConversationId]
  );

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else if (n.size < 5) n.add(id);
    return n;
  });

  const handleSend = async () => {
    if (selected.size === 0) return;
    await forward.mutateAsync({
      messageId,
      toConversationIds: Array.from(selected),
      includeAttribution: true,
    });
    onOpenChange(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5 text-primary" />
            Encaminhar mensagem
          </DialogTitle>
          <DialogDescription>
            Selecione até 5 conversas. Cada destinatário precisa estar na janela 24h aberta.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..." className="pl-9" />
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa encontrada.</p>
            ) : filtered.map(c => (
              <label
                key={c.id}
                className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${selected.has(c.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/40'}`}
              >
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} disabled={!selected.has(c.id) && selected.size >= 5} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.contact_name || c.phone_number}</p>
                  {c.last_message && <p className="text-xs text-muted-foreground line-clamp-1">{c.last_message}</p>}
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => void handleSend()} disabled={selected.size === 0 || forward.isPending} className="gap-1.5">
            {forward.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Encaminhar para {selected.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageModal;
