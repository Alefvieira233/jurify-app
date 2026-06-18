import { useState, useMemo, useCallback } from 'react';
import {
  Search, FolderOpen, Download, Trash2, FileText, Eye,
  Folder, FolderPlus, ChevronRight, ChevronDown, MoreVertical,
  FolderInput, Edit3,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentosJuridicos } from '@/hooks/useDocumentosJuridicos';
import type { DocumentoWithSignedUrl } from '@/hooks/useDocumentosJuridicos';
import PaginationControls from '@/components/PaginationControls';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import UploadDocumentoForm from './components/UploadDocumentoForm';
import DocumentoViewer from './components/DocumentoViewer';
import { useDocumentoFolders, type FolderNode } from './hooks/useDocumentoFolders';
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

/* ─── Folder tree item ──────────────────────────────────────────────────── */

interface FolderTreeItemProps {
  node: FolderNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
  onCreateChild: (parentId: string) => void;
  canMutate: boolean;
  depth?: number;
}

const FolderTreeItem = ({
  node, selectedId, onSelect, onRename, onDelete, onCreateChild, canMutate, depth = 0,
}: FolderTreeItemProps) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors
          ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          className={`w-4 h-4 flex items-center justify-center ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {expanded
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <Folder className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {canMutate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Ações da pasta"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
                <FolderPlus className="w-3.5 h-3.5 mr-2" />
                Nova subpasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(node.id, node.name)}>
                <Edit3 className="w-3.5 h-3.5 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(node.id, node.name)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              canMutate={canMutate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main manager ──────────────────────────────────────────────────────── */

type Selection = string; // 'all' | 'unfiled' | <folder-uuid>

const DocumentosManager = () => {
  usePageTitle('Documentos Jurídicos');
  const { can } = useRBAC();
  const canCreate = can('documentos', 'create');
  const canDelete = can('documentos', 'delete');
  const canUpdate = can('documentos', 'update');

  // Folder navigation state
  const [selection, setSelection] = useState<Selection>('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterTipo, setFilterTipo] = useState('all');

  // Dialogs
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentoWithSignedUrl | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean; id: string; storagePath: string; nome: string;
  }>({ open: false, id: '', storagePath: '', nome: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Folder dialogs
  const [folderDialog, setFolderDialog] = useState<{
    open: boolean;
    mode: 'create' | 'rename';
    parentId: string | null;
    id?: string;
    initialName?: string;
  }>({ open: false, mode: 'create', parentId: null });
  const [folderNameInput, setFolderNameInput] = useState('');
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<{
    open: boolean; id: string; name: string;
  }>({ open: false, id: '', name: '' });

  // Pagination
  const [page, setPage] = useState(1);

  const {
    tree, folders, isLoading: foldersLoading,
    createFolder, renameFolder, deleteFolder, moveDocumento,
  } = useDocumentoFolders();

  const {
    documentos, totalCount, totalPages, hasNextPage, hasPrevPage,
    loading, error, isEmpty, fetchDocumentos,
    uploadDocumento, deleteDocumento,
  } = useDocumentosJuridicos({
    page,
    folderId: selection !== 'all' && selection !== 'unfiled' ? selection : undefined,
    unfiled: selection === 'unfiled',
  });

  const filteredDocumentos = useMemo(() =>
    documentos.filter((d) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q ||
        d.nome_original.toLowerCase().includes(q) ||
        d.descricao?.toLowerCase().includes(q);
      const matchTipo = !filterTipo || filterTipo === 'all' || d.tipo_documento === filterTipo;
      return matchSearch && matchTipo;
    }),
  [documentos, debouncedSearch, filterTipo]);

  const handleUpload = useCallback(
    async (file: File, metadata: DocumentoFormData): Promise<boolean> => {
      setUploadLoading(true);
      try {
        // Respect the currently selected folder — if viewing 'all' or 'unfiled'
        // the user can still pick a folder from the form (metadata.folder_id);
        // if neither is set we scope to current selection.
        const folderFromSelection =
          selection !== 'all' && selection !== 'unfiled' ? selection : null;
        const effective: DocumentoFormData = {
          ...metadata,
          folder_id: metadata.folder_id ?? folderFromSelection,
        };
        const ok = await uploadDocumento(file, effective);
        if (ok) setIsUploadOpen(false);
        return ok;
      } finally {
        setUploadLoading(false);
      }
    }, [selection, uploadDocumento],
  );

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

  /* ── Folder handlers ── */

  const openCreateFolder = (parentId: string | null) => {
    setFolderDialog({ open: true, mode: 'create', parentId });
    setFolderNameInput('');
  };
  const openRenameFolder = (id: string, currentName: string) => {
    setFolderDialog({ open: true, mode: 'rename', parentId: null, id, initialName: currentName });
    setFolderNameInput(currentName);
  };
  const submitFolderDialog = async () => {
    const name = folderNameInput.trim();
    if (!name) return;
    if (folderDialog.mode === 'create') {
      await createFolder(name, folderDialog.parentId);
    } else if (folderDialog.id) {
      await renameFolder(folderDialog.id, name);
    }
    setFolderDialog({ open: false, mode: 'create', parentId: null });
    setFolderNameInput('');
  };

  const onRequestDeleteFolder = (id: string, name: string) =>
    setConfirmDeleteFolder({ open: true, id, name });
  const doDeleteFolder = async () => {
    const ok = await deleteFolder(confirmDeleteFolder.id);
    if (ok && selection === confirmDeleteFolder.id) setSelection('all');
    setConfirmDeleteFolder({ open: false, id: '', name: '' });
  };

  /* ── UI sections ── */

  const Sidebar = (
    <aside className="w-60 border-r bg-muted/10 flex-shrink-0 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pastas
        </span>
        {canCreate && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Nova pasta"
            onClick={() => openCreateFolder(null)}
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <button
          type="button"
          onClick={() => setSelection('all')}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors
            ${selection === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Todos os documentos
        </button>
        <button
          type="button"
          onClick={() => setSelection('unfiled')}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors
            ${selection === 'unfiled' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Sem pasta
        </button>
        <div className="h-px bg-border/50 my-2" />
        {foldersLoading ? (
          <div className="space-y-1 px-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : tree.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-2 py-1">
            Nenhuma pasta criada.
          </p>
        ) : (
          tree.map((node) => (
            <FolderTreeItem
              key={node.id}
              node={node}
              selectedId={selection}
              onSelect={(id) => setSelection(id)}
              onRename={openRenameFolder}
              onDelete={onRequestDeleteFolder}
              onCreateChild={(parentId) => openCreateFolder(parentId)}
              canMutate={canCreate}
            />
          ))
        )}
      </div>
    </aside>
  );

  const currentFolderName =
    selection === 'all' ? 'Todos os documentos' :
    selection === 'unfiled' ? 'Sem pasta' :
    folders.find((f) => f.id === selection)?.name ?? 'Pasta';

  const renderBody = () => {
    if (loading) {
      return (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-8 w-full" /></CardContent></Card>
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Erro ao carregar documentos" message={error} onRetry={fetchDocumentos} />;
    }
    if (isEmpty) {
      return (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum documento nesta pasta"
          description={selection === 'all'
            ? 'Faça upload do primeiro documento para começar.'
            : 'Esta pasta está vazia.'}
          action={canCreate ? {
            label: 'Upload Documento',
            onClick: () => setIsUploadOpen(true),
          } : undefined}
        />
      );
    }
    if (filteredDocumentos.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum documento encontrado para os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-3">
        {filteredDocumentos.map((doc) => (
          <Card key={doc.id} className="hover:border-primary/50 transition-colors group">
            <CardContent className="p-5">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.nome_original}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.tamanho_bytes)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {doc.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{doc.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {doc.signedUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Abrir pré-visualização"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {doc.signedUrl && (
                    <Button size="sm" variant="ghost" title="Download" asChild>
                      <a href={doc.signedUrl} download={doc.nome_original} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {canUpdate && folders.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" title="Mover">
                          <FolderInput className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-[11px]">Mover para…</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => void moveDocumento(doc.id, null)}>
                          <FileText className="w-3.5 h-3.5 mr-2" />
                          Sem pasta
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Folder className="w-3.5 h-3.5 mr-2" />
                            Escolher pasta
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                              {folders.map((f) => (
                                <DropdownMenuItem
                                  key={f.id}
                                  onClick={() => void moveDocumento(doc.id, f.id)}
                                  disabled={doc.folder_id === f.id}
                                >
                                  <Folder className="w-3.5 h-3.5 mr-2" />
                                  {f.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({
                        open: true,
                        id: doc.id,
                        storagePath: doc.storage_path,
                        nome: doc.nome_original,
                      })}
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
    );
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h,4rem))]">
      {Sidebar}

      <section className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl">Documentos Jurídicos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentFolderName} · {filteredDocumentos.length} documento{filteredDocumentos.length !== 1 ? 's' : ''}
                </p>
              </div>
              {canCreate && (
                <Button onClick={() => setIsUploadOpen(true)} size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Documento
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  aria-label="Buscar por nome ou descrição…"
                  placeholder="Buscar por nome ou descrição…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(TIPO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {renderBody()}

        {!loading && !error && totalCount > 0 && (
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            label="documentos"
          />
        )}
      </section>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
          <UploadDocumentoForm
            onSubmit={handleUpload}
            onCancel={() => setIsUploadOpen(false)}
            loading={uploadLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <DocumentoViewer
        documento={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Delete doc */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(v) => !deleteLoading && setConfirmDelete({ ...confirmDelete, open: v })}
        title="Excluir Documento"
        description={`Tem certeza que deseja excluir "${confirmDelete.nome}"? O arquivo será removido permanentemente do storage.`}
        onConfirm={() => { void handleDelete(); }}
        loading={deleteLoading}
        destructive
      />

      {/* Folder create / rename dialog */}
      <Dialog
        open={folderDialog.open}
        onOpenChange={(v) => { if (!v) setFolderDialog({ open: false, mode: 'create', parentId: null }); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {folderDialog.mode === 'create' ? 'Nova pasta' : 'Renomear pasta'}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={folderNameInput}
            onChange={(e) => setFolderNameInput(e.target.value)}
            placeholder="Nome da pasta"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void submitFolderDialog(); }
            }}
            maxLength={120}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFolderDialog({ open: false, mode: 'create', parentId: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => { void submitFolderDialog(); }}
              disabled={!folderNameInput.trim()}
            >
              {folderDialog.mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete folder */}
      <ConfirmDialog
        open={confirmDeleteFolder.open}
        onOpenChange={(v) => setConfirmDeleteFolder({ ...confirmDeleteFolder, open: v })}
        title="Excluir Pasta"
        description={`Tem certeza que deseja excluir a pasta "${confirmDeleteFolder.name}"? As subpastas também serão excluídas. Os documentos serão movidos para "Sem pasta".`}
        onConfirm={() => { void doDeleteFolder(); }}
        destructive
      />
    </div>
  );
};

export default DocumentosManager;
