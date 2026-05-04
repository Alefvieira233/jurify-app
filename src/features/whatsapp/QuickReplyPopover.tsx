import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { useWhatsAppQuickReplies, type QuickReply } from '@/hooks/useWhatsAppQuickReplies';

interface QuickReplyPopoverProps {
  /** Texto digitado no input (com / inicial) */
  query: string;
  /** Posicionamento — em cima do input */
  visible: boolean;
  onSelect: (reply: QuickReply) => void;
  onClose: () => void;
}

const QuickReplyPopover = ({ query, visible, onSelect, onClose }: QuickReplyPopoverProps) => {
  const { items } = useWhatsAppQuickReplies();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo<QuickReply[]>(() => {
    const q = query.replace(/^\//, '').toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter(r => r.shortcut.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, items]);

  useEffect(() => { setSelectedIndex(0); }, [query, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const choice = filtered[selectedIndex];
        if (choice) {
          e.preventDefault();
          onSelect(choice);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 max-w-3xl mx-auto px-4"
    >
      <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/30 flex items-center gap-1.5">
          <Zap className="h-3 w-3" /> Respostas rápidas — ↑↓ navega · Tab/Enter aplica · Esc fecha
        </div>
        {filtered.map((reply, i) => (
          <button
            type="button"
            key={reply.id}
            onClick={() => onSelect(reply)}
            onMouseEnter={() => setSelectedIndex(i)}
            className={`w-full text-left px-3 py-2 transition-colors flex flex-col gap-0.5 ${i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-primary font-semibold">/{reply.shortcut}</span>
              {reply.description && (
                <span className="text-xs text-muted-foreground">— {reply.description}</span>
              )}
              {reply.used_count > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground">{reply.used_count}× usado</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{reply.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickReplyPopover;
