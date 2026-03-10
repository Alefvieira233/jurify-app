import { useState, useMemo } from 'react';
import { Search, FolderOpen, AlertCircle, RefreshCw, Download, Trash2, FileText, Eye } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDocumentosJuridicos } from '@/hooks/useDocumentosJuridicos';
import type { DocumentoWithSignedUrl } from '@/hooks/useDocumentosJuridicos';
import PaginationControls from '@/components/PaginationControls';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import UploadDocumentoForm from './components/UploadDocumentoForm';
import type { DocumentoFormData } from '@/schemas/documentoSchema';

const log = createLogger('DocumentosManager');

const TIPO_LABELS: Record<string, string> = {
  peticao: 'Petição',
  contrato: 'Contrato',
  procuracao: 'Procuração',
  comprovante: 'Comprovante',
  sentenca: 'Sentença',
  recurso: 'Recurso',
  acordo: 'Acordo',
  laudo: 'Laudo',
  certidao: 'Certidão',
  outro: 'Outro',
};

const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const DocumentosManager = () => {
  usePageTitle('Documentos Jurídicos');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterTipo, setFilterTipo] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentoWithSignedUrl | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; storagePath: string; nome: string }>({
    open: false, id: '', storagePath: '', nome: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage] = useState(1);

  const { documentos, totalCount, totalPages, hasNextPage, hasPrevPage, loading, error, isEmpty, fetchDocumentos, uploadDocumento, deleteDocumento } = useDocumentosJuridicos({ page });
  const { can } = useRBAC();

  const filteredDocumentos = useMemo(() => documentos.filter(d => {
    const matchSearch = !debouncedSearch ||
      d.nome_original.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      d.descricao?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchTipo = filterTipo === '' || d.tipo_documento === filterTipo;
    return matchSearch && matchTipo;
  }), [documentos, debouncedSearch, filterTipo]);

  const handleUpload = async (file: File, metadata: DocumentoFormData): Promise<boolean> => {
    setUploadLoading(true);
    try {
      const ok = await uploadDocumento(file, metadata);
      if (ok) setIsUploadOpen(false);
      return ok;
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteDocumento(confirmDelete.id, confirmDelete.storagePath);
    } catch (err: unknown) {
      log.error('Erro ao excluir documento', err);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: '', storagePath: '', nome: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card><CardHeader><CardTitle className="text-2xl">Documentos Jurídicos</CardTitle></CardHeader></Card>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-6 w-64" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Erro ao carregar documentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDocumentos} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderOpen}
          title="Nenhum Documento"
          description="Não há documentos jurídicos. Faça upload do primeiro documento para começar."
          action={can('documentos', 'create') ? {
            label: 'Upload Documento',
            onClick: () => setIsUploadOpen(true),
          } : undefined}
        />
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
            <UploadDocumentoForm onSubmit={handleUpload} onCancel={() => setIsUploadOpen(false)} loading={uploadLoading} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Documentos Jurídicos</CardTitle>
              <p className="text-muted-foreground">{filteredDocumentos.length} documento{filteredDocumentos.length !== 1 ? 's' : ''}</p>
            </div>
            {can('documentos', 'create') && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Upload Documento
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3">
        {filteredDocumentos.map(doc => (
          <Card key={doc.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.nome_original}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.tamanho_bytes)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {doc.descricao && <p className="text-xs text-muted-foreground mt-1 truncate">{doc.descricao}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.signedUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Ver / Baixar"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {doc.signedUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Download"
                      asChild
                    >
                      <a href={doc.signedUrl} download={doc.nome_original} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {can('documentos', 'delete') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({ open: true, id: doc.id, storagePath: doc.storage_path, nome: doc.nome_original })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => p + 1)}
        label="documentos"
      />

      {filteredDocumentos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum documento encontrado para os filtros aplicados.</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
          <UploadDocumentoForm onSubmit={handleUpload} onCancel={() => setIsUploadOpen(false)} loading={uploadLoading} />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={open => !open && setPreviewDoc(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.nome_original}</DialogTitle>
          </DialogHeader>
          {previewDoc?.signedUrl && (
            <div className="space-y-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{TIPO_LABELS[previewDoc.tipo_documento]}</Badge>
                <span>{formatBytes(previewDoc.tamanho_bytes)}</span>
                <span>{previewDoc.tipo_mime}</span>
              </div>
              {previewDoc.tipo_mime?.startsWith('image/') ? (
                <img src={previewDoc.signedUrl} alt={previewDoc.nome_original} className="max-w-full rounded" />
              ) : (
                <div className="p-4 bg-muted/50 rounded text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Preview não disponível para este tipo de arquivo.</p>
                  <Button asChild>
                    <a href={previewDoc.signedUrl} download={previewDoc.nome_original} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Arquivo
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={v => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Documento"
        description={`Tem certeza que deseja excluir "${confirmDelete.nome}"? O arquivo será removido permanentemente do storage.`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default DocumentosManager;
