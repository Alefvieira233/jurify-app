import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Brain,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAgentTraining } from '@/hooks/useAgentTraining';
import type { TrainingDocument } from '@/hooks/useAgentTraining';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusConfig(status: TrainingDocument['status']) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    uploading: {
      label: 'Enviando...',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    extracting: {
      label: 'Extraindo texto...',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    embedding: {
      label: 'Gerando embeddings...',
      icon: <Brain className="h-3 w-3 animate-pulse" />,
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    ready: {
      label: 'Pronto',
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    error: {
      label: 'Erro',
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 border-red-200',
    },
  };
  return map[status] || map.error!;
}

const KnowledgeBaseSection = () => {
  const {
    documents,
    loading,
    uploading,
    stats,
    uploadDocument,
    deleteDocument,
    retryDocument,
  } = useAgentTraining();

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });
  const [retrying, setRetrying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Upload each file sequentially
    const uploadAll = async () => {
      for (let i = 0; i < files.length; i++) {
        await uploadDocument(files[i]!);
      }
    };
    void uploadAll();

    // Reset input
    e.target.value = '';
  };

  const handleRetry = async (docId: string) => {
    setRetrying(docId);
    await retryDocument(docId);
    setRetrying(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Documentos</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Prontos</p>
              <p className="text-xl font-bold">{stats.ready}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Segmentos</p>
              <p className="text-xl font-bold">{stats.totalChunks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {stats.processing > 0 ? (
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
            ) : stats.error > 0 ? (
              <AlertCircle className="h-8 w-8 text-red-400" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            )}
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Status</p>
              <p className="text-sm font-bold">
                {stats.processing > 0
                  ? `${stats.processing} processando`
                  : stats.error > 0
                    ? `${stats.error} com erro`
                    : 'Tudo pronto'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--accent))] transition-colors">
        <CardContent className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            multiple
            className="hidden"
            onChange={handleFileChange}
            aria-label="Selecionar documentos para treinamento"
          />
          <Upload className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
            Enviar documentos para treinamento
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
            PDF, DOCX, TXT ou CSV (max. 10MB). A IA usará esses documentos para responder com conhecimento do seu escritório.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Selecionar Arquivos</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Document List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
              Nenhum documento de treinamento
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Envie documentos como contratos-modelo, manuais do escritório, jurisprudência, ou FAQs para que a IA possa aprender e personalizar suas respostas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const statusConfig = getStatusConfig(doc.status);
            const isProcessing = ['uploading', 'extracting', 'embedding'].includes(doc.status);

            return (
              <Card key={doc.id} className={doc.status === 'error' ? 'border-red-200' : ''}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* File icon */}
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    doc.file_type === 'pdf' ? 'bg-red-100 text-red-600' :
                    doc.file_type === 'docx' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <FileText className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                        {doc.file_name}
                      </p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${statusConfig.className}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatFileSize(doc.file_size_bytes)}
                      </span>
                      {doc.chunks_count > 0 && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {doc.chunks_count} segmentos
                        </span>
                      )}
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {doc.error_message && (
                      <p className="text-xs text-red-500 mt-1 truncate">{doc.error_message}</p>
                    )}
                    {doc.extracted_text_preview && doc.status === 'ready' && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">
                        {doc.extracted_text_preview.substring(0, 120)}...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleRetry(doc.id)}
                        disabled={retrying === doc.id}
                        aria-label="Reprocessar documento"
                      >
                        {retrying === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500"
                      onClick={() => setConfirmDelete({ open: true, id: doc.id, name: doc.file_name })}
                      disabled={isProcessing}
                      aria-label="Remover documento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => setConfirmDelete(prev => ({ ...prev, open: v }))}
        title="Remover documento?"
        description={`"${confirmDelete.name}" será removido da base de conhecimento. Os embeddings associados também serão apagados. A IA não terá mais acesso a esse conhecimento.`}
        onConfirm={() => {
          void deleteDocument(confirmDelete.id);
          setConfirmDelete({ open: false, id: '', name: '' });
        }}
        destructive
      />
    </div>
  );
};

export default KnowledgeBaseSection;
