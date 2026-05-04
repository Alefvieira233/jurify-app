import { useState, useMemo } from 'react';
import { Search, RefreshCw, FileCheck2, AlertTriangle, Send, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppTemplates, useSyncTemplates, useSendTemplate, type WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';

interface TemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  conversationId?: string;
  onSent?: () => void;
}

function getBodyText(tpl: WhatsAppTemplate): string {
  const body = tpl.components.find(c => c.type?.toUpperCase() === 'BODY');
  return body?.text ?? '';
}

function fillBody(text: string, params: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? `{{${n}}}`);
}

const TemplateSelectorModal = ({ open, onOpenChange, to, conversationId, onSent }: TemplateSelectorModalProps) => {
  const { templates, isLoading, refetch } = useWhatsAppTemplates(true);
  const sync = useSyncTemplates();
  const send = useSendTemplate();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WhatsAppTemplate | null>(null);
  const [params, setParams] = useState<string[]>([]);

  const filtered = useMemo(
    () => templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())),
    [templates, search]
  );

  const selectTemplate = (tpl: WhatsAppTemplate) => {
    setSelected(tpl);
    setParams(Array(tpl.parameter_count).fill(''));
  };

  const goBack = () => {
    setSelected(null);
    setParams([]);
  };

  const canSend = selected !== null && params.every(p => p.trim().length > 0);

  const handleSend = async () => {
    if (!selected) return;
    await send.mutateAsync({
      to,
      templateName: selected.name,
      language: selected.language,
      parameters: params,
      conversationId,
    });
    onOpenChange(false);
    onSent?.();
    setSelected(null);
    setParams([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-emerald-600" />
            {selected ? `Template: ${selected.name}` : 'Enviar template aprovado'}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? 'Preencha os parâmetros e envie. Depois que o cliente responder, a janela 24h reabre e você pode enviar texto livre normalmente.'
              : 'Templates aprovados pela Meta podem ser enviados a qualquer momento, mesmo fora da janela 24h.'}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar template..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2 mt-3 max-h-[400px]">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p>Nenhum template aprovado encontrado.</p>
                  <p className="mt-1">Crie templates no Meta Business Manager e clique em "Sincronizar".</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{t.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.category}</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.language}</Badge>
                          {t.parameter_count > 0 && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
                              {t.parameter_count} variáveis
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                        {getBodyText(t) || '(sem corpo)'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 space-y-4 py-2">
            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
              <p className="text-sm whitespace-pre-line">{fillBody(getBodyText(selected), params)}</p>
            </div>

            {selected.parameter_count > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Parâmetros do template</p>
                {params.map((value, i) => (
                  <div key={i} className="space-y-1">
                    <Label className="text-xs">Variável {`{{${i + 1}}}`}</Label>
                    <Input
                      value={value}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = e.target.value;
                        setParams(next);
                      }}
                      placeholder={`Valor da variável ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Template sem variáveis — pronto para enviar.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          {selected ? (
            <>
              <Button variant="ghost" onClick={goBack}>Voltar</Button>
              <Button onClick={() => void handleSend()} disabled={!canSend || send.isPending} className="gap-1.5">
                {send.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Enviar para {to}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
        <Button onClick={() => void refetch()} className="hidden">refetch</Button>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectorModal;
