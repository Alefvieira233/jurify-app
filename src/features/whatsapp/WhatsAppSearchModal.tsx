import { useState } from 'react';
import { Search, Loader2, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useWhatsAppSearch } from '@/hooks/useWhatsAppSearch';
import { fmtMessageTime } from '@/utils/formatting';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  onSelectResult?: (conversationId: string, messageId: string) => void;
}

function highlight(content: string, query: string): React.ReactNode {
  if (!query) return content;
  const terms = query.split(/\s+/).filter(t => t.length >= 2);
  if (terms.length === 0) return content;
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = content.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-300/40 dark:bg-yellow-500/30 text-foreground rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  );
}

const WhatsAppSearchModal = ({ open, onOpenChange, conversationId, onSelectResult }: Props) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);

  const { data: results = [], isLoading } = useWhatsAppSearch(
    debouncedQuery.length >= 2
      ? { query: debouncedQuery, conversationId, limit: 50 }
      : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Buscar mensagens{conversationId ? ' nesta conversa' : ' (todas as conversas)'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Digite para buscar... (ex: "audiência prazo", "cpf 123")'
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 py-2">
          {query.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Digite pelo menos 2 caracteres. Suporta busca em português com inflexão (paga → pagamento).
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma mensagem encontrada para "{debouncedQuery}".
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">{results.length} resultado{results.length === 1 ? '' : 's'}</p>
              {results.map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => {
                    onSelectResult?.(r.conversation_id, r.id);
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {r.contact_name || r.phone_number || '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {r.sender === 'lead' || r.sender === 'user' ? 'Cliente' : r.sender === 'ia' ? 'IA' : 'Você'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtMessageTime(r.ts)}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {highlight(r.content || '—', debouncedQuery)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppSearchModal;
