import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLeadNotas } from '@/hooks/useLeadNotas';
import { useAuth } from '@/contexts/AuthContext';
import { Pin, Trash2, Loader2 } from 'lucide-react';

interface LeadDrawerNotasProps {
  leadId: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d atrás`;
  const diffM = Math.floor(diffD / 30);
  return `${diffM} mês${diffM > 1 ? 'es' : ''} atrás`;
}

export default function LeadDrawerNotas({ leadId }: LeadDrawerNotasProps) {
  const { user } = useAuth();
  const { notas, isLoading, createNota, deleteNota } = useLeadNotas(leadId);
  const [conteudo, setConteudo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddNota = async () => {
    const text = conteudo.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await createNota({ conteudo: text });
      setConteudo('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNota(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={`skeleton-${i}`} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva uma nota..."
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <Button
          size="sm"
          onClick={() => { void handleAddNota(); }}
          disabled={submitting || !conteudo.trim()}
        >
          {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Adicionar nota
        </Button>
      </div>

      {/* Notes list */}
      {notas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma nota adicionada
        </p>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <div
              key={nota.id}
              className="rounded-md border p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{nota.autor_nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(nota.created_at)}
                  </span>
                  {nota.fixada && (
                    <Pin className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                {user?.id === nota.autor_id && (
                  <button
                    type="button"
                    onClick={() => { void handleDelete(nota.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Excluir nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{nota.conteudo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
