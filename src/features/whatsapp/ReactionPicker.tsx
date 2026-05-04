import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useReactToMessage } from '@/hooks/useReactToMessage';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  to: string;
  providerMessageId: string;
  conversationId?: string;
  className?: string;
}

const ReactionPicker = ({ to, providerMessageId, conversationId, className }: Props) => {
  const react = useReactToMessage();
  const [open, setOpen] = useState(false);

  const handleReact = async (emoji: string) => {
    setOpen(false);
    await react.mutateAsync({ to, messageId: providerMessageId, emoji, conversationId });
  };

  if (!providerMessageId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ${className ?? ''}`}
          aria-label="Reagir com emoji"
          title="Reagir"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-auto p-1.5 flex gap-1">
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => void handleReact(emoji)}
            disabled={react.isPending}
            className="text-xl hover:scale-125 transition-transform p-1 disabled:opacity-50"
            aria-label={`Reagir ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;
