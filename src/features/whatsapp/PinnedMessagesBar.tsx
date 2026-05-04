import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pin, ChevronDown, ChevronUp, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTogglePinMessage } from '@/hooks/useConversationNotes';
import { fmtMessageTime } from '@/utils/formatting';

interface PinnedMessage {
  id: string;
  content: string | null;
  message_type: string | null;
  sender: string;
  timestamp: string;
  pinned_at: string | null;
}

interface Props {
  conversationId: string;
}

const typeIcon = (t: string | null) => {
  if (t === 'image') return <ImageIcon className="h-3 w-3" />;
  if (t === 'audio') return <Mic className="h-3 w-3" />;
  if (t === 'document') return <FileText className="h-3 w-3" />;
  return null;
};

const PinnedMessagesBar = ({ conversationId }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const togglePin = useTogglePinMessage(conversationId);

  const { data: pinned = [] } = useQuery<PinnedMessage[]>({
    queryKey: ['whatsapp', 'pinned-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, content, message_type, sender, timestamp, pinned_at')
        .eq('conversation_id', conversationId)
        .eq('pinned', true)
        .order('pinned_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as PinnedMessage[];
    },
    staleTime: 30 * 1000,
  });

  if (pinned.length === 0) return null;

  const first = pinned[0];
  if (!first) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-1.5 flex items-center gap-2 text-left hover:bg-amber-500/10 transition-colors"
      >
        <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 shrink-0">
          {pinned.length} fixada{pinned.length === 1 ? '' : 's'}
        </span>
        {!expanded && (
          <span className="text-xs text-foreground/80 truncate flex-1 flex items-center gap-1">
            {typeIcon(first.message_type)}
            <span className="truncate">{first.content || `[${first.message_type ?? 'mídia'}]`}</span>
          </span>
        )}
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto shrink-0 text-amber-700" /> : <ChevronDown className="h-3 w-3 shrink-0 text-amber-700" />}
      </button>

      {expanded && (
        <div className="px-4 pb-2 space-y-1.5">
          {pinned.map((m) => (
            <div key={m.id} className="flex items-start gap-2 p-2 rounded-md bg-background/50 border border-amber-500/20 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {typeIcon(m.message_type)}
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {m.sender === 'lead' || m.sender === 'user' ? 'Cliente' : m.sender === 'ia' ? 'IA' : 'Você'} · {fmtMessageTime(m.timestamp)}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-line line-clamp-3">{m.content || `[${m.message_type ?? 'mídia'}]`}</p>
              </div>
              <button
                type="button"
                onClick={() => void togglePin.mutateAsync(m.id)}
                disabled={togglePin.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-amber-500/20 text-amber-700"
                title="Desafixar"
                aria-label="Desafixar"
              >
                <Pin className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PinnedMessagesBar;
