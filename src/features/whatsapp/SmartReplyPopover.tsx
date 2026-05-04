import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, Target, Heart, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useSmartReply, type ReplySuggestion, type SuggestionTone } from '@/hooks/useSmartReply';

interface Props {
  conversationId: string | undefined;
  disabled?: boolean;
  onSelect: (text: string) => void;
}

const TONE_META: Record<SuggestionTone, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  objetiva: { label: 'Objetiva', icon: Target, color: 'text-blue-600 dark:text-blue-400' },
  empatica: { label: 'Empática', icon: Heart, color: 'text-rose-600 dark:text-rose-400' },
  esclarecedora: { label: 'Esclarecedora', icon: HelpCircle, color: 'text-amber-600 dark:text-amber-400' },
};

const SmartReplyPopover = ({ conversationId, disabled, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[] | null>(null);
  const smart = useSmartReply();

  const generate = async () => {
    if (!conversationId) return;
    setSuggestions(null);
    const result = await smart.mutateAsync(conversationId);
    setSuggestions(result.suggestions);
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && !suggestions && conversationId) void generate();
    if (!next) setSuggestions(null);
  };

  const apply = (s: ReplySuggestion) => {
    onSelect(s.text);
    setOpen(false);
    setSuggestions(null);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost" size="icon"
          disabled={disabled || !conversationId}
          className="h-10 w-10 text-[hsl(var(--muted-foreground))] hover:text-primary"
          aria-label="Sugerir resposta com IA"
          title="Sugerir resposta com IA"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[420px] p-0">
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2 bg-muted/30">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide">Sugestões IA</span>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={() => void generate()}
            disabled={smart.isPending}
            className="h-6 text-xs gap-1 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${smart.isPending ? 'animate-spin' : ''}`} />
            Gerar de novo
          </Button>
        </div>

        <div className="p-2 max-h-96 overflow-y-auto">
          {smart.isPending && !suggestions ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Lendo conversa e gerando sugestões...
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((s, i) => {
                const meta = TONE_META[s.tone] ?? TONE_META.objetiva;
                const Icon = meta.icon;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => apply(s)}
                    className="w-full text-left p-2.5 rounded-md border hover:border-primary/40 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`h-3 w-3 ${meta.color}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line group-hover:text-foreground">{s.text}</p>
                  </button>
                );
              })}
              <p className="text-[10px] text-muted-foreground px-1 pt-1">
                Click para preencher · Edite antes de enviar · IA sugere, você decide.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma sugestão gerada.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SmartReplyPopover;
