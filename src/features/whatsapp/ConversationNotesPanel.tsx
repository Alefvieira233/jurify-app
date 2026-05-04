import { useState } from 'react';
import { Pin, PinOff, Trash2, Plus, StickyNote, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fmtMessageTime } from '@/utils/formatting';
import { useConversationNotes, type ConversationNote } from '@/hooks/useConversationNotes';

interface Props {
  conversationId: string;
  className?: string;
}

const ConversationNotesPanel = ({ conversationId, className }: Props) => {
  const { items, pinned, others, isLoading, create, update, remove } = useConversationNotes(conversationId);
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState('');

  const submit = async () => {
    if (!content.trim()) return;
    await create.mutateAsync(content.trim());
    setContent('');
    setComposing(false);
  };

  const renderNote = (n: ConversationNote) => (
    <Card key={n.id} className={`p-2.5 group ${n.pinned ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
      <div className="flex items-start gap-2">
        {n.pinned && <Pin className="h-3 w-3 text-amber-600 mt-1 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-line break-words">{n.content}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{fmtMessageTime(n.created_at)}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => void update.mutateAsync({ id: n.id, pinned: !n.pinned })}
            title={n.pinned ? 'Desafixar' : 'Fixar no topo'}
          >
            {n.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => void remove.mutateAsync(n.id)}
            title="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold uppercase tracking-wide">Notas internas</span>
          <span className="text-[10px] text-muted-foreground">({items.length})</span>
        </div>
        {!composing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setComposing(true)} title="Nova nota">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {composing && (
            <Card className="p-2.5 border-primary/30 bg-primary/5">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Anotação privada (não vai pro cliente)..."
                rows={3}
                maxLength={2000}
                autoFocus
                className="text-sm"
              />
              <div className="flex justify-end gap-1 mt-2">
                <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setContent(''); }} className="h-7 gap-1 text-xs">
                  <X className="h-3 w-3" /> Cancelar
                </Button>
                <Button size="sm" onClick={() => void submit()} disabled={!content.trim() || create.isPending} className="h-7 gap-1 text-xs">
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              </div>
            </Card>
          )}

          {isLoading ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Carregando...</p>
          ) : items.length === 0 && !composing ? (
            <div className="text-center py-8 px-3 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhuma nota ainda.</p>
              <p className="text-[10px] mt-1">Anote info importante (CPF, processo, audiência) que só você e a equipe veem.</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <p className="text-[10px] uppercase font-semibold tracking-wide text-amber-700 dark:text-amber-400 px-1 pt-1">Fixadas</p>
                  {pinned.map(renderNote)}
                </>
              )}
              {others.length > 0 && pinned.length > 0 && (
                <p className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground px-1 pt-2">Outras</p>
              )}
              {others.map(renderNote)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationNotesPanel;
