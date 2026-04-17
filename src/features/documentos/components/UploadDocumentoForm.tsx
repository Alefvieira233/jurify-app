import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, FileText, X } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { createLogger } from '@/lib/logger';

const log = createLogger('UploadDocumentoForm');
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { documentoFormSchema, type DocumentoFormData, TIPOS_DOCUMENTO, TIPO_LABELS } from '@/schemas/documentoSchema';
import { useDocumentoFolders } from '../hooks/useDocumentoFolders';

interface UploadDocumentoFormProps {
  onSubmit: (file: File, metadata: DocumentoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  processoId?: string;
  /** When provided, pre-selects this folder as the upload target. */
  defaultFolderId?: string | null;
}

const UNFILED = '__unfiled__';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const UploadDocumentoForm = ({ onSubmit, onCancel, loading, processoId, defaultFolderId }: UploadDocumentoFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { folders } = useDocumentoFolders();

  const isNative = Capacitor.isNativePlatform();

  const handleCameraCapture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });

      if (!image.webPath) return;

      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const fileName = `documento_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      handleFileSelect(file);
    } catch (err) {
      log.warn('camera capture cancelled or failed', { error: String(err) });
    }
  };

  const form = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues: {
      processo_id: processoId,
      folder_id: defaultFolderId ?? null,
      tipo_documento: 'outro',
    },
  });

  const {
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = form;

  const handleFileSelect = (file: File) => {
    setFileError('');
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Arquivo muito grande. Máximo: 20 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFormSubmit = async (data: DocumentoFormData) => {
    if (!selectedFile) {
      setFileError('Selecione um arquivo para enviar.');
      return;
    }
    await onSubmit(selectedFile, data);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void handleSubmit(handleFormSubmit)(e); }} className="space-y-4">
        {/* File dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo ou{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  clique para selecionar
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG — máx. 20 MB</p>
              {isNative && (
                <button
                  type="button"
                  className="text-primary underline text-sm mt-2"
                  onClick={() => { void handleCameraCapture(); }}
                >
                  ou tirar foto com a câmera
                </button>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Selecionar arquivo para upload"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.csv"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_documento"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tipo de Documento *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => (
                      <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <Label htmlFor="tags_input">Tags (separadas por vírgula)</Label>
            <Input
              id="tags_input"
              placeholder="Ex: urgente, original, 2024"
              onChange={e => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                setValue('tags', tags);
              }}
            />
          </div>
        </div>

        {folders.length > 0 && (
          <FormField
            control={form.control}
            name="folder_id"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Pasta</FormLabel>
                <Select
                  value={field.value ?? UNFILED}
                  onValueChange={(v) => field.onChange(v === UNFILED ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem pasta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UNFILED}>Sem pasta</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o documento..."
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || loading || !selectedFile}>
            {isSubmitting || loading ? 'Enviando...' : 'Enviar Documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UploadDocumentoForm;
