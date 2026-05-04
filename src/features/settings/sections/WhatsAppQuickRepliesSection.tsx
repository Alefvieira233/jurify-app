import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Zap, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useWhatsAppQuickReplies, type QuickReply } from '@/hooks/useWhatsAppQuickReplies';

interface FormState {
  id?: string;
  shortcut: string;
  content: string;
  description: string;
}

const EMPTY_FORM: FormState = { shortcut: '', content: '', description: '' };

const WhatsAppQuickRepliesSection = () => {
  const { items, isLoading, create, update, remove } = useWhatsAppQuickReplies();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuickReply | null>(null);

  const startCreate = () => setEditing({ ...EMPTY_FORM });
  const startEdit = (r: QuickReply) => setEditing({
    id: r.id, shortcut: r.shortcut, content: r.content, description: r.description ?? '',
  });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    if (editing.id) {
      await update.mutateAsync({
        id: editing.id,
        shortcut: editing.shortcut.trim(),
        content: editing.content,
        description: editing.description.trim() || null,
      });
    } else {
      await create.mutateAsync({
        shortcut: editing.shortcut.trim(),
        content: editing.content,
        description: editing.description.trim() || null,
      });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Respostas rápidas</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Atalhos que expandem em mensagens completas. Digite <code className="bg-muted px-1 py-0.5 rounded text-xs">/atalho</code> no chat WhatsApp e use <kbd>Tab</kbd> ou <kbd>Enter</kbd> para inserir.
          </p>
        </div>
        {!editing && (
          <Button onClick={startCreate} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        )}
      </div>

      {editing && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <h3 className="text-sm font-semibold mb-3">{editing.id ? 'Editar resposta rápida' : 'Nova resposta rápida'}</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="qr-shortcut" className="text-xs flex items-center gap-1">
                <Hash className="h-3 w-3" /> Atalho (sem barra, sem espaços)
              </Label>
              <Input
                id="qr-shortcut"
                value={editing.shortcut}
                onChange={(e) => setEditing(s => s ? { ...s, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) } : s)}
                placeholder="ex: horario, honorarios, instagram"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">2-30 letras/números/-/_, sem acentos. Ex: <code>/horario</code></p>
            </div>
            <div>
              <Label htmlFor="qr-content" className="text-xs">Conteúdo da mensagem</Label>
              <Textarea
                id="qr-content"
                value={editing.content}
                onChange={(e) => setEditing(s => s ? { ...s, content: e.target.value } : s)}
                placeholder="Atendemos de seg-sex, das 9h às 18h. Para urgências fora desse horário, ligue 11 99999-9999."
                rows={4}
                maxLength={4000}
              />
              <p className="text-[11px] text-muted-foreground mt-1">{editing.content.length}/4000 caracteres</p>
            </div>
            <div>
              <Label htmlFor="qr-desc" className="text-xs">Descrição curta (opcional)</Label>
              <Input
                id="qr-desc"
                value={editing.description}
                onChange={(e) => setEditing(s => s ? { ...s, description: e.target.value } : s)}
                placeholder="ex: Horário de atendimento"
                maxLength={80}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={cancel} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button
                onClick={() => void save()}
                size="sm"
                disabled={!editing.shortcut.trim() || !editing.content.trim() || create.isPending || update.isPending}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 && !editing ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Nenhuma resposta rápida criada ainda.</p>
            <p className="mt-1 text-xs">Crie atalhos como <code>/horario</code>, <code>/honorarios</code>, <code>/instagram</code> para responder mais rápido.</p>
          </Card>
        ) : (
          items.map(r => (
            <Card key={r.id} className="p-3 flex items-start gap-3 group hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <code className="text-sm font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">/{r.shortcut}</code>
                  {r.description && <span className="text-xs text-muted-foreground">— {r.description}</span>}
                  {r.used_count > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{r.used_count}× usado</span>}
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2">{r.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(r)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
        title={`Remover /${confirmDelete?.shortcut}?`}
        description="Esta ação não pode ser desfeita."
        destructive
        onConfirm={() => {
          if (confirmDelete) void remove.mutateAsync(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
};

export default WhatsAppQuickRepliesSection;
