import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, FileText, X } from 'lucide-react';
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
import { documentoFormSchema, type DocumentoFormData, TIPOS_DOCUMENTO } from '@/schemas/documentoSchema';

interface UploadDocumentoFormProps {
  onSubmit: (file: File, metadata: DocumentoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  processoId?: string;
}

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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const UploadDocumentoForm = ({ onSubmit, onCancel, loading, processoId }: UploadDocumentoFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues: {
      processo_id: processoId,
      tipo_documento: 'outro',
    },
  });

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
        <div className="space-y-1.5">
          <Label>Tipo de Documento *</Label>
          <Select
            value={watch('tipo_documento')}
            onValueChange={v => setValue('tipo_documento', v as DocumentoFormData['tipo_documento'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map(t => (
                <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo_documento && <p className="text-xs text-destructive">{errors.tipo_documento.message}</p>}
        </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          placeholder="Descreva o documento..."
          rows={2}
          {...register('descricao')}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loading || !selectedFile}>
          {isSubmitting || loading ? 'Enviando...' : 'Enviar Documento'}
        </Button>
      </div>
    </form>
  );
};

export default UploadDocumentoForm;
