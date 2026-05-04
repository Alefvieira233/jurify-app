import { useEffect, useState } from 'react';
import { Sparkles, Copy, RefreshCw, Loader2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSummarizeConversation, type ConversationSummary } from '@/hooks/useWhatsAppAI';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  contactName?: string;
}

const ConversationSummaryModal = ({ open, onOpenChange, conversationId, contactName }: Props) => {
  const summarize = useSummarizeConversation();
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !summary) {
      void summarize.mutateAsync({ conversationId, forceRefresh: false }).then(setSummary).catch(() => undefined);
    }
    if (!open) {
      setSummary(null);
      setCopied(false);
    }
  }, [open, conversationId, summary, summarize]);

  const refresh = async () => {
    setSummary(null);
    const result = await summarize.mutateAsync({ conversationId, forceRefresh: true });
    setSummary(result);
  };

  const copyToClipboard = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumo IA{contactName ? ` — ${contactName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Resumo automático da conversa em 5 pontos. Útil pra troca de turno ou anexar em processo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {summarize.isPending && !summary ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Gerando resumo...
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm whitespace-pre-line leading-relaxed">{summary.summary}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {summary.cached ? '✅ Cacheado' : '🆕 Recém-gerado'} ·
                  {' '}{summary.message_count} mensagens analisadas ·
                  {' '}{summary.generated_by}
                </span>
                <span>{new Date(summary.generated_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Erro ao gerar resumo. Tente novamente.</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {summary && (
            <>
              <Button variant="outline" size="sm" onClick={() => void copyToClipboard()} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={summarize.isPending} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${summarize.isPending ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationSummaryModal;
