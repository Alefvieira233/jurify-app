/**
 * DocumentoViewer — Fullscreen dialog for previewing/downloading documents.
 *
 * Behavior per mime type:
 *   - PDF:        <iframe> at 70vh (native browser PDF viewer)
 *   - Image:      <img> with max-h-[70vh] object-contain
 *   - Office:     No inline preview possible without a converter service →
 *                 shows a prompt to open in a new tab (browser will download
 *                 or delegate to the installed handler).
 *   - Unknown:    same as Office — download / open-in-new-tab.
 *
 * The signed URL is expected to already be on the `documento` (see
 * `useDocumentosJuridicos`); this component does NOT fetch anything.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import type { DocumentoWithSignedUrl } from '@/hooks/useDocumentosJuridicos';

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

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface DocumentoViewerProps {
  documento: DocumentoWithSignedUrl | null;
  open: boolean;
  onClose: () => void;
}

const isPdf = (mime: string | null | undefined, name?: string): boolean =>
  mime === 'application/pdf' || !!name?.toLowerCase().endsWith('.pdf');

const isImage = (mime: string | null | undefined): boolean =>
  !!mime && mime.startsWith('image/');

const DocumentoViewer = ({ documento, open, onClose }: DocumentoViewerProps) => {
  if (!documento) return null;

  const url = documento.signedUrl;
  const mime = documento.tipo_mime;
  const name = documento.nome_original;
  const pdf = isPdf(mime, name);
  const image = isImage(mime);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" className="text-[11px]">
            {TIPO_LABELS[documento.tipo_documento] ?? documento.tipo_documento}
          </Badge>
          <span>{formatBytes(documento.tamanho_bytes)}</span>
          {mime && <span className="truncate max-w-[240px]">{mime}</span>}
        </div>

        <div className="flex-1 min-h-0 bg-muted/30 rounded-md overflow-hidden">
          {!url ? (
            <div className="h-[70vh] flex items-center justify-center text-sm text-muted-foreground">
              URL de pré-visualização indisponível.
            </div>
          ) : pdf ? (
            <iframe
              title={`Pré-visualização de ${name}`}
              src={url}
              className="w-full h-[70vh] border-0"
            />
          ) : image ? (
            <div className="h-[70vh] w-full flex items-center justify-center p-2">
              <img
                src={url}
                alt={name}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          ) : (
            <div className="h-[70vh] flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-14 h-14 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Pré-visualização não suportada</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Documentos Word, Excel e outros formatos precisam ser abertos em um
                aplicativo externo ou baixados.
              </p>
              <Button asChild variant="default" size="sm">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {url && (
            <Button asChild variant="outline" size="sm">
              <a href={url} download={name} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentoViewer;
